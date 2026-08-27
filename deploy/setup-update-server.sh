#!/usr/bin/env bash
#
# One-time setup for the update server on the DigitalOcean droplet.
#
# Run this ON THE DROPLET as root:
#   ssh root@129.212.254.115
#   bash setup-update-server.sh
#
# It serves the installer files over HTTP and creates a restricted "deploy"
# user that GitHub Actions uses to upload new builds.
#
# This droplet also runs the Telegram bot and its database, so the script is
# deliberately non-destructive:
#   - it listens on a dedicated port, never claiming port 80 as default_server
#   - it does not remove or modify any existing nginx site
#   - it refuses to run if that port is already in use
# Nothing here touches the containers on 127.0.0.1:8090 or 127.0.0.1:5432.

set -euo pipefail

DEPLOY_USER=deploy
WEB_ROOT=/var/www/updates
# Serving on a separate port keeps the existing site on port 80 untouched.
UPDATE_PORT="${UPDATE_PORT:-8081}"

echo "==> Checking that port $UPDATE_PORT is free"
if ss -lntH "sport = :$UPDATE_PORT" 2>/dev/null | grep -q .; then
  echo "ERROR: port $UPDATE_PORT is already in use:" >&2
  ss -lntp "sport = :$UPDATE_PORT" >&2
  echo "Re-run with a different port, e.g.  UPDATE_PORT=8082 bash $0" >&2
  exit 1
fi

echo "==> Installing nginx (existing sites are left untouched)"
apt-get update -qq
apt-get install -y nginx

echo "==> Creating $WEB_ROOT"
mkdir -p "$WEB_ROOT/win" "$WEB_ROOT/mac"

echo "==> Creating the $DEPLOY_USER user"
# The deploy user owns only the update directory, so a leaked deploy key
# cannot be used to touch the rest of the server.
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --system --group --shell /bin/bash --home "/home/$DEPLOY_USER" "$DEPLOY_USER"
fi
mkdir -p "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 700 "/home/$DEPLOY_USER/.ssh"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"

chown -R "$DEPLOY_USER:$DEPLOY_USER" "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"

echo "==> Configuring nginx on port $UPDATE_PORT"
cat > /etc/nginx/sites-available/updates <<NGINX
server {
    # A dedicated port, and NOT default_server: the site already on port 80
    # (the Telegram bot's proxy) keeps working exactly as before.
    listen ${UPDATE_PORT};
    listen [::]:${UPDATE_PORT};
    server_name _;

    # Files live in /var/www/updates/{win,mac} and are served under /updates/,
    # so the document root is the parent directory.
    root /var/www;

    # Directory listing is off: the updater fetches exact filenames, and a
    # listing would expose every past version.
    autoindex off;

    location /updates/ {
        # Installers are immutable once published, so they cache well.
        location ~* \.(exe|dmg|zip|blockmap)\$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # The manifests must never be cached, or clients keep seeing the old
        # version long after a release.
        location ~* \.(yml|json)\$ {
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }

    # A trivial health check, handy for confirming the server is reachable.
    location = /health {
        default_type text/plain;
        return 200 "ok\n";
    }

    location / {
        return 404;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/updates /etc/nginx/sites-enabled/updates
# The default site is intentionally left alone: removing it could take down
# whatever is already being served on port 80.

echo "==> Testing the nginx configuration"
# If this fails, nothing is reloaded, so the running site stays up.
nginx -t
systemctl reload nginx

echo "==> Opening the firewall for port $UPDATE_PORT"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow "$UPDATE_PORT/tcp" || true
fi

cat <<DONE

Setup complete. Updates are served on port $UPDATE_PORT.
The Telegram bot and its database were not touched.

Next: add the GitHub Actions public key so uploads are allowed.
On your Mac, generate a key pair:

    ssh-keygen -t ed25519 -f ~/.ssh/pishfaktor_deploy -N "" -C "github-actions"

Then paste the PUBLIC key into this file on the droplet:

    /home/$DEPLOY_USER/.ssh/authorized_keys

Verify the server responds:

    curl http://129.212.254.115:$UPDATE_PORT/health

Confirm the bot is still healthy:

    docker container ls

DONE
