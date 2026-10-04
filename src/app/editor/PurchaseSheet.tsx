"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Gift, Loader2, Lock, Minus, Plus, ShieldCheck, X } from "lucide-react";
import {
  GUARANTEE_TEXT,
  EXTRA_COPY,
  PRINT_COMING_SOON_TEXT,
  PRINT_ENABLED,
  PRINT_PRODUCT,
  formatEuros,
} from "@/lib/pricing";
import { CheckoutPrices, PurchaseProduct } from "./types";

// Hoja de compra: dos opciones claras (el regalo impreso y el PDF), un único
// botón de pago siempre activo y la aceptación legal en una fila grande.

interface PurchaseSheetProps {
  open: boolean;
  onClose: () => void;
  kidName: string;
  prices: CheckoutPrices | null;
  hasPurchased: boolean;
  initialProduct?: PurchaseProduct;
  paying: boolean;
  onPay: (product: PurchaseProduct, extraCopies: number) => void;
}

export default function PurchaseSheet({
  open,
  onClose,
  kidName,
  prices,
  hasPurchased,
  initialProduct = "bundle",
  paying,
  onPay,
}: PurchaseSheetProps) {
  const digitalProduct: PurchaseProduct = hasPurchased ? "repeat" : "digital";
  // Se remonta (key) cada vez que se abre, así parte de la opción elegida
  const [product, setProduct] = useState<PurchaseProduct>(
    initialProduct === "bundle" && PRINT_ENABLED ? "bundle" : digitalProduct,
  );
  const [extraCopies, setExtraCopies] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [needsAccept, setNeedsAccept] = useState(false);

  const digital = prices ? (hasPurchased ? prices.repeat : prices.digital) : null;
  const total = prices
    ? product === "bundle"
      ? prices.bundle.price + extraCopies * prices.extraCopy.price
      : digital!.price
    : 0;

  const pay = () => {
    if (!accepted) {
      setNeedsAccept(true);
      return;
    }
    onPay(product, product === "bundle" ? extraCopies : 0);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4'
          onClick={onClose}>
          <motion.div
            role='dialog'
            aria-modal='true'
            aria-labelledby='purchase-title'
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className='w-full sm:max-w-lg max-h-[92vh] bg-bg rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden'>
            <div className='flex items-center justify-between px-5 pt-5 pb-3'>
              <h2 id='purchase-title' className='font-display text-2xl font-semibold'>
                ¿Cómo quieres el cuento de {kidName}?
              </h2>
              <button onClick={onClose} aria-label='Cerrar' className='p-2 -mr-2 rounded-xl hover:bg-bg-light'>
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='flex-1 overflow-y-auto px-5 pb-4 space-y-3'>
              {prices?.founder.active && prices.digital.discountLabel?.startsWith("Precio fundador") && (
                <p className='text-sm font-semibold text-primary bg-primary-soft rounded-xl px-3 py-2'>
                  Precio fundador ya aplicado · quedan{" "}
                  {prices.founder.remaining} pedidos a este precio
                </p>
              )}
              {prices?.campaign?.printDeadline && (
                <p className='text-sm text-text-muted'>{prices.campaign.printDeadline}</p>
              )}

              {/* Regalo: impreso + PDF */}
              {PRINT_ENABLED && (
              <OptionCard
                selected={product === "bundle"}
                onSelect={() => setProduct("bundle")}
                title='Cuento impreso + PDF'
                badge='Para regalar'
                price={prices?.bundle}>
                <ul className='text-sm text-text-muted space-y-1 mt-2'>
                  {prices?.campaign?.bonus?.onProduct === "bundle" && (
                    <li className='font-bold text-secondary'>🎁 {prices.campaign.bonus.label} ({prices.campaign.name})</li>
                  )}
                  <li>📦 Libro de 21×21 cm en casa en {PRINT_PRODUCT.deliveryDays.min}-{PRINT_PRODUCT.deliveryDays.max} días laborables, envío incluido</li>
                  <li>👀 Lo revisas y lo apruebas antes de imprimir</li>
                  <li>📄 El PDF, al momento</li>
                </ul>
                {product === "bundle" && prices && (
                  <div className='mt-3 flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-2'>
                    <span className='text-sm'>
                      Copias extra para abuelos o tíos
                      <span className='block text-text-muted'>+{prices.extraCopy.formatted} cada una</span>
                    </span>
                    <div className='flex items-center gap-2'>
                      <StepButton
                        label='Quitar una copia'
                        disabled={extraCopies === 0}
                        onClick={() => setExtraCopies(extraCopies - 1)}>
                        <Minus className='w-4 h-4' />
                      </StepButton>
                      <span className='w-5 text-center font-bold' aria-live='polite'>
                        {extraCopies}
                      </span>
                      <StepButton
                        label='Añadir una copia'
                        disabled={extraCopies >= EXTRA_COPY.max}
                        onClick={() => setExtraCopies(extraCopies + 1)}>
                        <Plus className='w-4 h-4' />
                      </StepButton>
                    </div>
                  </div>
                )}
              </OptionCard>
              )}

              {/* Solo PDF */}
              <OptionCard
                selected={product !== "bundle"}
                onSelect={() => setProduct(digitalProduct)}
                title={hasPurchased ? "Otro cuento en PDF" : PRINT_ENABLED ? "Solo el PDF" : "El cuento en PDF"}
                price={digital ?? undefined}>
                <p className='text-sm text-text-muted mt-2'>
                  {prices?.campaign?.bonus?.onProduct === "pdf" && (
                    <span className='block font-bold text-secondary mb-1'>
                      🎁 {prices.campaign.bonus.label} ({prices.campaign.name})
                    </span>
                  )}
                  Portada + 12 páginas ilustradas para leer en la tablet o imprimir
                  en casa.{PRINT_ENABLED ? " Puedes pasarlo a papel después." : ""}
                </p>
              </OptionCard>

              {!PRINT_ENABLED && (
                <p className='flex gap-2 text-sm text-text-muted'>
                  <Gift className='w-5 h-5 text-secondary flex-shrink-0' />
                  {PRINT_COMING_SOON_TEXT}
                </p>
              )}

              <p className='flex gap-2 text-sm text-text-muted'>
                <ShieldCheck className='w-5 h-5 text-success flex-shrink-0' />
                {GUARANTEE_TEXT}
              </p>
            </div>

            {/* Pie fijo: aceptación + pagar */}
            <div className='border-t border-border bg-bg-light px-5 pt-3 pb-5 space-y-3'>
              <label
                className={`flex items-start gap-3 min-h-[44px] p-2 -mx-2 rounded-xl cursor-pointer ${
                  needsAccept && !accepted ? "bg-primary-soft ring-2 ring-primary" : ""
                }`}>
                <input
                  type='checkbox'
                  checked={accepted}
                  onChange={(e) => {
                    setAccepted(e.target.checked);
                    setNeedsAccept(false);
                  }}
                  className='mt-0.5 w-5 h-5 accent-primary flex-shrink-0'
                />
                <span className='text-sm'>
                  Acepto los{" "}
                  <Link href='/terminos' target='_blank' className='underline'>
                    términos
                  </Link>{" "}
                  y que, al ser un cuento personalizado, no tiene desistimiento
                  (sí nuestra garantía).
                </span>
              </label>
              {needsAccept && !accepted && (
                <p role='alert' className='text-sm text-primary font-semibold'>
                  Marca la casilla para continuar.
                </p>
              )}
              <button
                onClick={pay}
                disabled={paying || !prices}
                className='w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60'>
                {paying ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  <>
                    <Lock className='w-5 h-5' />
                    Pagar {formatEuros(total)}
                  </>
                )}
              </button>
              <p className='text-xs text-text-muted text-center'>
                Pago seguro con Stripe · tarjeta, Apple Pay o Google Pay
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OptionCard({
  selected,
  onSelect,
  title,
  badge,
  price,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  badge?: string;
  price?: { formatted: string; discountLabel?: string | null };
  children: React.ReactNode;
}) {
  return (
    <div
      role='radio'
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={`rounded-2xl border-2 p-4 cursor-pointer transition-colors ${
        selected ? "border-primary bg-bg-light card-shadow" : "border-border bg-bg-light/60"
      }`}>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex items-start gap-3'>
          <span
            className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected ? "bg-primary border-primary" : "border-border-strong"
            }`}>
            {selected && <Check className='w-4 h-4 text-white' />}
          </span>
          <div>
            <p className='font-bold text-lg leading-tight'>{title}</p>
            {badge && (
              <span className='inline-flex items-center gap-1 mt-1 text-xs font-bold text-secondary'>
                <Gift className='w-3.5 h-3.5' /> {badge}
              </span>
            )}
          </div>
        </div>
        {price && (
          <div className='text-right'>
            <p className='font-bold text-xl whitespace-nowrap'>{price.formatted}</p>
            {/* Sin precio tachado (precio de referencia, art. 20 LCM) */}
            {price.discountLabel && (
              <p className='text-xs font-bold text-primary'>{price.discountLabel}</p>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className='w-9 h-9 rounded-full border-2 border-border-strong flex items-center justify-center disabled:opacity-30'>
      {children}
    </button>
  );
}
