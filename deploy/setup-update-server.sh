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

# Make a failure impossible to miss: without this, piping the script through
# tail or less hides the non-zero exit status and a half-finished run looks
# like a successful one.
trap 'echo; echo "!!! SETUP FAILED at line $LINENO. Nothing further was changed." >&2; exit 1' ERR

DEPLOY_USER=deploy
WEB_ROOT=/var/www/updates
# Serving on a separate port keeps the existing site on port 80 untouched.
UPDATE_PORT="${UPDATE_PORT:-8081}"

echo "==> Checking that port $UPDATE_PORT is free"

# ss can miss a listener bound only to IPv6 or inside another namespace, so
# fall back to actually opening a connection. Taking a port that another
# service owns would break that service.
port_in_use() {
  ss -lntH "sport = :$UPDATE_PORT" 2>/dev/null | grep -q . && return 0
  (exec 3<>"/dev/tcp/127.0.0.1/$UPDATE_PORT") 2>/dev/null && { exec 3<&-; return 0; }
  return 1
}

# Is the listener our own nginx from a previous run, rather than something else?
port_is_our_nginx() {
  [ -f /etc/nginx/sites-available/updates ] || return 1
  ss -lntpH "sport = :$UPDATE_PORT" 2>/dev/null | grep -q 'nginx' && return 0
  # If ss shows nothing but the port answers, only treat it as ours when nginx
  # is running and our site is the one configured on this port.
  systemctl is-active --quiet nginx 2>/dev/null &&
    grep -qE "listen[[:space:]]+(\[::\]:)?$UPDATE_PORT;" /etc/nginx/sites-available/updates
}

if port_in_use; then
  # nginx holding the port from a previous run of this script is fine: the
  # config is simply rewritten. Anything else is a genuine conflict, and
  # taking the port would break whatever already owns it.
  if port_is_our_nginx; then
    echo "    port $UPDATE_PORT is held by this script's own nginx site, re-running"
  else
    echo "ERROR: port $UPDATE_PORT is already in use by another service:" >&2
    ss -lntp "sport = :$UPDATE_PORT" >&2
    echo "Re-run with a different port, e.g.  UPDATE_PORT=8082 bash $0" >&2
    exit 1
  fi
fi

echo "==> Installing nginx (existing sites are left untouched)"
if command -v nginx >/dev/null 2>&1; then
  echo "    nginx is already installed, skipping"
else
  # A DigitalOcean mirror that is mid-sync makes apt-get update fail on the
  # dep11 app-metadata files. Those are irrelevant to installing nginx, so a
  # refresh failure must not abort the script.
  apt-get update -qq || echo "    (apt-get update reported errors, continuing)"

  if ! apt-get install -y nginx; then
    echo "    retrying without the app-metadata index" >&2
    # dep11 is what the broken mirror serves; skipping it avoids the failure.
    apt-get -o APT::Get::List-Cleanup=0 \
            -o Acquire::IndexTargets::deb::DEP-11::DefaultEnabled=false \
            update -qq || true
    apt-get install -y nginx
  fi
fi

echo "==> Creating $WEB_ROOT"
mkdir -p "$WEB_ROOT/win" "$WEB_ROOT/mac"

echo "==> Creating the $DEPLOY_USER user"
# The deploy user owns only the update directory, so a leaked deploy key
# cannot be used to touch the rest of the server.
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  # useradd is in base Ubuntu; adduser is a Debian wrapper that is not always
  # present in minimal images.
  if command -v adduser >/dev/null 2>&1; then
    adduser --system --group --shell /bin/bash --home "/home/$DEPLOY_USER" "$DEPLOY_USER"
  else
    useradd --system --user-group --shell /bin/bash \
            --home-dir "/home/$DEPLOY_USER" --create-home "$DEPLOY_USER"
  fi
fi
mkdir -p "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 700 "/home/$DEPLOY_USER/.ssh"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"

# Ensure the password field is "*" (no password set) rather than "!" (locked).
# Both refuse password logins, but a "!" can block key-based login too on some
# sshd configurations. Key authentication is the only way in either way.
usermod -p '*' "$DEPLOY_USER" 2>/dev/null || true

# Install the deploy key if one was passed in. ssh-copy-id cannot be used for
# this account: it would need to log in as $DEPLOY_USER, which is exactly the
# access being set up here.
#   DEPLOY_PUBKEY="$(cat ~/.ssh/pishfaktor_deploy.pub)" bash setup-update-server.sh
if [ -n "${DEPLOY_PUBKEY:-}" ]; then
  auth="/home/$DEPLOY_USER/.ssh/authorized_keys"
  if grep -qxF "$DEPLOY_PUBKEY" "$auth" 2>/dev/null; then
    echo "    deploy key is already installed"
  else
    printf '%s\n' "$DEPLOY_PUBKEY" >> "$auth"
    echo "    deploy key installed"
  fi
  chown "$DEPLOY_USER:$DEPLOY_USER" "$auth"
  chmod 600 "$auth"
fi

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
# If this fails the script stops here, so the running site is never reloaded
# with a broken config.
nginx -t

echo "==> Reloading nginx"
if systemctl is-active --quiet nginx 2>/dev/null; then
  # Reload rather than restart: existing connections are not dropped.
  systemctl reload nginx
elif command -v systemctl >/dev/null 2>&1; then
  systemctl enable --now nginx
else
  # No systemd (a container, for example).
  nginx -s reload 2>/dev/null || nginx
fi

echo "==> Opening the firewall for port $UPDATE_PORT"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow "$UPDATE_PORT/tcp" || true
fi

cat <<DONE

Setup complete. Updates are served on port $UPDATE_PORT.
The Telegram bot and its database were not touched.

$(if [ -n "${DEPLOY_PUBKEY:-}" ]; then
cat <<KEYDONE
The deploy key is installed. Test it from your Mac:

    ssh -i ~/.ssh/pishfaktor_deploy $DEPLOY_USER@129.212.254.115 'echo works'
KEYDONE
else
cat <<KEYTODO
Next: install the deploy key so GitHub Actions can upload.

On your Mac, generate the key pair:

    ssh-keygen -t ed25519 -f ~/.ssh/pishfaktor_deploy -N "" -C "github-actions"

Then re-run this script with the PUBLIC key, as root:

    scp ~/.ssh/pishfaktor_deploy.pub root@129.212.254.115:/root/
    ssh root@129.212.254.115 \\
      'DEPLOY_PUBKEY="\$(cat /root/pishfaktor_deploy.pub)" bash /root/setup-update-server.sh'

Do not use ssh-copy-id for this: it logs in as $DEPLOY_USER, which is the
very access being granted, so it cannot work until the key is already there.
KEYTODO
fi)

Verify the server responds:

    curl http://129.212.254.115:$UPDATE_PORT/health

Confirm the bot is still healthy:

    docker container ls

DONE
