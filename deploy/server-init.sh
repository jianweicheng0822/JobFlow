#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 server that runs JobFlow with Docker Compose.
# Safe to run again: every step checks what's already there first.
#
#   scp deploy/server-init.sh ubuntu@<server>:~ && ssh ubuntu@<server> 'sudo bash server-init.sh'
#
# The firewall lives in the AWS security group, not ufw: Docker publishes ports past ufw,
# so ufw rules would look right while the ports stay open to everyone.
set -euo pipefail

APP_USER=${APP_USER:-ubuntu}
APP_DIR=${APP_DIR:-/opt/jobflow}
SWAP_SIZE=${SWAP_SIZE:-2G}

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this with sudo." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> System packages"
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q ca-certificates curl unattended-upgrades

echo "==> Automatic security updates"
# Ubuntu already installs security updates daily; this adds the reboot some of them need,
# at a quiet hour (the server runs in UTC)
cat > /etc/apt/apt.conf.d/52jobflow-unattended <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo "==> Docker"
if ! command -v docker >/dev/null; then
  # Docker's own repo: Ubuntu's docker.io package lags behind and has no compose plugin
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  codename=$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $codename stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Container logs grow forever by default and would eventually fill the disk
daemon_json='{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}'
if [ "$(cat /etc/docker/daemon.json 2>/dev/null)" != "$daemon_json" ]; then
  echo "$daemon_json" > /etc/docker/daemon.json
  systemctl restart docker
fi
systemctl enable --now docker >/dev/null
usermod -aG docker "$APP_USER"

echo "==> Swap"
# 1 GB of RAM isn't enough for Java + MySQL at peak; swap keeps the OOM killer away
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  fallocate -l "$SWAP_SIZE" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
# Only swap when memory is really tight, so normal requests stay in RAM
echo 'vm.swappiness=10' > /etc/sysctl.d/99-jobflow.conf
sysctl -q --system

echo "==> App directory"
# certs/ holds the Cloudflare origin certificate, .env the production secrets.
# Both are copied in by hand and never leave the server.
install -d -m 750 -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
install -d -m 700 -o "$APP_USER" -g "$APP_USER" "$APP_DIR/certs"
if [ ! -f "$APP_DIR/.env" ]; then
  install -m 600 -o "$APP_USER" -g "$APP_USER" /dev/null "$APP_DIR/.env"
fi

echo
echo "Done."
docker --version
docker compose version
swapon --show
echo "Log out and back in once so $APP_USER can run docker without sudo."
if [ -f /var/run/reboot-required ]; then
  echo "A reboot is needed to finish the updates: sudo reboot"
fi
