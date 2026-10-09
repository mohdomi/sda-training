#!/bin/sh
# Boot sequence: wait for Postgres, run idempotent migrations, start API.
set -e

echo "capstone backend booting (NODE_ENV=${NODE_ENV}, DB_ADAPTER=${DB_ADAPTER})"

if [ -n "$POSTGRES_URL" ]; then
  echo "waiting for postgres..."
  for i in $(seq 1 30); do
    if node -e "
      import('pg').then(async ({default: pg}) => {
        const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URL, connectionTimeoutMillis: 2000 });
        await pool.query('SELECT 1');
        await pool.end();
      }).catch(() => process.exit(1));
    "; then
      echo "postgres reachable"
      break
    fi
    if [ "$i" = "30" ]; then
      echo "postgres never became ready, continuing anyway (migrate will surface the error)"
      break
    fi
    sleep 2
  done

  echo "running migrations..."
  npm run migrate
else
  echo "POSTGRES_URL not set, skipping migrate"
fi

echo "starting server..."
exec node src/server.js
