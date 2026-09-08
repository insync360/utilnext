#!/usr/bin/env bash
# Deploy / update UtilNext on a single server.
# Idempotent: safe to re-run after every push to the `release` branch.
#
#   bash deploy/scripts/deploy.sh
#
# Expects deploy/.env (copy deploy/.env.example).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

echo "==> Pulling images and starting services (project: $COMPOSE_PROJECT_NAME, tls: ${ENABLE_TLS:-true})"
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
