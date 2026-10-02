# DEPLOY LIBROS-IA — Hetzner

> **Objetivo:** `libros.iconicospace.com` cobrando con tarjeta real.
> **Servidor:** Hetzner CPX32 `libros-infantiles-PDF` · `204.168.194.92` · Helsinki.
> **Estado 2026-09-28:** el DNS sigue apuntando al AWS antiguo (`18.171.181.210`), que sirve un
> build de abril. La imagen nueva ya está en GHCR; el deploy falló solo por falta de secrets.

La app corre en `/opt/libros` con tres contenedores (`deploy/hetzner/docker-compose.yml`):
Postgres, la app (imagen de GHCR) y Caddy (HTTPS automático). PDFs e imágenes van a volúmenes
Docker, así que **S3 es opcional**.

---

## 1. Preparar el servidor (una vez, ~10 min)

Desde la raíz de este repo:

```bash
scp -r deploy/hetzner root@204.168.194.92:/root/libros-bootstrap
ssh root@204.168.194.92 sh /root/libros-bootstrap/bootstrap.sh
```

Instala Docker, abre 80/443 en ufw, copia compose + Caddyfile a `/opt/libros`, genera
`.env` con `DB_PASSWORD`, `NEXTAUTH_SECRET` y `CRON_SECRET` aleatorios y programa el cron
de libros atascados.

## 2. Rellenar `/opt/libros/.env`

```bash
ssh root@204.168.194.92 nano /opt/libros/.env
```

| Variable | Dónde |
|---|---|
| `OPENAI_API_KEY` | platform.openai.com/api-keys — pon un límite de gasto mensual |
| `GOOGLE_CLIENT_ID/SECRET` | console.cloud.google.com → Credentials. Redirect: `https://libros.iconicospace.com/api/auth/callback/google` |
| `RESEND_API_KEY` | resend.com — dominio `iconicospace.com` verificado (registros DNS en GoDaddy) |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | dashboard.stripe.com/apikeys — **live** |
| `STRIPE_WEBHOOK_SECRET` | paso 5 |

## 3. DNS en GoDaddy

`account.godaddy.com` → iconicospace.com → DNS → registro **A** `libros` → `204.168.194.92`
(TTL 600). Comprobar: `nslookup libros.iconicospace.com 1.1.1.1`.

Caddy pide el certificado en cuanto el DNS resuelve al Hetzner.

## 4. Secrets de GitHub y primer deploy

En github.com/PedroFR91/libros-infantiles-ia → Settings → Secrets → Actions:

| Secret | Valor |
|---|---|
| `SERVER_HOST` | `204.168.194.92` |
| `SERVER_USER` | `root` |
| `SERVER_SSH_KEY` | clave privada cuya pública esté en `/root/.ssh/authorized_keys` del Hetzner |

Después: `git push` (o Actions → Build & Deploy → Run workflow). El job hace login en GHCR con
el token del propio workflow, `docker compose pull && up -d` y espera `"healthy"` en `/api/health`.

## 5. Webhook de Stripe

dashboard.stripe.com/webhooks → Add endpoint:

- URL: `https://libros.iconicospace.com/api/stripe/webhook`
- Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`

Copia el `whsec_...` al `.env` y aplica: `cd /opt/libros && docker compose up -d`.

## 6. Verificar

```bash
curl -s https://libros.iconicospace.com/api/health      # {"status":"healthy",...}
curl -s -X POST https://libros.iconicospace.com/api/stripe/webhook -o /dev/null -w "%{http_code}"  # 400 (firma), no 404/502
```

Compra real: login con Google → pack de 4,99 € con tu tarjeta → créditos en el perfil →
generar un libro → descargar PDF → reembolsar desde Stripe si quieres.

## Troubleshooting

```bash
cd /opt/libros
docker compose ps
docker compose logs --tail 50 libros-ia    # errores de env o migraciones
docker compose logs --tail 50 caddy        # certificado HTTPS (¿DNS apunta aquí?)
```

Las migraciones Prisma corren solas en `docker-entrypoint.sh` al arrancar.

Cuando el Hetzner funcione, apagar la app del AWS antiguo para no pagar dos servidores.

---

## Despliegue en el AWS actual (`18.171.181.210`, mientras no se migra a Hetzner)

En el AWS, libros vive en el compose compartido `~/editorial/docker-compose.yml` (servicio `libros-ia`), que hoy **construye desde el código de enero**. Hay que pasarlo a la imagen de GHCR (pública) y darle volúmenes: sin ellos, las imágenes y los PDFs se pierden cada vez que se recrea el contenedor.

> ⚠️ En ese proyecto **nunca** uses `--remove-orphans`: los "huérfanos" son los contenedores de editorial, definidos en `docker-compose.prod.yml`.

```bash
ssh -i ~/.ssh/iconicospace/editorial-prod.pem ubuntu@18.171.181.210
cd ~/editorial
TS=$(date +%Y%m%d-%H%M%S)

# 1. Copias: BD de libros, compose e imágenes ya generadas dentro del contenedor
(cd /tmp && sudo -u postgres pg_dump -Fc librosinfantiles_prod) > ~/backups/libros-$TS.dump
cp -p docker-compose.yml docker-compose.yml.bak-libros-$TS
docker cp libros-ia:/app/public/images/books ~/backups/libros-images-$TS

# 2. Compose: en el servicio libros-ia, sustituir
#      build:
#        context: ./libros-infantiles-ia
#    por
#      image: ghcr.io/pedrofr91/libros-infantiles-ia:latest
#      volumes:
#        - libros_storage:/app/storage
#        - libros_images:/app/public/images/books
#    y añadir `libros_storage:` y `libros_images:` en el bloque `volumes:` final.
nano docker-compose.yml
docker compose -f docker-compose.yml config -q && echo OK

# 3. Variables nuevas en libros-infantiles-ia/.env (ver .env.example):
#    LEGAL_OWNER_NAME, LEGAL_TAX_ID, LEGAL_ADDRESS, ADMIN_EMAIL, CRON_SECRET,
#    ANALYTICS_* (opcional), STORY_MODEL/IMAGE_MODEL (opcional), PRINT_* (opcional)
nano libros-infantiles-ia/.env

# 4. Descargar y recrear SOLO libros (aplica las migraciones 1 y 2 al arrancar)
docker compose -f docker-compose.yml pull libros-ia
docker compose -f docker-compose.yml up -d --no-deps libros-ia
docker logs --tail 30 libros-ia

# 5. Devolver las imágenes antiguas al volumen
docker cp ~/backups/libros-images-$TS/. libros-ia:/app/public/images/books/

# 6. Cron de mantenimiento (libros atascados + recordatorios de borrador), cada 10 min
( crontab -l 2>/dev/null | grep -v fix-stuck-books; echo "*/10 * * * * curl -fsS -H \"Authorization: Bearer <CRON_SECRET>\" https://libros.iconicospace.com/api/cron/fix-stuck-books >/dev/null 2>&1" ) | crontab -
```

**Volver atrás:** `cp docker-compose.yml.bak-libros-<TS> docker-compose.yml && docker compose -f docker-compose.yml up -d --no-deps libros-ia` (la BD se restaura con `pg_restore` desde `~/backups/libros-<TS>.dump` si hiciera falta).

**Comprobar:** `curl -s https://libros.iconicospace.com/api/health` → `"healthy"`; crear un libro de prueba (historia + portada de muestra), pagar con `4242 4242 4242 4242` y el código `LANZAMIENTO`, ver cómo aparecen las páginas, descargar los dos PDF, y pedir el impreso para ver llegar el email de aviso y el pedido en el panel de admin.
