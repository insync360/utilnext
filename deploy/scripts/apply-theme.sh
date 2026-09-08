#!/usr/bin/env bash
# Wire the UtilNext (Salesforce-style) theme into the site and apply branding.
# Idempotent. Mirrors what LOCAL-SETUP.md describes for the dev machine:
#   - site_config.json: app_include_css / app_include_js  (desk pages)
#   - Website Settings head_html                            (login page)
#   - Website Settings + Navbar Settings app name / logo / favicon
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
set -a; source deploy/.env; set +a
: "${SITE_NAME:?}"

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-utilnext}"
COMPOSE=(docker compose --env-file deploy/.env
  -f compose.yaml -f overrides/compose.mariadb.yaml -f overrides/compose.redis.yaml
  -f overrides/compose.https.yaml -f deploy/compose.utilnext.yaml)

CSS='["/assets/slds/slds-theme.css","/assets/slds/slds-components.css","/assets/slds/slds-list.css","/assets/slds/slds-form.css"]'
JS='["/assets/slds/slds-theme.js","/assets/slds/slds-list.js","/assets/slds/slds-form.js"]'

"${COMPOSE[@]}" exec -T backend bench --site "$SITE_NAME" set-config -p app_include_css "$CSS"
"${COMPOSE[@]}" exec -T backend bench --site "$SITE_NAME" set-config -p app_include_js "$JS"

# Branding lives in the database; run the python helper inside the backend env.
"${COMPOSE[@]}" exec -T -e SITE_NAME="$SITE_NAME" backend bash -c \
  'cd sites && ../env/bin/python -' < deploy/scripts/branding.py

"${COMPOSE[@]}" exec -T backend bench --site "$SITE_NAME" clear-cache
"${COMPOSE[@]}" exec -T backend bench --site "$SITE_NAME" clear-website-cache
echo "Theme and branding applied to $SITE_NAME."
