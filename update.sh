#!/usr/bin/env bash
# One-command update for the cPanel deployment.
#
#   bash ~/connecttutorsbd_app/update.sh              (normal: download the site GitHub built)
#   bash ~/connecttutorsbd_app/update.sh --build-here (emergency: build on this server)
#
# The host allows 1 GB of memory and building the site can need more, so the
# normal path never builds here: GitHub builds every merge to main and keeps the
# result as the "dist-latest" release. This script downloads that, installs
# packages, applies database migrations, swaps the new site in and restarts.
# The running site is only replaced once everything before it has worked.
# Messages are English on purpose: the cPanel terminal cannot draw Bengali letters.
set -euo pipefail

MODE="prebuilt"
case "${1:-}" in
  "") ;;
  --build-here) MODE="build-here" ;;
  *) echo "Unknown option: $1 (only --build-here is allowed)" >&2; exit 1 ;;
esac

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="$(basename "$APP_DIR")"
cd "$APP_DIR"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\n[STOPPED] %s\n' "$*" >&2; exit 1; }

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
  printf 'Did you download a database backup from cPanel > Backup? If yes, type yes and press Enter: '
  read -r ANSWER
  [ "$ANSWER" = "yes" ] || die "Take the backup first, then run this again. Nothing was changed."
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

say "Restarting the site"
mkdir -p tmp
touch tmp/restart.txt

SITE="${PUBLIC_SITE_URL:-https://connecttutorsbd.com}"
say "Checking that the site answers"
sleep 10
for TRY in 1 2 3 4 5; do
  RESULT="$(curl -s -m 20 "$SITE/healthz" || true)"
  case "$RESULT" in
    *'"ok"'*)
      printf '\nUpdate finished. %s/healthz says: %s\n' "$SITE" "$RESULT"
      exit 0
      ;;
  esac
  sleep 6
done
printf '\nThe update is installed, but %s/healthz is not answering correctly.\n' "$SITE"
echo "Press Restart in cPanel > Setup Node.js App and open the site again."
echo "The previous site is kept in dist-old/. If it still fails, send me the last lines of stderr.log."
exit 1
