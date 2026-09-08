#!/usr/bin/env bash
# EC2 user-data for the UtilNext server (Ubuntu 24.04). Runs once at first boot:
# swap file (ERPNext migrations spike memory on small instances), Docker, and
# a clone of the release branch. The actual deploy is run over SSH afterwards
# (deploy/scripts/deploy.sh) once deploy/.env has been written.
set -euxo pipefail
exec > >(tee -a /var/log/utilnext-user-data.log) 2>&1

# 2 GB swap
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -w vm.swappiness=10
echo 'vm.swappiness=10' > /etc/sysctl.d/90-utilnext.conf

# Docker Engine + Compose plugin
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl jq
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | bash
fi
usermod -aG docker ubuntu

# Repo
if [[ ! -d /opt/utilnext/.git ]]; then
  git clone --branch release https://github.com/insync360/utilnext.git /opt/utilnext
fi
chown -R ubuntu:ubuntu /opt/utilnext
touch /var/lib/cloud/instance/utilnext-bootstrap-done
