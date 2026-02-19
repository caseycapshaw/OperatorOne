#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit push --force 2>&1 || echo "Warning: migrations failed, DB may not be ready yet"

echo "Starting application..."
exec "$@"
