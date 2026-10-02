# STATUS — libros-infantiles-ia

| Campo | Valor |
|---|---|
| **Horizonte / Gate** | H1 · pre-G0 |
| **€/mes actual** | 0 |
| **Última venta** | nunca |
| **Próxima acción única** | Commit + push del relanzamiento (Fases 0-3 de AUDITORIA-2026-10.md) → desplegar en el AWS con la sección «Despliegue en el AWS actual» de DEPLOY-LIBROS-IA.md → compra de prueba en TEST → claves LIVE → enviar a 10 conocidos |
| **Bloqueos para G0** | 1) Código del relanzamiento sin desplegar (en AWS corre la versión de enero) · 2) Datos fiscales (`LEGAL_*`) en el `.env` · 3) Claves y webhook LIVE · 4) Motor v2 sin probar con OpenAI real (`scripts/eval-engine.ts`) · 5) Muestra física del impreso antes de venderlo |
| **Distancia al cobro** | ~1-2 h de despliegue + prueba (el DNS ya apunta al AWS y la compra TEST funciona desde el 02/10) |
| **Evidencia (auditoría 2026-09-23)** | Build y typecheck OK. Producción servía un build anterior al 2026-04-11 (sin páginas legales ni `/api/health`) porque el workflow de Actions nunca se había commiteado. Corregido en repo: workflow versionado, migración baseline Prisma con auto-baseline en el entrypoint, directorios escribibles en el contenedor (PDFs/imágenes), devolución de créditos si falla la generación, webhook Stripe idempotente, cron protegido, tope diario en análisis de fotos. S3 SÍ estaba implementado (el STATUS anterior era erróneo). |

**2026-09-28:** kit de despliegue para Hetzner en `deploy/hetzner/` (compose con Postgres + app GHCR + Caddy, volúmenes locales → S3 opcional, bootstrap con secretos generados y cron). Workflow apunta a `/opt/libros` con login GHCR y health check corregido (`"healthy"`).

**2026-10-02:** relanzamiento en código (sin desplegar): embudo arreglado, precio por libro (9,90 €), motor de historias v2 (biblia, personajes y escenarios fijos, revisión de continuidad), portada de muestra gratis, generación en segundo plano con progreso real, emails, PDF nuevo con fuentes infantiles, archivos de imprenta, libro impreso (39,90 €, fase manual), 14 páginas SEO, panel de embudo y pedidos. Detalle y pendientes en AUDITORIA-2026-10.md.
