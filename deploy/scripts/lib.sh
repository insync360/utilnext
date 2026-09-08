# Shared helpers for deploy scripts. Source, do not execute.
#   source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
# Loads deploy/.env, cd's to the repo root and defines COMPOSE (an array).
#
# ENABLE_TLS=true  -> Traefik with Let's Encrypt on 80/443, site resolved by
#                     SITES_RULE (needs a real domain pointing at the server)
# ENABLE_TLS=false -> Traefik on port 80 only, any host name / the raw IP works
#                     (development). Frappe is told the site name explicitly.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="deploy/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy deploy/.env.example and fill it in." >&2
  exit 1
fi
# Load KEY=VALUE lines without bash evaluation (values such as
# SITES_RULE=Host(`x`) contain backticks and parentheses).
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$''}"
  [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
  [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
  export "$line"
done < "$ENV_FILE"
: "${SITE_NAME:?SITE_NAME not set in $ENV_FILE}"
: "${DB_PASSWORD:?DB_PASSWORD not set in $ENV_FILE}"

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-utilnext}"
# Make nginx route every request to our single site regardless of Host header.
export FRAPPE_SITE_NAME_HEADER="${FRAPPE_SITE_NAME_HEADER:-$SITE_NAME}"

if [[ "${ENABLE_TLS:-true}" == "true" ]]; then
  : "${SITES_RULE:?SITES_RULE not set (needed when ENABLE_TLS=true)}"
  : "${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL not set (needed when ENABLE_TLS=true)}"
  PROXY_OVERRIDE="overrides/compose.https.yaml"
else
  PROXY_OVERRIDE="overrides/compose.proxy.yaml"
fi

COMPOSE=(docker compose --env-file "$ENV_FILE"
  -f compose.yaml
  -f overrides/compose.mariadb.yaml
  -f overrides/compose.redis.yaml
  -f "$PROXY_OVERRIDE"
  -f deploy/compose.utilnext.yaml)
