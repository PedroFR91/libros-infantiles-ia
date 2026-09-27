#!/bin/sh
# Prepara el Hetzner limpio. Ejecutar como root, una sola vez:
#   scp -r deploy/hetzner root@204.168.194.92:/root/libros-bootstrap
#   ssh root@204.168.194.92 sh /root/libros-bootstrap/bootstrap.sh
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DIR=/opt/libros

if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443 && ufw --force enable
fi

mkdir -p "$DIR"
cp "$SRC/docker-compose.yml" "$SRC/Caddyfile" "$DIR/"

if [ ! -f "$DIR/.env" ]; then
  sed -e "s|__GEN_DB__|$(openssl rand -hex 24)|" \
      -e "s|__GEN_AUTH__|$(openssl rand -base64 32)|" \
      -e "s|__GEN_CRON__|$(openssl rand -hex 32)|" \
      "$SRC/env.template" > "$DIR/.env"
  chmod 600 "$DIR/.env"
  echo "📝 Creado $DIR/.env — rellena los CHANGE_ME: nano $DIR/.env"
else
  echo "ℹ️  $DIR/.env ya existe, no se toca"
fi

# Cron de libros atascados cada 10 min
CRON_LINE="*/10 * * * * . $DIR/.env && curl -fsS -H \"Authorization: Bearer \$CRON_SECRET\" https://libros.iconicospace.com/api/cron/fix-stuck-books >/dev/null 2>&1"
( crontab -l 2>/dev/null | grep -v fix-stuck-books; echo "$CRON_LINE" ) | crontab -

echo "✅ Listo. Siguientes pasos:"
echo "   1) nano $DIR/.env"
echo "   2) echo <PAT_read:packages> | docker login ghcr.io -u PedroFR91 --password-stdin   (si la imagen es privada)"
echo "   3) cd $DIR && docker compose up -d"
