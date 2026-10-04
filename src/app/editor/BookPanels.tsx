"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Download,
  Gift,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  Wand2,
  X,
} from "lucide-react";
import {
  EXTRA_COPY,
  GUARANTEE_TEXT,
  PRINT_COMING_SOON_TEXT,
  PRINT_ENABLED,
  PRINT_PRODUCT,
  formatEuros,
} from "@/lib/pricing";
import { BookData, BookPage, CheckoutPrices } from "./types";

// Paneles de estado del libro, en la vista principal (no escondidos en el
// panel lateral): ilustrando, listo, barra de acción y acciones de página.

/** Páginas ya ilustradas (la portada de muestra no cuenta hasta pagar) */
export function illustratedCount(book: BookData): number {
  return book.pages.filter(
    (p) => p.imageUrl && (p.pageNumber !== 1 || !book.coverPreviewUrl || p.imageUrl !== book.coverPreviewUrl),
  ).length;
}

export function ProgressPanel({ book }: { book: BookData }) {
  const done = illustratedCount(book);
  const total = Math.max(book.pages.length, 1);
  return (
    <section
      aria-live='polite'
      className='mx-3 sm:mx-6 mt-3 p-4 rounded-2xl bg-bg-light border border-border card-shadow'>
      <div className='flex items-center gap-3 mb-3'>
        <Loader2 className='w-6 h-6 text-primary animate-spin flex-shrink-0' />
        <div>
          <p className='font-bold'>Ilustrando el cuento de {book.kidName}</p>
          <p className='text-sm text-text-muted'>
            {done} de {total} ilustraciones · unos 3-5 minutos
          </p>
        </div>
      </div>
      <div
        className='h-2.5 rounded-full bg-border overflow-hidden'
        role='progressbar'
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}>
        <div className='h-full bg-primary transition-all duration-700' style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <p className='text-sm text-text-muted mt-3'>
        Las páginas aparecen abajo según se terminan. Puedes cerrar la página: te
        hemos enviado el enlace a tu cuento por email.
      </p>
    </section>
  );
}

interface ResultPanelProps {
  book: BookData;
  prices: CheckoutPrices | null;
  downloading: "digital" | "print" | null;
  onDownload: (type: "digital" | "print") => void;
  orderingPrint: boolean;
  onOrderPrint: (extraCopies: number) => void;
  approving: boolean;
  onApprove: () => void;
  onNewBook: () => void;
}

export function ResultPanel({
  book,
  prices,
  downloading,
  onDownload,
  orderingPrint,
  onOrderPrint,
  approving,
  onApprove,
  onNewBook,
}: ResultPanelProps) {
  const order = book.printOrders?.[0];
  const cover = book.pages.find((p) => p.pageNumber === 1)?.imageUrl;
  const [extraCopies, setExtraCopies] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [needsAccept, setNeedsAccept] = useState(false);
  const printPrice = prices?.print.price ?? PRINT_PRODUCT.price;
  const copyPrice = prices?.extraCopy.price ?? EXTRA_COPY.price;

  return (
    <section className='mx-3 sm:mx-6 mt-3 p-4 sm:p-5 rounded-2xl bg-bg-light border border-border card-shadow'>
      <div className='flex items-center gap-4'>
        {cover && (
          <img src={cover} alt='' className='w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover book-shadow flex-shrink-0' />
        )}
        <div>
          <p className='flex items-center gap-1.5 text-success font-bold text-sm'>
            <CheckCircle className='w-4 h-4' /> ¡Listo!
          </p>
          <h2 className='font-display text-xl sm:text-2xl font-semibold leading-tight'>
            {book.title || `El cuento de ${book.kidName}`}
          </h2>
        </div>
      </div>

      <div className='grid sm:grid-cols-2 gap-3 mt-4'>
        {/* Descarga */}
        <div className='space-y-2'>
          <button
            onClick={() => onDownload("digital")}
            disabled={downloading !== null}
            className='w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60'>
            {downloading === "digital" ? <Loader2 className='w-5 h-5 animate-spin' /> : <Download className='w-5 h-5' />}
            Descargar PDF
          </button>
          <button
            onClick={() => onDownload("print")}
            disabled={downloading !== null}
            className='w-full py-2 text-sm text-secondary font-semibold underline underline-offset-4'>
            {downloading === "print" ? "Preparando…" : "PDF para imprimir en casa"}
          </button>
        </div>

        {/* Impreso */}
        <div className='rounded-2xl border-2 border-primary/40 bg-primary-soft/40 p-3'>
          {order?.status === "AWAITING_APPROVAL" ? (
            <>
              <p className='font-bold flex items-center gap-2'>
                <Package className='w-5 h-5 text-primary' /> Tu libro impreso está pagado
              </p>
              <p className='text-sm text-text-muted my-2'>
                Revisa las páginas (puedes cambiar frases o rehacer dibujos) y
                apruébalo: entonces lo mandamos a imprenta.
              </p>
              <button
                onClick={onApprove}
                disabled={approving}
                className='w-full py-3 rounded-xl bg-secondary hover:bg-secondary-hover text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60'>
                {approving ? <Loader2 className='w-5 h-5 animate-spin' /> : <CheckCircle className='w-5 h-5' />}
                Aprobar para imprimir
              </button>
            </>
          ) : order ? (
            <>
              <p className='font-bold flex items-center gap-2'>
                <Truck className='w-5 h-5 text-primary' />
                {order.status === "SHIPPED" || order.status === "DELIVERED" ? "Tu libro va de camino" : "Tu libro está en imprenta"}
              </p>
              <p className='text-sm text-text-muted mt-1'>
                {order.trackingUrl ? (
                  <a href={order.trackingUrl} target='_blank' rel='noreferrer' className='underline text-secondary'>
                    Seguir el envío
                  </a>
                ) : (
                  `Llega en ${PRINT_PRODUCT.deliveryDays.min}-${PRINT_PRODUCT.deliveryDays.max} días laborables. Te avisaremos por email.`
                )}
              </p>
            </>
          ) : !PRINT_ENABLED ? (
            <>
              <p className='font-bold flex items-center gap-2'>
                <Gift className='w-5 h-5 text-primary' /> Muy pronto, en papel
              </p>
              <p className='text-sm text-text-muted mt-1'>
                {PRINT_COMING_SOON_TEXT} Mientras tanto, el «PDF para imprimir en
                casa» queda muy bien en una copistería.
              </p>
            </>
          ) : (
            <>
              <p className='font-bold flex items-center gap-2'>
                <Gift className='w-5 h-5 text-primary' /> Tenlo en papel
              </p>
              <p className='text-sm text-text-muted mt-1'>
                21×21 cm, envío a casa incluido, en {PRINT_PRODUCT.deliveryDays.min}-
                {PRINT_PRODUCT.deliveryDays.max} días laborables.
              </p>
              <div className='flex items-center justify-between gap-2 mt-2 text-sm'>
                <span>Copias extra (+{formatEuros(copyPrice)})</span>
                <div className='flex items-center gap-2'>
                  <RoundButton label='Quitar una copia' disabled={extraCopies === 0} onClick={() => setExtraCopies(extraCopies - 1)}>
                    <Minus className='w-4 h-4' />
                  </RoundButton>
                  <span className='w-4 text-center font-bold'>{extraCopies}</span>
                  <RoundButton label='Añadir una copia' disabled={extraCopies >= EXTRA_COPY.max} onClick={() => setExtraCopies(extraCopies + 1)}>
                    <Plus className='w-4 h-4' />
                  </RoundButton>
                </div>
              </div>
              <label
                className={`flex items-start gap-2 mt-2 min-h-[44px] p-1.5 -mx-1.5 rounded-lg text-xs cursor-pointer ${
                  needsAccept && !accepted ? "ring-2 ring-primary bg-bg-light" : ""
                }`}>
                <input
                  type='checkbox'
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className='mt-0.5 w-4 h-4 accent-primary flex-shrink-0'
                />
                <span>
                  He revisado el cuento y acepto que, al ser personalizado, no
                  tiene desistimiento (si llega con un defecto de impresión, lo
                  reponemos).
                </span>
              </label>
              <button
                onClick={() => (accepted ? onOrderPrint(extraCopies) : setNeedsAccept(true))}
                disabled={orderingPrint}
                className='w-full mt-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60'>
                {orderingPrint ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  <>Pedirlo impreso · {formatEuros(printPrice + extraCopies * copyPrice)}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 text-sm'>
        <p className='flex gap-2 text-text-muted'>
          <ShieldCheck className='w-5 h-5 text-success flex-shrink-0' />
          ¿Algún dibujo no te convence? Toca la página y rehazlo gratis
          {typeof book.freeRedraws === "number" ? ` (te quedan ${book.freeRedraws})` : ""}.
        </p>
        <button onClick={onNewBook} className='font-semibold text-secondary underline underline-offset-4 whitespace-nowrap'>
          <Sparkles className='w-4 h-4 inline mr-1' />
          Crear otro cuento{prices ? ` · ${prices.repeat.formatted}` : ""}
        </button>
      </div>
    </section>
  );
}

interface ActionBarProps {
  book: BookData;
  prices: CheckoutPrices | null;
  hasCredits: boolean;
  hasPurchased: boolean;
  busy: boolean;
  onBuy: (product: "bundle" | "digital" | "repeat") => void;
  onIllustrate: () => void;
}

/** Barra fija abajo en borrador o error: siempre a mano la acción principal */
export function ActionBar({ book, prices, hasCredits, hasPurchased, busy, onBuy, onIllustrate }: ActionBarProps) {
  const digital = prices ? (hasPurchased ? prices.repeat : prices.digital) : null;
  if (book.status === "ERROR") {
    return (
      <div className='sticky bottom-0 z-20 border-t border-border bg-bg-light/95 backdrop-blur px-3 py-3'>
        <p className='text-sm text-text-muted text-center mb-2'>
          Algunas ilustraciones no se pudieron terminar. No se te ha cobrado de más.
        </p>
        <button
          onClick={onIllustrate}
          disabled={busy}
          className='w-full max-w-md mx-auto py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60'>
          <RefreshCw className='w-5 h-5' /> Terminar las ilustraciones
        </button>
      </div>
    );
  }
  return (
    <div className='sticky bottom-0 z-20 border-t border-border bg-bg-light/95 backdrop-blur px-3 py-3'>
      <div className='max-w-md mx-auto flex gap-2'>
        {hasCredits ? (
          <button
            onClick={onIllustrate}
            disabled={busy}
            className='flex-1 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60'>
            <Wand2 className='w-5 h-5' /> Ilustrar el cuento
          </button>
        ) : !PRINT_ENABLED ? (
          <button
            onClick={() => onBuy(hasPurchased ? "repeat" : "digital")}
            className='flex-1 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2'>
            <Wand2 className='w-5 h-5' /> Ilustrar el cuento{digital && ` · ${digital.formatted}`}
          </button>
        ) : (
          <>
            <button
              onClick={() => onBuy("bundle")}
              className='flex-[3] py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-1.5'>
              <Gift className='w-5 h-5' /> Impreso + PDF{prices && ` · ${prices.bundle.formatted}`}
            </button>
            <button
              onClick={() => onBuy(hasPurchased ? "repeat" : "digital")}
              className='flex-[2] py-3.5 rounded-2xl border-2 border-primary text-primary font-bold'>
              PDF{digital && ` · ${digital.formatted}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface PageSheetProps {
  page: BookPage;
  canRedraw: boolean;
  freeRedraws?: number;
  redrawing: boolean;
  onClose: () => void;
  onSaveText: (text: string) => Promise<void>;
  onRedraw: (instruction: string) => void;
}

/** Acciones de una página: cambiar el texto y rehacer el dibujo */
export function PageSheet({ page, canRedraw, freeRedraws, redrawing, onClose, onSaveText, onRedraw }: PageSheetProps) {
  const [text, setText] = useState(page.text ?? "");
  const [instruction, setInstruction] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className='fixed inset-x-0 bottom-0 z-40 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] bg-bg-light border border-border rounded-t-3xl sm:rounded-3xl card-shadow p-4 max-h-[80vh] overflow-y-auto'>
      <div className='flex items-center justify-between mb-2'>
        <p className='font-bold'>{page.pageNumber === 1 ? "Portada" : `Página ${page.pageNumber - 1}`}</p>
        <button onClick={onClose} aria-label='Cerrar' className='p-2 -mr-2 rounded-xl hover:bg-bg'>
          <X className='w-5 h-5' />
        </button>
      </div>

      {page.pageNumber !== 1 && (
        <>
          <label htmlFor='page-text' className='text-sm font-semibold'>
            Texto
          </label>
          <textarea
            id='page-text'
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
            rows={4}
            maxLength={1000}
            className='w-full mt-1 px-3 py-2 rounded-xl bg-bg border border-border-strong outline-none focus:border-primary resize-none'
          />
          <button
            onClick={async () => {
              await onSaveText(text);
              setSaved(true);
            }}
            disabled={text === (page.text ?? "")}
            className='w-full mt-2 py-2.5 rounded-xl border-2 border-primary text-primary font-bold disabled:opacity-40'>
            {saved ? "¡Guardado!" : "Guardar texto"}
          </button>
        </>
      )}

      {canRedraw && (
        <div className='mt-4 pt-4 border-t border-border'>
          <label htmlFor='redraw' className='text-sm font-semibold'>
            ¿Qué cambiarías del dibujo? <span className='font-normal text-text-muted'>(opcional)</span>
          </label>
          <input
            id='redraw'
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            maxLength={200}
            placeholder='Ej: que sonría más, que sea de noche…'
            className='w-full mt-1 px-3 py-2.5 rounded-xl bg-bg border border-border-strong outline-none focus:border-primary'
          />
          <button
            onClick={() => onRedraw(instruction.trim())}
            disabled={redrawing}
            className='w-full mt-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60'>
            {redrawing ? <Loader2 className='w-5 h-5 animate-spin' /> : <RefreshCw className='w-5 h-5' />}
            Rehacer dibujo
            {typeof freeRedraws === "number" && freeRedraws > 0 ? ` · gratis (quedan ${freeRedraws})` : ""}
          </button>
          <p className='text-xs text-text-muted mt-2'>
            {GUARANTEE_TEXT}{" "}
            <Link href='mailto:hola@iconicospace.com' className='underline'>
              Escríbenos
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

function RoundButton({
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
      className='w-8 h-8 rounded-full border-2 border-border-strong flex items-center justify-center disabled:opacity-30'>
      {children}
    </button>
  );
}
