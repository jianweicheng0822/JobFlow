#!/usr/bin/env bash
# Runs one k6 script and collects everything for it in loadtest/results/<run>/:
#   requests.csv.gz  every request k6 made (input for analyze.js)
#   resources.csv    CPU / memory samples from sample-resources.ps1
#   report.html      k6's chart dashboard, open it in a browser
#   summary.txt      k6's end-of-run summary
#   analysis.md      per-step tables from analyze.js
#
# Usage (Git Bash, from anywhere):
#   loadtest/run.sh <read|write|login|mixed> <smoke|stress|load|spike> [LIMIT]
# LIMIT is the iterations/s the stress run topped out at; load and spike need it.

set -euo pipefail

script=${1:?usage: run.sh <script> <profile> [LIMIT]}
profile=${2:?usage: run.sh <script> <profile> [LIMIT]}
limit=${3:-}

cd "$(dirname "$0")"

# Same guard as seed.js: only ever load test the loadtest profile
rate_limit=$(curl -s -o /dev/null -D - -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' -d '{}' | tr -d '\r' | awk -F': ' 'tolower($1)=="x-ratelimit-limit" {print $2}')
if [[ "$rate_limit" != "1000000" ]]; then
  echo "Backend isn't running in loadtest mode (rate limit: '${rate_limit:-no response}')." >&2
  echo "Start it with SPRING_PROFILES_ACTIVE=loadtest, see loadtest/README.md." >&2
  exit 1
fi

run="$script-$profile-$(date +%Y%m%d-%H%M%S)"
out="results/$run"
mkdir -p "$out"
stop_file="$out/.stop"

powershell -NoProfile -ExecutionPolicy Bypass -File sample-resources.ps1 \
  -OutFile "$(cygpath -w "$out/resources.csv")" -StopFile "$(cygpath -w "$stop_file")" &
# Stop the sampler however we exit, and let it write its last line first
trap 'touch "$stop_file"; wait; rm -f "$stop_file"' EXIT

echo "Running $script.js with PROFILE=$profile${limit:+ LIMIT=$limit} -> loadtest/$out"

# Thresholds failing is expected under stress, so don't let k6's exit code stop us
k6_status=0
MSYS_NO_PATHCONV=1 docker run --rm --name jobflow-k6 \
  -v "$(pwd -W):/loadtest" \
  -e K6_WEB_DASHBOARD=true \
  -e K6_WEB_DASHBOARD_EXPORT="/loadtest/$out/report.html" \
  grafana/k6:2.3.0 run \
  -e PROFILE="$profile" -e LIMIT="$limit" \
  --out csv="/loadtest/$out/requests.csv.gz" \
  "/loadtest/k6/$script.js" 2>&1 | tee "$out/summary.txt" || k6_status=$?

node analyze.js "$out"
echo "k6 exit code: $k6_status (99 = thresholds crossed, expected under stress; 105 = stopped early)"
