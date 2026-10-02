"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Edit3,
  Palette,
  ArrowRight,
  CheckCircle,
  Wand2,
  BookOpen,
  Mail,
  Loader2,
} from "lucide-react";

interface DraftBookOverlayProps {
  kidName: string;
  theme: string;
  pageCount: number;
  credits: number;
  unlockPrice: string;
  coverPreviewUrl?: string | null;
  previewPending?: boolean;
  onSaveEmail: (email: string) => Promise<boolean>;
  onGenerateImages: () => void;
  onEditTexts: () => void;
  isVisible: boolean;
  onClose: () => void;
}

export default function DraftBookOverlay({
  kidName,
  theme,
  pageCount,
  credits,
  unlockPrice,
  coverPreviewUrl,
  previewPending,
  onSaveEmail,
  onGenerateImages,
  onEditTexts,
  isVisible,
  onClose,
}: DraftBookOverlayProps) {
  const hasEnoughCredits = credits >= 5;
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "saving" | "saved" | "error">("idle");

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
          className='fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4'
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className='bg-bg-light rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl'
            onClick={(e) => e.stopPropagation()}>
            {/* Header con animación de libro */}
            <div className='relative bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/5 p-8 overflow-hidden'>
              {/* Partículas flotantes */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className='absolute w-2 h-2 rounded-full bg-primary/30'
                  style={{
                    left: `${10 + i * 12}%`,
                    top: `${20 + (i % 3) * 25}%`,
                  }}
                  animate={{
                    y: [0, -15, 0],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 2 + i * 0.3,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}

              {/* Portada de muestra (con marca de agua) o su generación en curso */}
              {coverPreviewUrl ? (
                <motion.figure
                  className='relative mx-auto w-48 sm:w-56 mb-4'
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}>
                  <img
                    src={coverPreviewUrl}
                    alt={`Portada de muestra del libro de ${kidName}`}
                    className='w-full aspect-square object-cover rounded-xl shadow-xl'
                  />
                  <figcaption className='text-[11px] text-text-muted text-center mt-1.5'>
                    Portada de muestra · sin marca al desbloquear
                  </figcaption>
                </motion.figure>
              ) : previewPending ? (
                <div className='mx-auto w-48 sm:w-56 aspect-square mb-4 rounded-xl bg-surface border border-border flex flex-col items-center justify-center gap-2 text-text-muted'>
                  <Loader2 className='w-8 h-8 animate-spin text-primary' />
                  <span className='text-xs px-4 text-center'>
                    Dibujando a {kidName} para la portada…
                  </span>
                </div>
              ) : (
                <motion.div
                  className='relative mx-auto w-24 h-24 mb-4'
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}>
                  <motion.div
                    className='absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg'
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}>
                    <CheckCircle className='w-12 h-12 text-white' />
                  </motion.div>
                </motion.div>
              )}

              <motion.h2
                className='text-2xl sm:text-3xl font-bold text-center'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}>
                ¡Historia lista! ✨
              </motion.h2>

              <motion.p
                className='text-text-muted text-center mt-2'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}>
                La aventura de{" "}
                <span className='text-primary font-semibold'>{kidName}</span>
              </motion.p>
            </div>

            {/* Contenido */}
            <div className='p-6 space-y-6'>
              {/* Stats del libro */}
              <div className='flex justify-center gap-6'>
                <div className='text-center'>
                  <div className='text-3xl font-bold text-primary'>
                    {pageCount}
                  </div>
                  <div className='text-xs text-text-muted'>páginas</div>
                </div>
                <div className='w-px bg-border' />
                <div className='text-center'>
                  <div className='text-3xl font-bold text-secondary'>{pageCount}</div>
                  <div className='text-xs text-text-muted'>ilustraciones</div>
                </div>
              </div>

              {/* Pasos explicativos */}
              <div className='bg-surface rounded-xl p-4 space-y-4'>
                <h3 className='font-semibold text-sm text-text-muted uppercase tracking-wide'>
                  ¿Qué sigue?
                </h3>

                {/* Paso 1: Revisar textos */}
                <motion.div
                  className='flex items-start gap-3'
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}>
                  <div className='w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0'>
                    <Edit3 className='w-4 h-4 text-amber-500' />
                  </div>
                  <div>
                    <p className='font-medium'>1. Revisa los textos</p>
                    <p className='text-sm text-text-muted'>
                      Edita la historia si quieres cambiar algo. ¡Es gratis!
                    </p>
                  </div>
                </motion.div>

                {/* Paso 2: Generar ilustraciones */}
                <motion.div
                  className='flex items-start gap-3'
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}>
                  <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0'>
                    <Palette className='w-4 h-4 text-primary' />
                  </div>
                  <div>
                    <p className='font-medium'>2. Genera las ilustraciones</p>
                    <p className='text-sm text-text-muted'>
                      Nuestra IA creará imágenes únicas para cada página.
                    </p>
                  </div>
                </motion.div>

                {/* Paso 3: Descarga */}
                <motion.div
                  className='flex items-start gap-3 opacity-50'
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 0.5, x: 0 }}
                  transition={{ delay: 0.6 }}>
                  <div className='w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0'>
                    <BookOpen className='w-4 h-4 text-green-500' />
                  </div>
                  <div>
                    <p className='font-medium'>3. Descarga tu libro</p>
                    <p className='text-sm text-text-muted'>
                      PDF digital o listo para imprimir.
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Botones de acción */}
              <div className='space-y-3'>
                {/* Botón principal: Generar ilustraciones */}
                {/* Sin créditos abre la compra (con el consentimiento) en vez de
                    quedar desactivado justo en el momento de máximo interés */}
                <motion.button
                  onClick={onGenerateImages}
                  className='w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90'
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}>
                  <Wand2 className='w-5 h-5' />
                  {hasEnoughCredits
                    ? "Generar ilustraciones"
                    : `Desbloquear ilustraciones · ${unlockPrice}`}
                </motion.button>

                {!hasEnoughCredits && (
                  <p className='text-center text-text-muted text-xs'>
                    Pago único · PDF para pantalla y para imprimir · Se crea al
                    momento
                  </p>
                )}

                {/* Botón secundario: Editar textos */}
                <button
                  onClick={onEditTexts}
                  className='w-full py-3 bg-surface hover:bg-border rounded-xl font-medium transition-colors flex items-center justify-center gap-2'>
                  <Edit3 className='w-4 h-4' />
                  Revisar y editar textos primero
                </button>
              </div>

              {/* Guardar el borrador por email (lead + recordatorio) */}
              {emailState === "saved" ? (
                <p className='text-center text-sm text-green-600'>
                  ✅ Te lo guardamos. Te escribiremos a {email}.
                </p>
              ) : (
                <form onSubmit={saveEmail} className='space-y-1.5'>
                  <label htmlFor='lead-email' className='text-xs text-text-muted flex items-center gap-1.5'>
                    <Mail className='w-3.5 h-3.5' />
                    ¿Te enviamos el enlace para terminarlo cuando quieras?
                  </label>
                  <div className='flex gap-2'>
                    <input
                      id='lead-email'
                      type='email'
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder='tu@email.com'
                      className='flex-1 min-w-0 px-3 py-2 bg-surface border border-border rounded-lg text-sm outline-none focus:border-primary'
                    />
                    <button
                      type='submit'
                      disabled={emailState === "saving"}
                      className='px-4 py-2 bg-surface border border-border hover:border-primary rounded-lg text-sm font-medium'>
                      {emailState === "saving" ? <Loader2 className='w-4 h-4 animate-spin' /> : "Enviar"}
                    </button>
                  </div>
                  {emailState === "error" && (
                    <p className='text-xs text-red-500'>Revisa el email e inténtalo de nuevo.</p>
                  )}
                </form>
              )}

              {/* Nota */}
              <p className='text-xs text-text-muted text-center'>
                💡 Puedes cerrar este mensaje y editar los textos haciendo clic
                en cualquier página.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
