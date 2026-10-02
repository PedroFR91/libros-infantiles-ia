-- Email que el comprador introduce en Stripe Checkout (las compras anónimas no lo tenían).
-- IF NOT EXISTS: las BDs creadas con `db push` pueden tener ya la columna tras el baseline automático.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
