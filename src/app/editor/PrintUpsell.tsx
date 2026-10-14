"use client";

import { useState } from "react";
import { BookOpen, Loader2, Minus, Plus, Truck } from "lucide-react";
import {
  EXTRA_COPY,
  PRINT_PRODUCT,
  SHIPPING_SURCHARGE,
  formatEuros,
  shippingZone,
} from "@/lib/pricing";
import { CheckoutPrices } from "./types";

// Mejora al libro físico justo después del PDF: es el momento en que la
// familia ya ha visto su cuento terminado. La dirección se pide aquí (no en
// Stripe) para validar la zona y sumar el suplemento de Baleares antes de pagar.

export interface PrintShipping {
  name: string;
  phone: string;
  line1: string;
  postalCode: string;
  city: string;
}

interface PrintUpsellProps {
  prices: CheckoutPrices | null;
  ordering: boolean;
  onOrder: (extraCopies: number, shipping: PrintShipping) => void;
}

const EMPTY: PrintShipping = { name: "", phone: "", line1: "", postalCode: "", city: "" };

export default function PrintUpsell({ prices, ordering, onOrder }: PrintUpsellProps) {
  const [open, setOpen] = useState(false);
  const [extraCopies, setExtraCopies] = useState(0);
  const [shipping, setShipping] = useState<PrintShipping>(EMPTY);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printPrice = prices?.print.price ?? PRINT_PRODUCT.price;
  const copyPrice = prices?.extraCopy.price ?? EXTRA_COPY.price;
  const zone = shipping.postalCode.length === 5 ? shippingZone(shipping.postalCode) : null;
  const surcharge = zone === "baleares" ? SHIPPING_SURCHARGE.baleares : 0;
  const total = printPrice + extraCopies * copyPrice + surcharge;

  const set = (field: keyof PrintShipping) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setShipping({ ...shipping, [field]: e.target.value });
    setError(null);
  };

  const submit = () => {
    const clean: PrintShipping = {
      name: shipping.name.trim(),
      phone: shipping.phone.replace(/\s+/g, ""),
      line1: shipping.line1.trim(),
      postalCode: shipping.postalCode.trim(),
      city: shipping.city.trim(),
    };
    if (!clean.name.includes(" ")) return setError("Escribe nombre y apellidos de quien lo recibe.");
    if (!/^(\+34)?[6789]\d{8}$/.test(clean.phone)) return setError("Escribe un teléfono válido (9 cifras) para la mensajería.");
    if (clean.line1.length < 5) return setError("Escribe la dirección completa: calle, número, piso y puerta.");
    const z = shippingZone(clean.postalCode);
    if (z === "invalid") return setError("Escribe un código postal español de 5 cifras.");
    if (z === "unavailable") return setError("De momento enviamos a la Península y Baleares. Muy pronto, también a Canarias, Ceuta y Melilla.");
    if (clean.city.length < 2) return setError("Escribe la localidad.");
    if (!accepted) return setError("Marca la casilla para continuar.");
    onOrder(extraCopies, clean);
  };

  if (!open) {
    return (
      <>
        <p className='font-bold flex items-center gap-2'>
          <BookOpen className='w-5 h-5 text-primary' /> ¿Quieres tenerlo también en tus manos?
        </p>
        <p className='text-sm text-text-muted mt-1'>
          Recíbelo impreso en casa por solo {formatEuros(printPrice)} más: {PRINT_PRODUCT.format}, envío
          incluido a la Península.
        </p>
        <button
          onClick={() => setOpen(true)}
          className='w-full mt-3 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold'>
          Añadir libro físico por +{formatEuros(printPrice)}
        </button>
      </>
    );
  }

  const input =
    "w-full px-3 py-2.5 rounded-xl bg-bg-light border border-border-strong outline-none focus:border-primary text-sm";

  return (
    <>
      <p className='font-bold flex items-center gap-2'>
        <Truck className='w-5 h-5 text-primary' /> ¿A dónde te lo enviamos?
      </p>
      <div className='grid gap-2 mt-2'>
        <input aria-label='Nombre y apellidos' autoComplete='name' placeholder='Nombre y apellidos' value={shipping.name} onChange={set("name")} className={input} />
        <input aria-label='Teléfono' autoComplete='tel' inputMode='tel' placeholder='Teléfono (para la mensajería)' value={shipping.phone} onChange={set("phone")} className={input} />
        <input aria-label='Dirección' autoComplete='street-address' placeholder='Calle, número, piso y puerta' value={shipping.line1} onChange={set("line1")} className={input} />
        <div className='grid grid-cols-[7rem_1fr] gap-2'>
          <input aria-label='Código postal' autoComplete='postal-code' inputMode='numeric' maxLength={5} placeholder='C. postal' value={shipping.postalCode} onChange={set("postalCode")} className={input} />
          <input aria-label='Localidad' autoComplete='address-level2' placeholder='Localidad' value={shipping.city} onChange={set("city")} className={input} />
        </div>
      </div>
      {zone === "baleares" && (
        <p className='text-xs text-text-muted mt-1.5'>
          Suplemento de envío a Baleares: +{formatEuros(SHIPPING_SURCHARGE.baleares)}
        </p>
      )}

      <div className='flex items-center justify-between gap-2 mt-3 text-sm'>
        <span>Copias extra para la familia (+{formatEuros(copyPrice)})</span>
        <div className='flex items-center gap-2'>
          <StepButton label='Quitar una copia' disabled={extraCopies === 0} onClick={() => setExtraCopies(extraCopies - 1)}>
            <Minus className='w-4 h-4' />
          </StepButton>
          <span className='w-4 text-center font-bold'>{extraCopies}</span>
          <StepButton label='Añadir una copia' disabled={extraCopies >= EXTRA_COPY.max} onClick={() => setExtraCopies(extraCopies + 1)}>
            <Plus className='w-4 h-4' />
          </StepButton>
        </div>
      </div>

      <label className='flex items-start gap-2 mt-2 min-h-[44px] p-1.5 -mx-1.5 rounded-lg text-xs cursor-pointer'>
        <input
          type='checkbox'
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked);
            setError(null);
          }}
          className='mt-0.5 w-4 h-4 accent-primary flex-shrink-0'
        />
        <span>
          He revisado el cuento y acepto que, al ser personalizado, no tiene
          desistimiento (si llega con un defecto de impresión, lo reponemos).
        </span>
      </label>

      {error && (
        <p role='alert' className='text-sm text-primary font-semibold mt-1'>
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={ordering}
        className='w-full mt-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60'>
        {ordering ? <Loader2 className='w-5 h-5 animate-spin' /> : <>Pagar {formatEuros(total)}</>}
      </button>
      <p className='text-xs text-text-muted text-center mt-1.5'>
        Llega en {PRINT_PRODUCT.deliveryDays.min}-{PRINT_PRODUCT.deliveryDays.max} días laborables · pago seguro con Stripe
      </p>
    </>
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
      onClick={onClick}
      className='w-9 h-9 rounded-full border-2 border-border-strong flex items-center justify-center disabled:opacity-30'>
      {children}
    </button>
  );
}
