#!/usr/bin/env bash
# Puts the database back the way one of the saved copies had it.
#
#   bash scripts/restore-database.sh      (lists the saved copies, asks which one)
#   bash scripts/restore-database.sh 2    (copy number 2 of that list)
#
# The copies are the ones scripts/backup-database.sh saves in ~/db-backups
# (BACKUP_DIR to change), newest first. The whole database is replaced by what the
# copy held, so everything entered after it was taken - registrations, payments,
# tuitions - is gone. A copy of the database as it is now is saved first, so this can
# itself be undone, and you must type RESTORE to go on. Afterwards it applies any
# database changes the code on this server expects and restarts the site.
# Messages are English on purpose: the cPanel terminal cannot draw Bengali letters.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="$(basename "$APP_DIR")"
cd "$APP_DIR"

DIR="${BACKUP_DIR:-$HOME/db-backups}"

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
command -v mysql >/dev/null 2>&1 || die "mysql is not available on this server."
command -v gzip >/dev/null 2>&1 || die "gzip is not available on this server."
[ -f .env ] || die ".env is missing. See step 6 of the guide."

# Oldest first, because that is how the names sort; the list below is shown newest first.
ALL=("$DIR"/connect-tutors-*.sql.gz)
[ -e "${ALL[0]}" ] || die "There are no saved copies in $DIR. Nothing was changed."
COUNT="${#ALL[@]}"

# A copy's name holds the day and time it was saved (UTC); show it in Dhaka time (UTC+6).
describe() {
  local base rest day clock label epoch size
  base="${1##*/}"
  rest="${base#connect-tutors-}"
  rest="${rest%.sql.gz}"
  size="$(du -h "$1" | cut -f1)"
  if [[ "$rest" =~ ^([0-9]{8})-([0-9]{6})-(.*)$ ]]; then
    day="${BASH_REMATCH[1]}"
    clock="${BASH_REMATCH[2]}"
    label="${BASH_REMATCH[3]}"
    if epoch="$(date -u -d "${day:0:4}-${day:4:2}-${day:6:2} ${clock:0:2}:${clock:2:2}:${clock:4:2}" +%s 2>/dev/null)"; then
      printf '%s   %-22s %s' "$(date -u -d "@$((epoch + 21600))" '+%d %b %Y, %I:%M %p')" "$label" "$size"
      return
    fi
  fi
  printf '%s   %s' "$rest" "$size"
}

printf '\nSaved copies in %s (newest first, times are Dhaka time):\n\n' "$DIR"
NUMBER=1
for ((INDEX = COUNT - 1; INDEX >= 0; INDEX--)); do
  printf '  %2d)  %s\n' "$NUMBER" "$(describe "${ALL[$INDEX]}")"
  NUMBER=$((NUMBER + 1))
done

CHOICE="${1:-}"
if [ -z "$CHOICE" ]; then
  printf '\nType the number of the copy to restore (just press Enter to cancel): '
  read -r CHOICE || CHOICE=""
fi
if [ -z "$CHOICE" ]; then echo "Cancelled. Nothing was changed."; exit 0; fi
case "$CHOICE" in *[!0-9]*) die "'$CHOICE' is not a number from the list. Nothing was changed." ;; esac
CHOICE=$((10#$CHOICE))
if [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "$COUNT" ]; then die "There is no copy number $CHOICE. Nothing was changed."; fi
FILE="${ALL[$((COUNT - CHOICE))]}"

gzip -t "$FILE" 2>/dev/null || die "That copy is damaged. Pick another one. Nothing was changed."
case "$(gzip -dc "$FILE" | tail -n 1)" in
  *"Dump completed"*) ;;
  *) die "That copy is incomplete. Pick another one. Nothing was changed." ;;
esac

printf '\nYou are about to REPLACE the whole database with copy %s: %s\n' "$CHOICE" "$(describe "$FILE")"
printf 'Everything entered after that copy was taken is removed: registrations, payments, tuitions, messages.\n'
printf 'A copy of the database as it is now is saved first, so this can be undone.\n'
printf '\nTo go on, type RESTORE and press Enter: '
read -r ANSWER || ANSWER=""
[ "$ANSWER" = "RESTORE" ] || die "Not confirmed. Nothing was changed."

say "Saving a copy of the database as it is now"
# Raised so that saving this copy cannot push the one being restored out of the kept few.
if SAFETY_OUTPUT="$(BACKUP_KEEP=$((COUNT + 1)) bash scripts/backup-database.sh "before-restore" 2>&1)"; then
  printf '%s\n' "$SAFETY_OUTPUT"
else
  printf '%s\n' "$SAFETY_OUTPUT"
  if [ "${RESTORE_WITHOUT_SAFETY_COPY:-}" != "1" ]; then
    die "The copy of the current database could not be saved, so nothing was changed. If the database is itself broken and you accept that nothing of it is kept, run this again with RESTORE_WITHOUT_SAFETY_COPY=1 in front."
  fi
  echo "Going on without it, as asked."
fi
SAFETY_FILE="$(printf '%s\n' "$SAFETY_OUTPUT" | sed -n 's/^Database copy saved: \(.*\) ([^()]*)$/\1/p' | tail -n 1)"

OPTIONS="$(mktemp)"
ERRORS="$(mktemp)"
DROPS="$(mktemp)"
trap 'rm -f "$OPTIONS" "$ERRORS" "$DROPS"' EXIT
DB_NAME="$(node scripts/database-backup-config.mjs "$OPTIONS")" || die "could not read DATABASE_URL (see the line above). Nothing was changed."

stopped_midway() {
  printf '\n[STOPPED] The restore stopped part-way, so the database may be incomplete: %s\n' "$*" >&2
  if [ -n "$SAFETY_FILE" ]; then
    printf 'The database as it was before this attempt is saved in %s\n' "$SAFETY_FILE" >&2
  fi
  echo "Run this tool again and pick a copy (the newest 'before-restore' one is the database as it was before)." >&2
  exit 1
}

say "Replacing the database"
# Every table goes first, so nothing newer than the copy is left behind; then the copy is loaded.
# The foreign-key check is off in both steps, so the order tables go and come back in does not matter.
mysql --defaults-extra-file="$OPTIONS" --default-character-set=utf8mb4 -N -B "$DB_NAME" \
  -e 'SELECT CONCAT("DROP TABLE IF EXISTS `", table_name, "`;") FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = "BASE TABLE"' \
  >"$DROPS" 2>"$ERRORS" || stopped_midway "could not list the current tables: $(tail -n 3 "$ERRORS" | tr '\n' ' ')"
{ echo 'SET FOREIGN_KEY_CHECKS=0;'; cat "$DROPS"; } \
  | mysql --defaults-extra-file="$OPTIONS" "$DB_NAME" 2>"$ERRORS" \
  || stopped_midway "could not clear the current tables: $(tail -n 3 "$ERRORS" | tr '\n' ' ')"
gzip -dc "$FILE" \
  | mysql --defaults-extra-file="$OPTIONS" --default-character-set=utf8mb4 "$DB_NAME" 2>"$ERRORS" \
  || stopped_midway "could not load the copy: $(tail -n 3 "$ERRORS" | tr '\n' ' ')"
echo "The database now holds what the copy held."

say "Applying any database changes this site's code expects"
set -a
# .env pasted from Windows carries a carriage return at the end of each line.
# eval, not "source <(...)": the cPanel shell has no /dev/fd, so process substitution fails there.
eval "$(tr -d '\r' < .env)"
set +a
pnpm run db:migrate || stopped_midway "the database changes could not be applied"

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
      printf '\nRestore finished. %s/healthz says: %s\n' "$SITE" "$RESULT"
      exit 0
      ;;
  esac
  sleep 6
done
printf '\nThe database is restored, but %s/healthz is not answering correctly.\n' "$SITE"
echo "Press Restart in cPanel > Setup Node.js App and open the site again. If it still fails, send me the last lines of stderr.log."
exit 1
