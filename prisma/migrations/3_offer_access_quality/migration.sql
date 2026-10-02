-- Oferta nueva (pack impreso + PDF, copias extra, aprobación antes de imprimir),
-- enlace privado del libro, género, dibujos gratis y emails de venta.
-- Idempotente (BDs creadas con `db push` + baseline automático).

ALTER TYPE "PrintOrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_APPROVAL';

ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "freeRedraws" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "leadPreviewSentAt" TIMESTAMP(3);
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "printOfferSentAt" TIMESTAMP(3);
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "reviewRequestSentAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Book_accessToken_key" ON "Book"("accessToken");

ALTER TABLE "PrintOrder" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'upgrade';
ALTER TABLE "PrintOrder" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PrintOrder" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

-- Libros ya terminados antes de existir unlockedAt: se consideran desbloqueados
-- (la purga de borradores y la portada limpia dependen de este campo)
UPDATE "Book" SET "unlockedAt" = "updatedAt" WHERE "status" = 'COMPLETED' AND "unlockedAt" IS NULL;
