#!/usr/bin/env bash
# Asks the site to send the day's payment reminders to Tutors.
#
#   bash scripts/run-payment-reminders.sh             (what the schedule runs)
#   bash scripts/run-payment-reminders.sh --dry-run   (only counts what a run would send)
#
# The site does the work; this just calls it with the secret from .env (CRON_SECRET)
# and prints what it answered. The secret is passed on standard input, not on the
# command line, where other users of the server could read it. Run it every hour: a
# reminder is sent once, and the site does nothing between 21:00 and 08:00 in Dhaka.
# Messages are English on purpose: the cPanel terminal cannot draw Bengali letters.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

fail() { printf '%s [STOPPED] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2; exit 1; }

QUERY=""
case "${1:-}" in
  "") ;;
  --dry-run) QUERY="?dryRun=1" ;;
  *) fail "Unknown option: $1 (only --dry-run is allowed)." ;;
esac

[ -f .env ] || fail ".env is missing."
command -v curl >/dev/null 2>&1 || fail "curl is not available on this server."

# One value out of .env, without running the file: a Windows line ending and surrounding quotes are dropped.
env_value() {
  local line value
  line="$(tr -d '\r' < .env | grep -E "^$1=" | tail -n 1 || true)"
  value="${line#*=}"
  value="${value#\"}"; value="${value%\"}"
  value="${value#\'}"; value="${value%\'}"
  printf '%s' "$value"
}

SECRET="$(env_value CRON_SECRET)"
[ -n "$SECRET" ] || fail "CRON_SECRET is not set in .env, so the site has no reminders address. Add it and restart the site."
SITE="$(env_value PUBLIC_SITE_URL)"
SITE="${SITE:-https://connecttutorsbd.com}"
SITE="${SITE%/}"

STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
URL="$SITE/api/cron/payment-reminders$QUERY"
NL=$'\n'
# The status code comes back on the last line, after the site's own answer.
if ! OUTPUT="$(printf 'header = "x-cron-secret: %s"\n' "$SECRET" | curl -sS -m 120 -X POST -K - -w '\n%{http_code}' "$URL" 2>&1)"; then
  fail "the request to $SITE failed: $OUTPUT"
fi
CODE="${OUTPUT##*"$NL"}"
BODY="${OUTPUT%"$NL"*}"
[ "$CODE" = "200" ] || fail "the site answered $CODE: $BODY"
printf '%s %s\n' "$STAMP" "$BODY"
