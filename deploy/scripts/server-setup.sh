#!/usr/bin/env bash
# One-time bootstrap of a fresh Ubuntu 22.04/24.04 server (e.g. AWS EC2).
# Installs Docker + Compose, clones the `release` branch to /opt/utilnext,
# prepares deploy/.env and runs the first deploy.
#
#   curl -fsSL https://raw.githubusercontent.com/insync360/utilnext/release/deploy/scripts/server-setup.sh | sudo bash
#
# or copy the file over and run `sudo bash server-setup.sh`.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/insync360/utilnext.git}"
BRANCH="${BRANCH:-release}"
INSTALL_DIR="${INSTALL_DIR:-/opt/utilnext}"
DEPLOY_USER="${SUDO_USER:-ubuntu}"

if [[ $EUID -ne 0 ]]; then echo "run with sudo" >&2; exit 1; fi

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | bash
fi
usermod -aG docker "$DEPLOY_USER" || true
docker compose version

echo "==> Cloning $REPO_URL ($BRANCH) into $INSTALL_DIR"
if [[ -d "$INSTALL_DIR/.git" ]]; then
  git -C "$INSTALL_DIR" fetch origin "$BRANCH"
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$INSTALL_DIR"

if [[ ! -f "$INSTALL_DIR/deploy/.env" ]]; then
  cp "$INSTALL_DIR/deploy/.env.example" "$INSTALL_DIR/deploy/.env"
  chmod 600 "$INSTALL_DIR/deploy/.env"
  echo
  echo "Created $INSTALL_DIR/deploy/.env from the template."
  echo "Edit it now (SITE_NAME, SITES_RULE, DB_PASSWORD, ADMIN_PASSWORD, LETSENCRYPT_EMAIL),"
  echo "then run:  cd $INSTALL_DIR && bash deploy/scripts/deploy.sh"
  exit 0
fi

echo "==> Deploying"
sudo -u "$DEPLOY_USER" bash -c "cd '$INSTALL_DIR' && bash deploy/scripts/deploy.sh"
