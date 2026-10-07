#!/usr/bin/env bash
# One-command update for the cPanel deployment.
#
#   bash ~/connecttutorsbd_app/update.sh
#
# Fetches the new code, installs and builds it, applies database migrations,
# restarts the app and checks /healthz. Stops at the first problem and says so.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="$(basename "$APP_DIR")"
cd "$APP_DIR"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\n[থেমে গেছে] %s\n' "$*" >&2; exit 1; }

# Node and pnpm live in cPanel's per-app environment; enter it if we are not in it already.
if ! command -v pnpm >/dev/null 2>&1; then
  ACTIVATE="$(ls -d "$HOME"/nodevenv/"$APP_NAME"/*/bin/activate 2>/dev/null | sort -V | tail -n 1 || true)"
  [ -n "$ACTIVATE" ] || die "pnpm পাওয়া যায়নি। cPanel > Setup Node.js App-এর উপরের 'source .../activate' কমান্ডটা আগে চালান।"
  set +u
  # shellcheck disable=SC1090
  source "$ACTIVATE"
  set -u
  cd "$APP_DIR"
fi
command -v pnpm >/dev/null 2>&1 || die "pnpm পাওয়া যায়নি। গাইডের ধাপ ৫-এর 'npm install -g pnpm@10.4.1' চালান।"
[ -f .env ] || die ".env ফাইল নেই। গাইডের ধাপ ৬ দেখুন।"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  die "সার্ভারে কোডের কোনো ফাইল হাতে বদলানো আছে, তাই আপডেট করা নিরাপদ নয়। 'git status' চালিয়ে ফলাফল আমাকে পাঠান।"
fi

say "নতুন কোড আছে কিনা দেখছি"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch --quiet origin
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"
if [ "$LOCAL" = "$REMOTE" ]; then
  echo "নতুন কিছু নেই, সাইট আগেই হালনাগাদ আছে।"
  exit 0
fi
git --no-pager log --oneline "$LOCAL..$REMOTE"

NEW_MIGRATIONS="$(git diff --name-only "$LOCAL" "$REMOTE" -- 'drizzle/*.sql' | wc -l | tr -d ' ')"
if [ "$NEW_MIGRATIONS" -gt 0 ]; then
  printf '\nএই আপডেটে ডেটাবেসের %s টা নতুন ধাপ আছে।\n' "$NEW_MIGRATIONS"
  printf 'cPanel > Backup থেকে ডেটাবেসের কপি নামিয়েছেন? নামিয়ে থাকলে yes লিখে এন্টার চাপুন: '
  read -r ANSWER
  [ "$ANSWER" = "yes" ] || die "আগে ব্যাকআপ নিন, তারপর আবার চালান। কিছু বদলানো হয়নি।"
fi

say "নতুন কোড নামাচ্ছি"
git merge --ff-only --quiet "origin/$BRANCH"

say "প্যাকেজ ঠিক করছি (মেমরি কম হলে নিজে আবার চেষ্টা করবে)"
ATTEMPT=1
until pnpm install --frozen-lockfile --network-concurrency=1 --child-concurrency=1; do
  [ "$ATTEMPT" -lt 8 ] || die "pnpm install বারবার থেমে যাচ্ছে। শেষের লেখাগুলো আমাকে পাঠান।"
  ATTEMPT=$((ATTEMPT + 1))
  echo "--- আবার চেষ্টা ($ATTEMPT/8) ---"
  sleep 2
done

say "সাইট বানাচ্ছি (কয়েক মিনিট লাগবে)"
if ! NODE_OPTIONS=--max-old-space-size=700 pnpm run build; then
  die "build থেমে গেছে। সাইট আগের মতোই চলছে। শেষের লেখাগুলো আমাকে পাঠান।"
fi

say "ডেটাবেসের ধাপগুলো চালাচ্ছি"
set -a
# .env pasted from Windows carries a carriage return at the end of each line.
# shellcheck disable=SC1090
source <(tr -d '\r' < .env)
set +a
pnpm run db:migrate

say "সাইট চালু করছি (Restart)"
mkdir -p tmp
touch tmp/restart.txt

SITE="${PUBLIC_SITE_URL:-https://connecttutorsbd.com}"
say "সাইট ঠিক আছে কিনা দেখছি"
sleep 10
for TRY in 1 2 3 4 5; do
  RESULT="$(curl -s -m 20 "$SITE/healthz" || true)"
  case "$RESULT" in
    *'"ok"'*)
      printf '\nআপডেট শেষ। %s/healthz: %s\n' "$SITE" "$RESULT"
      exit 0
      ;;
  esac
  sleep 6
done
printf '\nআপডেট হয়েছে, কিন্তু %s/healthz ঠিক উত্তর দিচ্ছে না।\n' "$SITE"
echo "cPanel > Setup Node.js App > Restart চাপুন, তারপর আবার খুলে দেখুন। না হলে stderr.log-এর শেষ কয়েক লাইন আমাকে পাঠান।"
exit 1
