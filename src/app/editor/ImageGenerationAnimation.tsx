"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ImageGenerationAnimationProps {
  kidName: string;
  currentPage: number;
  totalPages: number;
  status: string;
  progress: number;
}

export default function ImageGenerationAnimation({
  kidName,
  currentPage,
  totalPages,
  status,
  progress,
}: ImageGenerationAnimationProps) {
  const [displayPage, setDisplayPage] = useState(1);

  // Simular el paso de páginas
  useEffect(() => {
    const pageFromProgress = Math.max(
      1,
      Math.ceil((progress / 100) * totalPages)
    );
    setDisplayPage(pageFromProgress);
  }, [progress, totalPages]);

  return (
    <div className='flex flex-col items-center justify-center p-4 sm:p-8 max-w-lg mx-auto'>
      {/* Contenedor del libro con animación */}
      <div className='relative w-64 h-80 sm:w-80 sm:h-96 mb-8'>
        {/* Sombra del libro */}
        <div className='absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/20 rounded-full blur-xl' />

        {/* Libro base */}
        <div className='absolute inset-0 flex'>
          {/* Lomo del libro */}
          <div className='absolute left-1/2 -translate-x-1/2 w-4 h-full bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 rounded-sm z-10' />

          {/* Página izquierda (fija) */}
          <motion.div
            className='absolute left-0 w-1/2 h-full bg-gradient-to-r from-amber-50 to-white rounded-l-lg shadow-inner overflow-hidden'
            style={{ transformOrigin: "right center", perspective: "1000px" }}>
            <div className='absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.1)_0%,transparent_10%)]' />
            <div className='p-4 pt-8'>
              <div className='w-full h-24 sm:h-32 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg mb-3 flex items-center justify-center'>
                {displayPage > 1 && (
                  <motion.span
                    className='text-4xl'
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}>
                    🎨
                  </motion.span>
                )}
              </div>
              <div className='space-y-2'>
                <div className='h-2 bg-gray-200 rounded w-full' />
                <div className='h-2 bg-gray-200 rounded w-4/5' />
                <div className='h-2 bg-gray-200 rounded w-3/4' />
              </div>
            </div>
            <div className='absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-gray-400'>
              {Math.max(1, displayPage - 1)}
            </div>
          </motion.div>

          {/* Página derecha (se está dibujando) */}
          <motion.div
            className='absolute right-0 w-1/2 h-full bg-gradient-to-l from-amber-50 to-white rounded-r-lg shadow-lg overflow-hidden'
            style={{ transformOrigin: "left center" }}>
            <div className='absolute inset-0 bg-[linear-gradient(to_left,rgba(0,0,0,0.05)_0%,transparent_10%)]' />
            <div className='p-4 pt-8 relative'>
              {/* Área de la imagen siendo dibujada */}
              <div className='w-full h-24 sm:h-32 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg mb-3 relative overflow-hidden'>
                {/* Efecto de pinceladas apareciendo */}
                <motion.div
                  className='absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20'
                  initial={{ clipPath: "inset(100% 0 0 0)" }}
                  animate={{ clipPath: "inset(0% 0 0 0)" }}
                  transition={{ duration: 3, repeat: Infinity }}
                />

                {/* Líneas de pincel */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className='absolute h-1 bg-gradient-to-r from-primary/40 to-transparent rounded-full'
                    style={{
                      top: `${15 + i * 18}%`,
                      left: "5%",
                      width: `${60 + Math.random() * 30}%`,
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: [0, 1, 0.5] }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.3,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                  />
                ))}

                {/* Icono central pulsante */}
                <motion.div
                  className='absolute inset-0 flex items-center justify-center'
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}>
                  <span className='text-3xl'>✨</span>
                </motion.div>
              </div>

              {/* Líneas de texto */}
              <div className='space-y-2'>
                <div className='h-2 bg-gray-300 rounded w-full' />
                <div className='h-2 bg-gray-200 rounded w-5/6' />
                <div className='h-2 bg-gray-200 rounded w-4/5' />
              </div>
            </div>
            <div className='absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-gray-400'>
              {displayPage}
            </div>
          </motion.div>

          {/* Páginas pasando (animación) */}
          <AnimatePresence>
            {progress > 0 && progress < 100 && (
              <motion.div
                key={`page-flip-${displayPage}`}
                className='absolute right-0 w-1/2 h-full bg-gradient-to-l from-white to-amber-50 rounded-r-lg shadow-xl'
                style={{ transformOrigin: "left center" }}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: -180 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Pincel animado */}
        <motion.div
          className='absolute -right-8 sm:-right-12 top-1/4 z-20'
          animate={{
            x: [0, -20, 0, -15, 0],
            y: [0, 20, 40, 20, 0],
            rotate: [15, 25, 15, 20, 15],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <div className='relative'>
            {/* Mango del pincel */}
            <div className='w-3 h-24 sm:w-4 sm:h-32 bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-full transform rotate-[25deg]' />
            {/* Punta del pincel */}
            <div className='absolute -bottom-2 -left-1 w-5 h-8 sm:w-6 sm:h-10 bg-gradient-to-b from-amber-900 to-amber-700 rounded-b-full transform rotate-[25deg]'>
              {/* Cerdas con color */}
              <motion.div
                className='absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-b-full bg-gradient-to-b from-primary via-secondary to-primary'
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>

            {/* Partículas de pintura */}
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className='absolute w-2 h-2 rounded-full'
                style={{
                  backgroundColor: i % 2 === 0 ? "#6366f1" : "#f59e0b",
                  bottom: -10 - i * 5,
                  left: -5 + i * 8,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [0, 20, 40],
                  scale: [1, 0.5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Destellos mágicos */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute w-3 h-3 text-amber-400'
            style={{
              top: `${10 + Math.random() * 80}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
            }}>
            ✨
          </motion.div>
        ))}
      </div>

      {/* Información de progreso */}
      <motion.div
        className='text-center space-y-3 w-full max-w-xs'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}>
        <h3 className='text-xl sm:text-2xl font-bold'>
          Ilustrando el libro de <span className='text-primary'>{kidName}</span>
        </h3>

        <p className='text-text-muted text-sm sm:text-base'>{status}</p>

        {/* Indicador de página */}
        <div className='flex items-center justify-center gap-2 text-sm'>
          <span className='text-primary font-semibold'>
            Página {displayPage}
          </span>
          <span className='text-text-muted'>de {totalPages}</span>
        </div>

        {/* Barra de progreso */}
        <div className='w-full h-3 bg-surface rounded-full overflow-hidden'>
          <motion.div
            className='h-full bg-gradient-to-r from-primary via-secondary to-primary rounded-full'
            style={{ width: `${progress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <p className='text-xs text-text-muted'>
          🎨 Cada ilustración es única y creada especialmente para esta historia
        </p>
      </motion.div>
    </div>
  );
}
