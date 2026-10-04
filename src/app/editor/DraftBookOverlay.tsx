"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Gift, Loader2, Mail, ShieldCheck, Wand2, X } from "lucide-react";
import { GUARANTEE_TEXT, PRINT_COMING_SOON_TEXT, PRINT_ENABLED } from "@/lib/pricing";
import { CheckoutPrices, PurchaseProduct } from "./types";

// Revelación de la historia: portada de muestra a pantalla completa y un único
// bloque de acciones fijo abajo (en móvil antes quedaba fuera de pantalla).

interface DraftBookOverlayProps {
  isVisible: boolean;
  kidName: string;
  title: string;
  firstPageText?: string | null;
  coverPreviewUrl?: string | null;
  previewPending?: boolean;
  prices: CheckoutPrices | null;
  hasCredits: boolean;
  hasPurchased: boolean;
  onChoose: (product: PurchaseProduct) => void;
  onIllustrateWithCredits: () => void;
  onRead: () => void;
  onClose: () => void;
  onSaveEmail: (email: string) => Promise<boolean>;
}

export default function DraftBookOverlay({
  isVisible,
  kidName,
  title,
  firstPageText,
  coverPreviewUrl,
  previewPending,
  prices,
  hasCredits,
  hasPurchased,
  onChoose,
  onIllustrateWithCredits,
  onRead,
  onClose,
  onSaveEmail,
}: DraftBookOverlayProps) {
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const digital = prices ? (hasPurchased ? prices.repeat : prices.digital) : null;

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setEmailState("saving");
    setEmailState((await onSaveEmail(email.trim())) ? "saved" : "error");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 z-40 bg-black/50 flex items-stretch sm:items-center justify-center sm:p-4'
          onClick={onClose}>
          <motion.div
            role='dialog'
            aria-modal='true'
            aria-labelledby='reveal-title'
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className='w-full sm:max-w-md bg-bg sm:rounded-3xl flex flex-col max-h-full sm:max-h-[92vh] overflow-hidden'>
            <div className='flex justify-end px-3 pt-3'>
              <button onClick={onClose} aria-label='Cerrar' className='p-2 rounded-xl hover:bg-bg-light'>
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='flex-1 overflow-y-auto px-5 pb-4 text-center'>
              <p className='text-sm font-bold text-primary uppercase tracking-wide'>¡Ya está escrito!</p>
              <h2 id='reveal-title' className='font-display text-2xl sm:text-3xl font-semibold mt-1 mb-4'>
                {title}
              </h2>

              {coverPreviewUrl ? (
                <figure className='mx-auto w-full max-w-[300px]'>
                  <img
                    src={coverPreviewUrl}
                    alt={`Portada de muestra del cuento de ${kidName}`}
                    className='w-full aspect-square object-cover rounded-2xl book-shadow'
                  />
                  <figcaption className='text-xs text-text-muted mt-2'>
                    Portada de muestra · sin marca de agua al ilustrarlo
                  </figcaption>
                </figure>
              ) : previewPending ? (
                <div className='mx-auto w-full max-w-[300px] aspect-square rounded-2xl bg-bg-light border border-border flex flex-col items-center justify-center gap-2 text-text-muted'>
                  <Loader2 className='w-8 h-8 animate-spin text-primary' />
                  <span className='text-sm px-6'>Dibujando a {kidName} para la portada…</span>
                </div>
              ) : null}

              {firstPageText && (
                <blockquote className='mt-5 text-left bg-bg-light border border-border rounded-2xl p-4 italic'>
                  «{firstPageText}»
                </blockquote>
              )}

              <button
                onClick={onRead}
                className='mt-3 inline-flex items-center gap-2 font-semibold text-secondary underline underline-offset-4 py-2'>
                <BookOpen className='w-4 h-4' /> Leer la historia entera (y cambiar frases)
              </button>

              <p className='mt-4 text-sm text-text-muted flex gap-2 text-left'>
                <ShieldCheck className='w-5 h-5 text-success flex-shrink-0' />
                {GUARANTEE_TEXT}
              </p>

              {emailState === "saved" ? (
                <p className='mt-4 text-sm text-success font-semibold'>
                  ✅ Te lo guardamos: te escribiremos a {email}.
                </p>
              ) : (
                <form onSubmit={saveEmail} className='mt-4 text-left'>
                  <label htmlFor='lead-email' className='text-sm text-text-muted flex items-center gap-1.5 mb-1.5'>
                    <Mail className='w-4 h-4' /> ¿Lo terminas luego? Te enviamos el enlace
                  </label>
                  <div className='flex gap-2'>
                    <input
                      id='lead-email'
                      type='email'
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder='tu@email.com'
                      className='flex-1 min-w-0 px-3 py-3 rounded-xl bg-bg-light border border-border-strong outline-none focus:border-primary'
                    />
                    <button
                      type='submit'
                      disabled={emailState === "saving"}
                      className='px-4 rounded-xl border-2 border-border-strong font-semibold'>
                      {emailState === "saving" ? <Loader2 className='w-4 h-4 animate-spin' /> : "Enviar"}
                    </button>
                  </div>
                  {emailState === "error" && (
                    <p className='text-xs text-primary mt-1'>Revisa el email e inténtalo de nuevo.</p>
                  )}
                </form>
              )}
            </div>

            {/* Acciones fijas abajo */}
            <div className='border-t border-border bg-bg-light px-5 pt-3 pb-5 space-y-2'>
              {hasCredits ? (
                <button
                  onClick={onIllustrateWithCredits}
                  className='w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-lg font-bold flex items-center justify-center gap-2'>
                  <Wand2 className='w-5 h-5' /> Ilustrar el cuento de {kidName}
                </button>
              ) : !PRINT_ENABLED ? (
                <>
                  <button
                    onClick={() => onChoose(hasPurchased ? "repeat" : "digital")}
                    className='w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-lg font-bold flex items-center justify-center gap-2'>
                    <Wand2 className='w-5 h-5' /> Ilustrar el cuento de {kidName}
                    {digital && <span className='opacity-90'>· {digital.formatted}</span>}
                  </button>
                  <p className='text-xs text-text-muted text-center'>
                    Recibes el PDF en minutos. {PRINT_COMING_SOON_TEXT}
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onChoose("bundle")}
                    className='w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-lg font-bold flex items-center justify-center gap-2'>
                    <Gift className='w-5 h-5' /> Impreso + PDF
                    {prices && <span className='opacity-90'>· {prices.bundle.formatted}</span>}
                  </button>
                  <button
                    onClick={() => onChoose(hasPurchased ? "repeat" : "digital")}
                    className='w-full py-3 rounded-2xl border-2 border-primary text-primary font-bold flex items-center justify-center gap-2'>
                    <Wand2 className='w-5 h-5' /> Solo el PDF
                    {digital && <span>· {digital.formatted}</span>}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
