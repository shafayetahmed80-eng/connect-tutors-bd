#!/usr/bin/env bash
# One-command update for the cPanel deployment.
#
#   bash ~/connecttutorsbd_app/update.sh
#
# Fetches the new code, installs and builds it, applies database migrations,
# restarts the app and checks /healthz. Stops at the first problem and says so.
# Messages are English on purpose: the cPanel terminal cannot draw Bengali letters.
set -euo pipefail

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
if [ "$LOCAL" = "$REMOTE" ]; then
  echo "Nothing new. The site is already up to date."
  exit 0
fi
git --no-pager log --oneline "$LOCAL..$REMOTE"

NEW_MIGRATIONS="$(git diff --name-only "$LOCAL" "$REMOTE" -- 'drizzle/*.sql' | wc -l | tr -d ' ')"
if [ "$NEW_MIGRATIONS" -gt 0 ]; then
  printf '\nThis update changes the database (%s new step(s)).\n' "$NEW_MIGRATIONS"
  printf 'Did you download a database backup from cPanel > Backup? If yes, type yes and press Enter: '
  read -r ANSWER
  [ "$ANSWER" = "yes" ] || die "Take the backup first, then run this again. Nothing was changed."
fi

say "Downloading the new code"
git merge --ff-only --quiet "origin/$BRANCH"

say "Installing packages (retries by itself if the host runs out of memory)"
ATTEMPT=1
until pnpm install --frozen-lockfile --network-concurrency=1 --child-concurrency=1; do
  [ "$ATTEMPT" -lt 8 ] || die "pnpm install keeps stopping. Send me the last lines."
  ATTEMPT=$((ATTEMPT + 1))
  echo "--- trying again ($ATTEMPT/8) ---"
  sleep 2
done

say "Building the site (a few minutes)"
if ! NODE_OPTIONS=--max-old-space-size=700 pnpm run build; then
  die "The build stopped. The site is still running the old version. Send me the last lines."
fi

say "Applying database changes"
set -a
# .env pasted from Windows carries a carriage return at the end of each line.
# shellcheck disable=SC1090
source <(tr -d '\r' < .env)
set +a
pnpm run db:migrate

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
echo "Press Restart in cPanel > Setup Node.js App and open the site again. If it still fails, send me the last lines of stderr.log."
exit 1
