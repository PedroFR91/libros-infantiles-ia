"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Edit3,
  Palette,
  ArrowRight,
  CheckCircle,
  Coins,
  Wand2,
  BookOpen,
} from "lucide-react";

interface DraftBookOverlayProps {
  kidName: string;
  theme: string;
  pageCount: number;
  credits: number;
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
  onGenerateImages,
  onEditTexts,
  isVisible,
  onClose,
}: DraftBookOverlayProps) {
  const hasEnoughCredits = credits >= 5;

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
            className='bg-bg-light rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl'
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

              {/* Icono central animado */}
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
                  <div className='text-3xl font-bold text-secondary'>12</div>
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
                <motion.button
                  onClick={onGenerateImages}
                  disabled={!hasEnoughCredits}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                    hasEnoughCredits
                      ? "bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 hover:scale-[1.02]"
                      : "bg-gray-500/20 text-gray-500 cursor-not-allowed"
                  }`}
                  whileHover={hasEnoughCredits ? { scale: 1.02 } : {}}
                  whileTap={hasEnoughCredits ? { scale: 0.98 } : {}}>
                  <Wand2 className='w-5 h-5' />
                  Generar Ilustraciones
                  <span className='flex items-center gap-1 text-sm opacity-80'>
                    <Coins className='w-4 h-4' />5 créditos
                  </span>
                </motion.button>

                {!hasEnoughCredits && (
                  <p className='text-center text-amber-500 text-sm'>
                    Necesitas 5 créditos. Tienes {credits}.
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
