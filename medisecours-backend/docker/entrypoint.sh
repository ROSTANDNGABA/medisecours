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
    chmod 600 config/jwt/private.pem
    chmod 644 config/jwt/public.pem
elif [ ! -s config/jwt/private.pem ] || [ ! -s config/jwt/public.pem ]; then
    echo "ERROR: JWT_PRIVATE_KEY_BASE64 and JWT_PUBLIC_KEY_BASE64 are required."
    exit 1
fi

# /app/var/uploads may be backed by a Render persistent disk.
mkdir -p var/cache var/log var/uploads/media
chown -R www-data:www-data var/

php bin/console cache:clear --env=prod --no-debug
php bin/console cache:warmup --env=prod --no-debug

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

echo "==> Ready. Starting services..."
exec "$@"
