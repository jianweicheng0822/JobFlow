#!/usr/bin/env bash
# Deploys one commit on the server. CI runs it through AWS SSM (as root):
#
#   bash /opt/jobflow/deploy.sh <commit sha>
#
# Fetches that commit's compose file and nginx config, checks them and pulls the images
# while the old version keeps running, backs up the database, then starts the new images
# and waits until the site answers. If they don't start or don't answer, it goes back to
# the version that was running before. Anything that fails before the switch leaves the
# server exactly as it was.
set -euo pipefail

TAG=${1:?usage: deploy.sh <commit sha>}
APP_DIR=${APP_DIR:-/opt/jobflow}
RAW=https://raw.githubusercontent.com/jianweicheng0822/JobFlow/$TAG/deploy
KEEP_BACKUPS=5

cd "$APP_DIR"

# Secrets and the certificate are put on the server by hand, once
[ -s .env ] || { echo "$APP_DIR/.env is missing or empty" >&2; exit 1; }
[ -f certs/jobflow-origin.pem ] && [ -f certs/jobflow-origin.key ] \
  || { echo "Origin certificate missing in $APP_DIR/certs" >&2; exit 1; }

dc() {
  docker compose -f docker-compose.prod.yml --env-file .env --env-file release.env "$@"
}
# Same, but with the config and version we're about to switch to
dc_new() {
  docker compose -f docker-compose.prod.yml.new --env-file .env --env-file release.env.new "$@"
}

# Answers once nginx, the backend and MySQL are all up
wait_until_up() {
  for _ in $(seq 1 60); do
    if curl -skf -o /dev/null https://127.0.0.1/api/auth/providers; then
      return 0
    fi
    sleep 3
  done
  return 1
}

echo "==> Fetching config for $TAG"
for f in docker-compose.prod.yml nginx.prod.conf; do
  curl -fsSL "$RAW/$f" -o "$f.new"
done

PREVIOUS=$(sed -n 's/^IMAGE_TAG=//p' release.env 2>/dev/null || true)
echo "IMAGE_TAG=$TAG" > release.env.new

# A broken .env or compose file stops us here, before anything on the server changes
echo "==> Checking config"
dc_new config -q

echo "==> Pulling images"
dc_new pull --quiet

echo "==> Backing up the database"
install -d -m 700 backups
if [ -n "$PREVIOUS" ] && [ -n "$(dc ps -q mysql)" ]; then
  backup="backups/jobflow-$(date -u +%Y%m%d-%H%M%S)-${PREVIOUS:0:7}.sql.gz"
  dc exec -T mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --no-tablespaces jobflow' \
    | gzip > "$backup"
  chmod 600 "$backup"
  echo "Saved $backup"
  # Only the newest few
  ls -1t backups/jobflow-*.sql.gz | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm --
else
  echo "Nothing running yet, skipping"
fi

echo "==> Starting $TAG (previous: ${PREVIOUS:-none})"
# Keep the running version's config around in case we have to go back to it
for f in docker-compose.prod.yml nginx.prod.conf; do
  [ -f "$f" ] && cp "$f" "$f.prev"
done
[ -f release.env ] && cp release.env release.env.prev
mv docker-compose.prod.yml.new docker-compose.prod.yml
mv nginx.prod.conf.new nginx.prod.conf
mv release.env.new release.env

# Inside the if, so a failing "up" goes to the rollback below instead of exiting on set -e
if dc up -d --remove-orphans && wait_until_up; then
  echo "==> $TAG is up"
  # Old images pile up with every deploy; whatever a container still uses is kept
  docker image prune -af >/dev/null
  df -h / | tail -1
  exit 0
fi

echo "==> $TAG didn't come up. Backend log:" >&2
dc logs --no-color --tail 80 backend >&2 || true
if [ -n "$PREVIOUS" ]; then
  # Database migrations the new version ran aren't undone; that's what the backup is for
  echo "==> Rolling back to $PREVIOUS" >&2
  mv docker-compose.prod.yml.prev docker-compose.prod.yml
  mv nginx.prod.conf.prev nginx.prod.conf
  mv release.env.prev release.env
  if dc up -d --remove-orphans && wait_until_up; then
    echo "Rolled back to $PREVIOUS" >&2
  else
    echo "Rollback didn't come up either" >&2
  fi
fi
exit 1
