#!/usr/bin/env bash
# ── EspoCRM VPS Setup Script ───────────────────────────────────────────────
# Run this on the VPS (Ubuntu/Debian 22.04+) to deploy EspoCRM at crm.support.ruhvi.in.
#
# Prerequisites:
#   - Docker and Docker Compose plugin installed
#   - DNS A record for crm.support.ruhvi.in pointing to this VPS IP
#   - Ports 80 and 443 open in the firewall
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh

set -euo pipefail

echo "=== EspoCRM Setup for Ruhvi ==="

# ── 1. Install Docker if not present ──────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | bash
  sudo usermod -aG docker "$USER"
  echo "Docker installed. You may need to log out and back in for group changes."
fi

# ── 2. Install Docker Compose plugin if not present ───────────────────────
if ! docker compose version &>/dev/null; then
  echo "Installing Docker Compose plugin..."
  sudo apt-get update
  sudo apt-get install -y docker-compose-plugin
fi

# ── 3. Create .env if not exists ──────────────────────────────────────────
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  # Generate random secrets
  sed -i "s/change_me_root_password/$(openssl rand -base64 24)/" .env
  sed -i "s/change_me_db_password/$(openssl rand -base64 24)/" .env
  sed -i "s/change_me_espo_secret/$(openssl rand -base64 32)/" .env
  sed -i "s/change_me_webhook_secret/$(openssl rand -base64 32)/" .env
  echo "=== SECRETS GENERATED ==="
  echo "Save these credentials:"
  echo "  MYSQL_ROOT_PASSWORD: $(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2)"
  echo "  MYSQL_PASSWORD:      $(grep ^MYSQL_PASSWORD .env | cut -d= -f2)"
  echo "  ESPO_SECRET:         $(grep ESPO_SECRET .env | cut -d= -f2)"
  echo "  ESPO_WEBHOOK_SECRET: $(grep ESPO_WEBHOOK_SECRET .env | cut -d= -f2)"
  echo ""
  echo "IMPORTANT: After EspoCRM is installed, you must:"
  echo "  1. Visit https://crm.support.ruhvi.in and complete the web installer."
  echo "  2. Go to Admin → API Credentials → Create an API Key."
  echo "  3. Set ESPO_API_KEY in .env to the generated key."
  echo "  4. Restart: docker compose up -d"
  echo "  5. In Ruhvi Vercel dashboard, set the matching env vars."
else
  echo ".env already exists. Skipping generation."
fi

# ── 4. Pull images and start ──────────────────────────────────────────────
echo "Pulling Docker images and starting services..."
docker compose pull
docker compose up -d

echo ""
echo "=== Setup complete ==="
echo "EspoCRM will be available at https://crm.support.ruhvi.in after DNS propagation."
echo "Check status: docker compose ps"
echo "View logs:    docker compose logs -f"