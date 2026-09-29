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
