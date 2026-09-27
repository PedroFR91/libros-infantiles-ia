# STATUS — libros-infantiles-ia

| Campo | Valor |
|---|---|
| **Horizonte / Gate** | H1 · pre-G0 |
| **€/mes actual** | 0 |
| **Última venta** | nunca |
| **Próxima acción única** | Ejecutar DEPLOY-LIBROS-IA.md en el Hetzner (204.168.194.92): bootstrap → `.env` → DNS `libros` en GoDaddy → secrets GitHub → compra de prueba de 4,99 € |
| **Bloqueos para G0** | 1) Servidor Hetzner sin preparar (solo SSH abierto) · 2) DNS aún en el AWS antiguo 18.171.181.210 (build de abril) · 3) Secrets GitHub ausentes (deploy del 23-sep falló por `missing server host`; la imagen SÍ está en GHCR) · 4) Claves live en `.env` · 5) Compra real de prueba |
| **Distancia al cobro** | ~2-3 h de trabajo manual (ver DEPLOY-LIBROS-IA.md) |
| **Evidencia (auditoría 2026-09-23)** | Build y typecheck OK. Producción servía un build anterior al 2026-04-11 (sin páginas legales ni `/api/health`) porque el workflow de Actions nunca se había commiteado. Corregido en repo: workflow versionado, migración baseline Prisma con auto-baseline en el entrypoint, directorios escribibles en el contenedor (PDFs/imágenes), devolución de créditos si falla la generación, webhook Stripe idempotente, cron protegido, tope diario en análisis de fotos. S3 SÍ estaba implementado (el STATUS anterior era erróneo). |

**2026-09-28:** kit de despliegue para Hetzner en `deploy/hetzner/` (compose con Postgres + app GHCR + Caddy, volúmenes locales → S3 opcional, bootstrap con secretos generados y cron). Workflow apunta a `/opt/libros` con login GHCR y health check corregido (`"healthy"`).
