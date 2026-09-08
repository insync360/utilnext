#!/usr/bin/env bash
# Create the Frappe site named $SITE_NAME with ERPNext installed.
# Called by deploy.sh on first deploy; safe to run manually.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD not set}"

"${COMPOSE[@]}" exec -T backend bash -c '
  set -e
  wait-for-it -t 180 db:3306
  wait-for-it -t 60 redis-cache:6379
  wait-for-it -t 60 redis-queue:6379
  for i in $(seq 1 60); do
    if jq -e ".db_host and .redis_cache and .redis_queue" sites/common_site_config.json >/dev/null 2>&1; then break; fi
    echo "waiting for common_site_config.json"; sleep 3
  done
  if [ -d "sites/'"$SITE_NAME"'" ]; then echo "site already exists"; exit 0; fi
  bench new-site "'"$SITE_NAME"'" \
    --mariadb-user-host-login-scope="%" \
    --db-root-username=root --db-root-password="'"$DB_PASSWORD"'" \
    --admin-password="'"$ADMIN_PASSWORD"'" \
    --install-app erpnext --set-default
  bench --site "'"$SITE_NAME"'" enable-scheduler
'
echo "Site $SITE_NAME created."
