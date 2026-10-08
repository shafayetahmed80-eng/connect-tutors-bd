#!/usr/bin/env bash
# Saves a compressed copy of the database and keeps only the newest few.
#
#   bash scripts/backup-database.sh [label]
#
# The copy goes to ~/db-backups/connect-tutors-<UTC date and time>-<label>.sql.gz,
# outside the website folders, readable only by this account. update.sh runs this
# before an update that changes the database. It prints the file's path when it
# worked; if anything fails it says why, leaves no half-written file and exits 1.
#
# Settings (all optional): BACKUP_DIR (folder), BACKUP_KEEP (how many to keep, default 10).
# A copy kept on the same server does not survive losing the hosting account - it is
# for undoing a bad update. Download one from cPanel > Backup now and then as well.
# Messages are English on purpose: the cPanel terminal cannot draw Bengali letters.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

KEEP="${BACKUP_KEEP:-10}"
DIR="${BACKUP_DIR:-$HOME/db-backups}"
LABEL="${1:-manual}"
LABEL="${LABEL//[^A-Za-z0-9._-]/}"
[ -n "$LABEL" ] || LABEL="manual"

fail() { printf 'Backup failed: %s\n' "$*" >&2; exit 1; }

case "$KEEP" in ''|*[!0-9]*) fail "BACKUP_KEEP must be a number." ;; esac
[ "$KEEP" -ge 1 ] || fail "BACKUP_KEEP must be at least 1."
command -v mysqldump >/dev/null 2>&1 || fail "mysqldump is not available on this server."
command -v node >/dev/null 2>&1 || fail "node is not available (enter the app's environment first)."
command -v gzip >/dev/null 2>&1 || fail "gzip is not available on this server."

mkdir -p "$DIR" || fail "cannot create $DIR."
chmod 700 "$DIR" 2>/dev/null || true

OPTIONS="$(mktemp)"
ERRORS="$(mktemp)"
PARTIAL="$(mktemp "$DIR/.partial-XXXXXX")"
trap 'rm -f "$OPTIONS" "$ERRORS" "$PARTIAL"' EXIT

DB_NAME="$(node scripts/database-backup-config.mjs "$OPTIONS")" || fail "could not read DATABASE_URL (see the line above)."

if ! mysqldump --defaults-extra-file="$OPTIONS" --single-transaction --quick --skip-lock-tables \
     --default-character-set=utf8mb4 "$DB_NAME" 2>"$ERRORS" | gzip -c > "$PARTIAL"; then
  fail "mysqldump stopped: $(tail -n 3 "$ERRORS" | tr '\n' ' ')"
fi

# mysqldump ends a complete copy with a "Dump completed" line; a cut-off copy lacks it.
gzip -t "$PARTIAL" 2>/dev/null || fail "the copy is damaged."
LAST_LINE="$(gzip -dc "$PARTIAL" | tail -n 1)"
case "$LAST_LINE" in
  *"Dump completed"*) ;;
  *) fail "the copy is incomplete." ;;
esac

STAMP="$(date -u +%Y%m%d-%H%M%S)"
FILE="$DIR/connect-tutors-$STAMP-$LABEL.sql.gz"
chmod 600 "$PARTIAL"
mv "$PARTIAL" "$FILE"

# Newest names sort last; drop the oldest beyond KEEP. Only files named like ours are touched.
ls -1 "$DIR"/connect-tutors-*.sql.gz 2>/dev/null | sort -r | tail -n +"$((KEEP + 1))" | while IFS= read -r OLD; do
  rm -f -- "$OLD"
done

printf 'Database copy saved: %s (%s)\n' "$FILE" "$(du -h "$FILE" | cut -f1)"
