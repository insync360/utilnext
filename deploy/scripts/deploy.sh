#!/usr/bin/env bash
# Deploy / update UtilNext on a single server.
# Idempotent: safe to re-run after every push to the `release` branch.
#
#   bash deploy/scripts/deploy.sh
#
# Expects deploy/.env (copy deploy/.env.example). Run from the repo root or
# anywhere; the script cd's to the repo root itself.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="deploy/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy deploy/.env.example and fill it in." >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
: "${SITE_NAME:?SITE_NAME not set in $ENV_FILE}"
: "${DB_PASSWORD:?DB_PASSWORD not set in $ENV_FILE}"

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-utilnext}"
COMPOSE=(docker compose --env-file "$ENV_FILE"
  -f compose.yaml
  -f overrides/compose.mariadb.yaml
  -f overrides/compose.redis.yaml
  -f overrides/compose.https.yaml
  -f deploy/compose.utilnext.yaml)

echo "==> Pulling images and starting services (project: $COMPOSE_PROJECT_NAME)"
"${COMPOSE[@]}" pull --quiet
"${COMPOSE[@]}" up -d --remove-orphans

echo "==> Waiting for the backend"
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T backend bash -c 'test -f sites/common_site_config.json' 2>/dev/null; then break; fi
  sleep 2
done

if ! "${COMPOSE[@]}" exec -T backend bash -c "test -d sites/$SITE_NAME"; then
  echo "==> Site $SITE_NAME does not exist yet: creating it"
  bash deploy/scripts/create-site.sh
else
  echo "==> Site $SITE_NAME exists: running migrations"
  "${COMPOSE[@]}" exec -T backend bench --site "$SITE_NAME" migrate
fi

echo "==> Applying UtilNext theme and branding"
bash deploy/scripts/apply-theme.sh

echo "==> Done. Services:"
"${COMPOSE[@]}" ps --format 'table {{.Name}}\t{{.Status}}'
