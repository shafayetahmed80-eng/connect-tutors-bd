#!/usr/bin/env bash
# One-command update for the cPanel deployment.
#
#   bash ~/connecttutorsbd_app/update.sh              (normal: download the site GitHub built)
#   bash ~/connecttutorsbd_app/update.sh --build-here (emergency: build on this server)
#   bash ~/connecttutorsbd_app/update.sh --rollback   (go back to the site before the last update)
#
# The host allows 1 GB of memory and building the site can need more, so the
# normal path never builds here: GitHub builds every merge to main and keeps the
# result as the "dist-latest" release. This script downloads that, installs
# packages, applies database migrations, swaps the new site in and restarts.
# Before an update that changes the database it saves a copy of the database
# (scripts/backup-database.sh); only if that cannot be done does it ask whether
# you downloaded a backup from cPanel instead.
# The running site is only replaced once everything before it has worked.
# --rollback puts the previous site (kept in dist-old/) back, with the code folder at
# the same version, and leaves the database alone; it says whether the update it undoes
# had changed the database. Running it again undoes the rollback.
# scripts/restore-database.sh puts the database back from a saved copy.
# Messages are English on purpose: the cPanel terminal cannot draw Bengali letters.
set -euo pipefail

MODE="prebuilt"
case "${1:-}" in
  "") ;;
  --build-here) MODE="build-here" ;;
  --rollback) MODE="rollback" ;;
  *) echo "Unknown option: $1 (only --build-here or --rollback is allowed)" >&2; exit 1 ;;
esac

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="$(basename "$APP_DIR")"
cd "$APP_DIR"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\n[STOPPED] %s\n' "$*" >&2; exit 1; }

# Asks the site (Passenger) to restart, then waits for /healthz to answer. Returns 0 when it does.
restart_and_check() {
  say "Restarting the site"
  mkdir -p tmp
  touch tmp/restart.txt
  SITE="${PUBLIC_SITE_URL:-https://connecttutorsbd.com}"
  say "Checking that the site answers"
  # HEALTH_PAUSE (seconds) replaces both waits; the tests set it so they do not sit through them.
  sleep "${HEALTH_PAUSE:-10}"
  for TRY in 1 2 3 4 5; do
    RESULT="$(curl -s -m 20 "$SITE/healthz" || true)"
    case "$RESULT" in
      *'"ok"'*)
        printf '\n%s/healthz says: %s\n' "$SITE" "$RESULT"
        return 0
        ;;
    esac
    sleep "${HEALTH_PAUSE:-6}"
  done
  printf '\n%s/healthz is not answering correctly.\n' "$SITE"
  return 1
}

if [ "$MODE" = "rollback" ]; then
  [ -f dist/index.js ] && [ -f dist-old/index.js ] || die "There is no earlier site to go back to (dist-old/ is missing or empty). Nothing was changed."
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    die "Code files on the server were edited by hand, so going back is not safe. Run 'git status' and send me the result. Nothing was changed."
  fi
  # dist/.commit says which commit a site was built from; a site older than that marker has none.
  NOW_SHA=""; BACK_SHA=""
  if [ -f dist/.commit ]; then NOW_SHA="$(tr -d '[:space:]' < dist/.commit)"; fi
  if [ -f dist-old/.commit ]; then BACK_SHA="$(tr -d '[:space:]' < dist-old/.commit)"; fi
  KNOWN=0
  if [ -n "$NOW_SHA" ] && [ -n "$BACK_SHA" ] && git cat-file -e "$NOW_SHA^{commit}" 2>/dev/null && git cat-file -e "$BACK_SHA^{commit}" 2>/dev/null; then KNOWN=1; fi

  say "Going back to the previous site"
  if [ "$KNOWN" = "1" ]; then
    echo "Leaving: $(git --no-pager log -1 --format='%h %s' "$NOW_SHA")"
    echo "Back to: $(git --no-pager log -1 --format='%h %s' "$BACK_SHA")"
  fi
  # The two sites trade places, so nothing is thrown away and running this again undoes it.
  rm -rf dist-swap
  mv dist dist-swap
  mv dist-old dist
  mv dist-swap dist-old
  # The code folder goes with it: database changes (restore-database.sh, the next update) are read from it.
  if [ "$KNOWN" = "1" ]; then git reset --hard --quiet "$BACK_SHA"; fi
  if [ -f .env ]; then
    set -a
    # eval, not "source <(...)": the cPanel shell has no /dev/fd, so process substitution fails there.
    eval "$(tr -d '\r' < .env)"
    set +a
  fi
  RESTARTED=0
  if restart_and_check; then RESTARTED=1; fi

  say "The database"
  echo "The database was NOT touched. Everyone's data is as it was."
  FORWARD=0
  if [ "$KNOWN" != "1" ]; then
    echo "I cannot tell whether the update you went back from changed the database."
    printf '\nDo not run update.sh again until a fix has been merged: it would install the same update again.\n'
  elif ! git merge-base --is-ancestor "$BACK_SHA" "$NOW_SHA" 2>/dev/null; then
    FORWARD=1
    echo "This brought the newer site back; the database already has its changes."
  else
    CHANGES="$(git diff --name-only "$BACK_SHA" "$NOW_SHA" -- 'drizzle/*.sql' | wc -l | tr -d ' ')"
    if [ "$CHANGES" -gt 0 ]; then
      echo "The update you went back from changed the database ($CHANGES step(s)); those changes are still in it."
      echo "The older site normally still works with them. If something looks wrong, tell me before doing anything else."
      SAVED="$(ls -1 "${BACKUP_DIR:-$HOME/db-backups}"/connect-tutors-*-before-"${NOW_SHA:0:7}".sql.gz 2>/dev/null | sort | tail -n 1 || true)"
      if [ -n "$SAVED" ]; then
        echo "The copy taken just before that update: $SAVED"
        echo "To put the database back as that copy had it too, run: bash scripts/restore-database.sh"
      fi
    else
      echo "The update you went back from did not change the database."
    fi
    if ! git diff --quiet "$BACK_SHA" "$NOW_SHA" -- pnpm-lock.yaml; then
      echo "That update also changed the installed packages. The older site is running with the newer packages; tell me if it does not behave."
    fi
    printf '\nDo not run update.sh again until a fix has been merged: it would install the same update again.\n'
  fi
  if [ "$FORWARD" = "0" ]; then echo "To undo this rollback and return to the newer site, run this same command once more."; fi
  if [ "$RESTARTED" = "1" ]; then printf '\nRollback finished.\n'; exit 0; fi
  echo "The previous site is in place, but it did not answer. Press Restart in cPanel > Setup Node.js App and open the site again."
  exit 1
fi

# Node and pnpm live in cPanel's per-app environment; enter it if we are not in it already.
if ! command -v pnpm >/dev/null 2>&1; then
  ACTIVATE="$(ls -d "$HOME"/nodevenv/"$APP_NAME"/*/bin/activate 2>/dev/null | sort -V | tail -n 1 || true)"
  [ -n "$ACTIVATE" ] || die "pnpm not found. Run the 'source .../activate' command shown at the top of cPanel > Setup Node.js App first."
  set +u
  # shellcheck disable=SC1090
  source "$ACTIVATE"
  set -u
  cd "$APP_DIR"
fi
command -v pnpm >/dev/null 2>&1 || die "pnpm not found. Run: npm install -g pnpm@10.4.1"
[ -f .env ] || die ".env is missing. See step 6 of the guide."

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  die "Code files on the server were edited by hand, so updating is not safe. Run 'git status' and send me the result."
fi

say "Checking for new code"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch --quiet origin
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"
# dist/.commit says which commit the site now running was built from. Going by it, not only
# by the downloaded code, means an update that stopped half-way (code downloaded, site not yet
# swapped in) is finished by running this again instead of being skipped as "nothing new".
LIVE_SHA=""
if [ -f dist/.commit ]; then LIVE_SHA="$(tr -d '[:space:]' < dist/.commit)"; fi
SINCE="$LOCAL"
if [ -n "$LIVE_SHA" ] && git cat-file -e "$LIVE_SHA^{commit}" 2>/dev/null; then SINCE="$LIVE_SHA"; fi
# A site downloaded but never swapped in (no marker yet, dist-next left behind) is unfinished work.
HALF_DONE=0
if [ -z "$LIVE_SHA" ] && [ -f dist-next/index.js ]; then HALF_DONE=1; fi
if [ "$SINCE" = "$REMOTE" ] && [ "$HALF_DONE" = "0" ]; then
  echo "Nothing new. The site is already up to date."
  exit 0
fi
git --no-pager log --oneline "$SINCE..$REMOTE"

NEW_MIGRATIONS="$(git diff --name-only "$SINCE" "$REMOTE" -- 'drizzle/*.sql' | wc -l | tr -d ' ')"
if [ "$NEW_MIGRATIONS" -gt 0 ]; then
  printf '\nThis update changes the database (%s new step(s)).\n' "$NEW_MIGRATIONS"
  say "Saving a copy of the database first"
  BACKUP_OK=0
  if [ -f scripts/backup-database.sh ]; then
    if BACKUP_OUTPUT="$(bash scripts/backup-database.sh "before-${REMOTE:0:7}" 2>&1)"; then
      BACKUP_OK=1
    fi
    printf '%s\n' "$BACKUP_OUTPUT"
  else
    echo "The backup tool (scripts/backup-database.sh) is missing on this server."
  fi
  if [ "$BACKUP_OK" != "1" ]; then
    printf '\nThe automatic copy was not made, so a backup from cPanel is needed instead.\n'
    printf 'Did you download a database backup from cPanel > Backup? If yes, type yes and press Enter: '
    read -r ANSWER
    [ "$ANSWER" = "yes" ] || die "Take the backup first, then run this again. Nothing was changed."
  fi
fi

rm -rf dist-next
if [ "$MODE" = "prebuilt" ]; then
  say "Downloading the site GitHub built"
  REPO_URL="$(git remote get-url origin | sed -E 's#^git@github.com:#https://github.com/#; s#\.git$##')"
  BASE="${DIST_BASE_URL:-$REPO_URL/releases/download/dist-latest}"
  BUILT_SHA="$(curl -fsSL -m 60 "$BASE/dist-sha.txt" 2>/dev/null | tr -d '[:space:]' || true)"
  if [ "$BUILT_SHA" != "$REMOTE" ]; then
    die "GitHub has not finished building this version yet (it takes about 3-5 minutes after a merge). Wait a few minutes and run this again. Nothing was changed."
  fi
  ARCHIVE="$(mktemp)"
  curl -fsSL -m 300 -o "$ARCHIVE" "$BASE/dist.tar.gz" || { rm -f "$ARCHIVE"; die "The download failed. Run this again. Nothing was changed."; }
  mkdir dist-next
  tar -xzf "$ARCHIVE" -C dist-next --strip-components=1 || { rm -f "$ARCHIVE"; rm -rf dist-next; die "The download is damaged. Run this again. Nothing was changed."; }
  rm -f "$ARCHIVE"
  if [ ! -f dist-next/index.js ] || [ ! -f dist-next/public/index.html ]; then
    rm -rf dist-next
    die "The download is incomplete. Run this again. Nothing was changed."
  fi
fi

say "Downloading the new code"
git merge --ff-only --quiet "origin/$BRANCH"

say "Installing packages (retries by itself if the host runs out of memory)"
ATTEMPT=1
until pnpm install --frozen-lockfile --network-concurrency=1 --child-concurrency=1; do
  [ "$ATTEMPT" -lt 8 ] || die "pnpm install keeps stopping. Send me the last lines. The site is still running the old version."
  ATTEMPT=$((ATTEMPT + 1))
  echo "--- trying again ($ATTEMPT/8) ---"
  sleep 2
done

if [ "$MODE" = "build-here" ]; then
  say "Building the site here (a few minutes; may be killed on a 1 GB host)"
  if ! NODE_OPTIONS=--max-old-space-size=700 pnpm run build:next; then
    rm -rf dist-next
    die "The build stopped. The site is still running the old version. Use the normal update instead of --build-here."
  fi
fi

say "Applying database changes"
set -a
# .env pasted from Windows carries a carriage return at the end of each line.
# eval, not "source <(...)": the cPanel shell has no /dev/fd, so process substitution fails there.
eval "$(tr -d '\r' < .env)"
set +a
pnpm run db:migrate

say "Switching to the new site"
rm -rf dist-old
if [ -d dist ]; then mv dist dist-old; fi
mv dist-next dist
printf '%s\n' "$REMOTE" > dist/.commit

if restart_and_check; then
  printf '\nUpdate finished.\n'
  exit 0
fi
echo "The update is installed, but the site is not answering."
echo "Press Restart in cPanel > Setup Node.js App and open the site again."
echo "The previous site is kept; to go back to it run: bash $APP_DIR/update.sh --rollback"
echo "If it still fails, send me the last lines of stderr.log."
exit 1
