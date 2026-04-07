#!/usr/bin/env bash
# setup-nginx-certbot.sh — install nginx + Let's Encrypt SSL on an EC2 Ubuntu 22.04 host.
#
# Run once after Docker Compose is up and DNS for your domain points at this server.
#
# Usage (as root or with sudo):
#   sudo bash scripts/setup-nginx-certbot.sh teleoscope.ca admin@example.com
#
# Arguments:
#   $1  DOMAIN    — primary domain, e.g. teleoscope.ca
#   $2  EMAIL     — email for Let's Encrypt expiry notices

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: sudo bash $0 <domain> <certbot-email>"
  echo "  e.g. sudo bash $0 teleoscope.ca admin@example.com"
  exit 1
fi

echo "==> Installing nginx and certbot..."
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

echo "==> Writing HTTP-only nginx config for $DOMAIN..."
cat > /etc/nginx/sites-available/teleoscope <<NGINXCONF
# Teleoscope — managed by setup-nginx-certbot.sh
# certbot --nginx will extend this block with SSL directives.
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Next.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # RabbitMQ WebStomp (real-time workspace updates)
    location /ws {
        proxy_pass http://127.0.0.1:15674/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }
}
NGINXCONF

echo "==> Enabling site and removing default..."
ln -sf /etc/nginx/sites-available/teleoscope /etc/nginx/sites-enabled/teleoscope
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx

echo "==> Obtaining Let's Encrypt certificate for ${DOMAIN} and www.${DOMAIN}..."
certbot --nginx \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --email "${EMAIL}"

echo "==> Enabling automatic cert renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "Done. nginx is serving https://${DOMAIN}"
echo "Cert auto-renewal is active (systemd certbot.timer)."
echo ""
echo "Next steps:"
echo "  1. Ensure .env has NEXTAUTH_URL=https://${DOMAIN} and restart the app:"
echo "     docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d app"
echo "  2. Verify: curl -sf https://${DOMAIN}/api/hello"
