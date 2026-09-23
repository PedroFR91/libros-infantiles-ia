#!/bin/sh
set -e

# Prisma CLI instalado en el stage prisma-cli del Dockerfile (con todas sus dependencias)
PRISMA="node /opt/prisma-cli/node_modules/prisma/build/index.js"

echo "🔄 Running database migrations..."

if OUT=$($PRISMA migrate deploy 2>&1); then
  echo "$OUT"
else
  echo "$OUT"
  # P3005 = la base de datos ya tiene tablas pero ningún historial de migraciones
  # (se creó con `db push` antes de existir prisma/migrations). Baseline automático:
  #   1) sincronizar el esquema actual sin borrar datos (db push falla si habría pérdida)
  #   2) marcar la migración 0_init como aplicada
  if echo "$OUT" | grep -q "P3005"; then
    echo "⚠️  DB existente sin historial de migraciones → baseline automático"
    $PRISMA db push --skip-generate
    $PRISMA migrate resolve --applied 0_init
  else
    echo "❌ Migration failed"
    exit 1
  fi
fi

echo "✅ Migrations complete. Starting app..."
exec "$@"
