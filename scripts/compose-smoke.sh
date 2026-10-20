#!/usr/bin/env bash
# Checks a freshly started `docker compose up` stack the way a new user would hit it:
# through nginx, sign up, log in, load a page. Run it after the stack is up.
#
#   docker compose up -d --build && ./scripts/compose-smoke.sh
#
# BASE overrides the URL; COMPOSE overrides the compose command (e.g. to add -p/-f).
set -euo pipefail

BASE=${BASE:-http://localhost}
COMPOSE=${COMPOSE:-docker compose}
EMAIL="smoke-$(date +%s)@example.com"
PASSWORD="smoke-pass-123"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

# Browsers send Origin on POST/PUT, so send it too: a CORS mistake shows up as a 403 here
api() {
  curl -s -o /tmp/smoke-body -w '%{http_code}' -H "Origin: $BASE" -H 'Content-Type: application/json' "$@"
}

echo "Waiting for the backend..."
for _ in $(seq 1 90); do
  if [ "$($COMPOSE ps -a --format '{{.State}}' backend)" = "exited" ]; then
    fail "backend container exited during startup"
  fi
  # nginx answers 502 until Spring is listening
  code=$(api -X POST "$BASE/api/auth/login" -d '{"email":"nobody@example.com","password":"x"}' || true)
  [ "$code" != "000" ] && [ "$code" != "502" ] && break
  sleep 2
done
[ "$code" = "400" ] || fail "backend not ready, last login probe answered $code"

code=$(api -X POST "$BASE/api/auth/register" -d "{\"name\":\"Smoke\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
[ "$code" = "201" ] || fail "register answered $code: $(cat /tmp/smoke-body)"

code=$(api -X POST "$BASE/api/auth/login" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
[ "$code" = "200" ] || fail "login answered $code: $(cat /tmp/smoke-body)"
token=$(sed -n 's/.*"token":"\([^"]*\)".*/\1/p' /tmp/smoke-body)
[ -n "$token" ] || fail "login response had no token"

code=$(api -H "Authorization: Bearer $token" "$BASE/api/applications/stats")
[ "$code" = "200" ] || fail "stats answered $code"

# Deep link: nginx has to fall back to index.html for client-side routes
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/jobs")
[ "$code" = "200" ] || fail "GET /jobs answered $code"

if $COMPOSE logs --no-color backend | grep -q ' ERROR '; then
  $COMPOSE logs --no-color backend | grep ' ERROR ' >&2
  fail "backend logged errors"
fi

echo "Smoke test passed"
