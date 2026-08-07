#!/bin/sh
set -e

echo "==> MediSecours backend starting..."

# Render injects PORT. Keep nginx aligned with it while preserving a usable
# local default.
APP_PORT="${PORT:-10000}"
sed -i "s/listen 10000;/listen ${APP_PORT};/" /etc/nginx/http.d/default.conf

# Production JWT keys must remain stable across deployments and be shared
# with the WebSocket service.
mkdir -p config/jwt
if [ -n "${JWT_PRIVATE_KEY_BASE64:-}" ] && [ -n "${JWT_PUBLIC_KEY_BASE64:-}" ]; then
    printf '%s' "$JWT_PRIVATE_KEY_BASE64" | base64 -d > config/jwt/private.pem
    printf '%s' "$JWT_PUBLIC_KEY_BASE64" | base64 -d > config/jwt/public.pem
elif [ ! -s config/jwt/private.pem ] || [ ! -s config/jwt/public.pem ]; then
    echo "ERROR: JWT_PRIVATE_KEY_BASE64 and JWT_PUBLIC_KEY_BASE64 are required."
    exit 1
fi

# PHP-FPM signs access tokens as www-data. Keep the private key restricted to
# that runtime user instead of leaving it readable only by root.
chown www-data:www-data config/jwt/private.pem config/jwt/public.pem
chmod 600 config/jwt/private.pem
chmod 644 config/jwt/public.pem

# /app/var/uploads may be backed by a Render persistent disk.
mkdir -p var/cache var/log var/uploads/media
chown -R www-data:www-data var/

php bin/console cache:clear --env=prod --no-debug
php bin/console cache:warmup --env=prod --no-debug

# Cache generation runs as root in the container. Restore runtime ownership
# before PHP-FPM starts so VichUploader can update its metadata cache.
mkdir -p var/cache/prod/vich_uploader var/log var/uploads/media
chown -R www-data:www-data var/cache var/log var/uploads
chmod -R 775 var/cache var/log var/uploads

echo "==> Running database migrations..."
migration_attempt=1
until php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration --env=prod; do
    if [ "$migration_attempt" -ge 5 ]; then
        echo "ERROR: Database migrations failed after ${migration_attempt} attempts."
        exit 1
    fi

    migration_attempt=$((migration_attempt + 1))
    echo "Database unavailable, retrying in 5 seconds (${migration_attempt}/5)..."
    sleep 5
done

echo "==> Starting PHP-FPM and Nginx..."
"$@" &
server_pid=$!

stop_server() {
    kill -TERM "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
}

trap stop_server INT TERM

# Make the HTTP port available to Render before the potentially long initial
# catalogue import. The import remains blocking for this entrypoint: if it
# fails, the web server is stopped and the deployment fails.
sleep 1
if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "ERROR: Web services stopped before becoming ready."
    wait "$server_pid"
    exit 1
fi

if [ "${BOOTSTRAP_REFERENCE_DATA:-1}" = "1" ]; then
    echo "==> Loading versioned medical reference data..."
    if ! php bin/console app:bootstrap-reference-data \
        --no-interaction \
        --catalog-version="${REFERENCE_DATA_VERSION:-2026-08-07.1}"; then
        echo "ERROR: Reference data bootstrap failed."
        stop_server
        exit 1
    fi
else
    echo "==> Reference data bootstrap disabled."
fi

echo "==> Ready. Reference data is available."
wait "$server_pid"
