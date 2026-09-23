# STATUS — libros-infantiles-ia

| Campo | Valor |
|---|---|
| **Horizonte / Gate** | H1 · pre-G0 |
| **€/mes actual** | 0 |
| **Última venta** | nunca |
| **Próxima acción única** | Secrets en GitHub (`SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`) + `.env` real en el servidor → primer deploy vía Actions → compra de prueba de 4,99 € |
| **Bloqueos para G0** | 1) Secrets GitHub + `.env` del servidor (todo CHANGE_ME en local) · 2) Verificar `/api/health` tras el deploy (DB ok, storage `s3`) · 3) Compra real de prueba |
| **Distancia al cobro** | ~2-3 h de trabajo manual (ver DEPLOY-LIBROS-IA.md) |
| **Evidencia (auditoría 2026-09-23)** | Build y typecheck OK. Producción servía un build anterior al 2026-04-11 (sin páginas legales ni `/api/health`) porque el workflow de Actions nunca se había commiteado. Corregido en repo: workflow versionado, migración baseline Prisma con auto-baseline en el entrypoint, directorios escribibles en el contenedor (PDFs/imágenes), devolución de créditos si falla la generación, webhook Stripe idempotente, cron protegido, tope diario en análisis de fotos. S3 SÍ estaba implementado (el STATUS anterior era erróneo). |
