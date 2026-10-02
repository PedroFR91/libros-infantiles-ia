-- Motor de historias v2, portada de muestra, emails y pedidos impresos.
-- Idempotente: las BDs creadas con `db push` pueden tener ya estos objetos tras el baseline automático.

ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "ageRange" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "companion" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "bible" JSONB;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "dedication" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "coverPreviewUrl" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "unlockedAt" TIMESTAMP(3);
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "leadEmail" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "readyEmailSentAt" TIMESTAMP(3);
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "showcase" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Book_status_idx" ON "Book"("status");

ALTER TABLE "BookPage" ADD COLUMN IF NOT EXISTS "scene" JSONB;

DO $$ BEGIN
  CREATE TYPE "PrintOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PrintOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" "PrintOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "email" TEXT,
    "shippingName" TEXT,
    "shippingPhone" TEXT,
    "shippingAddress" JSONB,
    "provider" TEXT,
    "providerOrderId" TEXT,
    "trackingUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrintOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PrintOrder_stripeSessionId_key" ON "PrintOrder"("stripeSessionId");
CREATE INDEX IF NOT EXISTS "PrintOrder_userId_idx" ON "PrintOrder"("userId");
CREATE INDEX IF NOT EXISTS "PrintOrder_status_idx" ON "PrintOrder"("status");

DO $$ BEGIN
  ALTER TABLE "PrintOrder" ADD CONSTRAINT "PrintOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PrintOrder" ADD CONSTRAINT "PrintOrder_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
