#!/usr/bin/env bash
# Vercel build entrypoint.
# Only production deploys run database migrations. Preview deploys skip them:
# they should never migrate the database, and the Preview environment does not
# have the direct (non-pooled) connection Prisma migrate needs.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "[build] production: running prisma migrate deploy"
  npx prisma migrate deploy
else
  echo "[build] ${VERCEL_ENV:-local}: skipping prisma migrate deploy"
fi

npx prisma generate
npx next build
