# 🚀 DEPLOY LIBROS-IA — Guía paso a paso

> **Objetivo:** Tener `libros.iconicospace.com` aceptando pagos reales HOY.  
> **Tiempo estimado:** 30-45 minutos.  
> **Requisitos:** Acceso SSH al servidor + API keys.

---

## 0. Pre-requisitos (cosas que necesitas tener)

| Servicio         | Qué necesitas                      | Dónde conseguirlo                                 |
| ---------------- | ---------------------------------- | ------------------------------------------------- |
| **SSH**          | Clave `editorial-prod.pem`         | Tu carpeta de keys                                |
| **OpenAI**       | API Key (`sk-...`)                 | https://platform.openai.com/api-keys              |
| **Google OAuth** | Client ID + Secret                 | https://console.cloud.google.com/apis/credentials |
| **Stripe**       | Live keys (`sk_live_`, `pk_live_`) | https://dashboard.stripe.com/apikeys              |
| **Resend**       | API Key                            | https://resend.com/api-keys                       |
| **Hetzner S3**   | Access Key + Secret                | Tu panel de Hetzner                               |

---

## 1. Conectar al servidor

```bash
ssh -i /ruta/a/editorial-prod.pem ubuntu@18.171.181.210
cd ~/editorial
```

---

## 2. Pull del código actualizado

```bash
git pull origin main
```

Si no tienes git configurado, sube los archivos manualmente:

```bash
# Desde tu máquina local:
scp -i /ruta/a/editorial-prod.pem docker-compose.server.yml ubuntu@18.171.181.210:~/editorial/
scp -i /ruta/a/editorial-prod.pem Caddyfile ubuntu@18.171.181.210:~/editorial/
scp -i /ruta/a/editorial-prod.pem -r libros-infantiles-ia/ ubuntu@18.171.181.210:~/editorial/libros-infantiles-ia/
```

---

## 3. Configurar variables de entorno

```bash
cp libros-infantiles-ia/.env.production libros-infantiles-ia/.env
nano libros-infantiles-ia/.env
```

**Rellena TODOS los `CHANGE_ME`:**

```env
# Genera un secret aleatorio:
# openssl rand -base64 32
NEXTAUTH_SECRET="pega_aqui_el_resultado"

# Tu API key de OpenAI
OPENAI_API_KEY="sk-..."

# Google OAuth (redirect URI: https://libros.iconicospace.com/api/auth/callback/google)
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."

# Resend
RESEND_API_KEY="re_..."

# Stripe LIVE keys (⚠️ NO uses test keys si quieres cobrar de verdad)
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."  # Se crea en el paso 5

# Hetzner S3
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
```

Guarda: `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 4. Levantar contenedores

```bash
# Construir e iniciar la base de datos + la app
docker compose -f docker-compose.server.yml up -d --build libros-db libros-ia

# Verificar que están corriendo
docker ps | grep libros

# Ver logs en tiempo real
docker logs -f libros-ia
```

**Espera a ver:**

```
▲ Next.js XX.X.X
- Local: http://localhost:3000
✓ Ready in XXXms
```

Si ves errores de `CHANGE_ME`, revisa el `.env`.

---

## 5. Registrar Stripe Webhook

1. Ve a https://dashboard.stripe.com/webhooks
2. Click **"+ Add endpoint"**
3. **Endpoint URL:** `https://libros.iconicospace.com/api/stripe/webhook`
4. **Eventos:** selecciona:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. Click **"Add endpoint"**
6. Copia el **Signing secret** (`whsec_...`)
7. Actualiza el `.env`:

```bash
nano libros-infantiles-ia/.env
# Pega el STRIPE_WEBHOOK_SECRET="whsec_..."
```

8. Reinicia la app:

```bash
docker compose -f docker-compose.server.yml up -d --build libros-ia
```

---

## 6. Recargar Caddy (proxy)

```bash
# El Caddyfile ahora apunta a libros-ia:3000 (contenedor Docker)
docker restart editorial-proxy
```

---

## 7. Configurar Google OAuth (si no lo has hecho)

1. Ve a https://console.cloud.google.com/apis/credentials
2. Crea o edita una credencial OAuth 2.0
3. **Authorized redirect URIs:** añade:
   ```
   https://libros.iconicospace.com/api/auth/callback/google
   ```
4. Guarda

---

## 8. Configurar Resend (dominio)

1. Ve a https://resend.com/domains
2. Añade `libros.iconicospace.com` (o usa `iconicospace.com` si ya está verificado)
3. Configura los registros DNS (SPF, DKIM, DMARC) si no los tienes

---

## 9. Verificar que todo funciona

### Health check:

```bash
curl -s https://libros.iconicospace.com/api/health | python3 -m json.tool
```

Debería responder `{"status": "ok", ...}`.

### Verificar landing:

```bash
curl -s -o /dev/null -w "%{http_code}" https://libros.iconicospace.com
# Debe dar 200
```

### Verificar páginas legales:

```bash
curl -s -o /dev/null -w "%{http_code}" https://libros.iconicospace.com/privacidad
curl -s -o /dev/null -w "%{http_code}" https://libros.iconicospace.com/terminos
curl -s -o /dev/null -w "%{http_code}" https://libros.iconicospace.com/legal
```

### Verificar SEO:

```bash
curl -s https://libros.iconicospace.com/robots.txt
curl -s https://libros.iconicospace.com/sitemap.xml
```

---

## 10. Test de compra real

1. Abre https://libros.iconicospace.com en el navegador
2. Haz login con Google
3. Ve a la sección de precios
4. Compra el pack de **5 créditos (€4.99)** con tu tarjeta real
5. Verifica:
   - [ ] Stripe Checkout se abre correctamente
   - [ ] Tras pagar, vuelves a la app
   - [ ] Los créditos aparecen en tu perfil
   - [ ] En Stripe Dashboard aparece el pago completado
6. Genera un libro de prueba y descarga el PDF
7. ¡Listo para vender! 🎉

---

## Troubleshooting

### Error 502 Bad Gateway

```bash
docker logs libros-ia --tail 50  # Ver qué falla
docker compose -f docker-compose.server.yml up -d --build libros-ia  # Rebuild
docker restart editorial-proxy  # Recargar proxy
```

### "Database not ready"

```bash
docker logs libros-db --tail 20
docker compose -f docker-compose.server.yml up -d libros-db
# Espera 10s, luego:
docker compose -f docker-compose.server.yml up -d libros-ia
```

### Webhook no funciona

```bash
# Verifica que Stripe puede alcanzar tu endpoint:
curl -X POST https://libros.iconicospace.com/api/stripe/webhook
# Debería dar un error de firma (400), NO un 502/404
```

### Migraciones Prisma

```bash
# Las migraciones se ejecutan automáticamente en docker-entrypoint.sh
# Si necesitas forzar:
docker exec -it libros-ia npx prisma migrate deploy
```

---

## Checklist final

- [ ] `docker ps` muestra `libros-db` y `libros-ia` corriendo
- [ ] `curl https://libros.iconicospace.com` → 200
- [ ] `curl https://libros.iconicospace.com/api/health` → `{"status": "ok"}`
- [ ] Login con Google funciona
- [ ] Compra de créditos completada con tarjeta real
- [ ] Créditos asignados correctamente tras pago
- [ ] Generación de libro funciona (texto + imágenes)
- [ ] PDF descargable
- [ ] Páginas legales accesibles (privacidad, términos, cookies, legal, desistimiento)
- [ ] Stripe webhook recibiendo eventos (verificar en Stripe Dashboard > Webhooks > Recent events)
- [ ] `robots.txt` y `sitemap.xml` accesibles

---

## ¿Qué sigue después?

1. **Configurar Google Search Console** → Enviar sitemap
2. **Primer post en redes** → Screenshot de la landing + link
3. **Brutal Landing Sprint** → Ofrecer landings a 3 conocidos como servicio
4. **Monitorear** → Revisar Stripe Dashboard diariamente la primera semana
