"use client";

import { motion } from "framer-motion";
import { Sparkles, BookOpen, Check } from "lucide-react";
import ImageGenerationAnimation from "./ImageGenerationAnimation";

interface GeneratingOverlayProps {
  kidName: string;
  theme: string;
  phase: "story" | "images" | "finishing";
  progress: number;
  status: string;
  totalPages?: number;
}

export default function GeneratingOverlay({
  kidName,
  theme,
  phase,
  progress,
  status,
  totalPages = 12,
}: GeneratingOverlayProps) {
  const phases = [
    { id: "story", label: "Historia", icon: BookOpen },
    { id: "images", label: "Ilustraciones", icon: ImageIcon },
    { id: "finishing", label: "Finalizado", icon: Check },
  ];

  const currentPhaseIndex = phases.findIndex((p) => p.id === phase);

  // Si estamos generando imágenes, mostrar la animación especial del libro con pincel
  if (phase === "images") {
    return (
      <ImageGenerationAnimation
        kidName={kidName}
        currentPage={Math.ceil((progress / 100) * totalPages)}
        totalPages={totalPages}
        status={status}
        progress={progress}
      />
    );
  }

  return (
    <div className='flex flex-col items-center justify-center p-8 max-w-lg mx-auto'>
      {/* Animación principal */}
      <motion.div
        className='relative w-40 h-40 mb-8'
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
        {/* Círculos orbitando */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className='absolute inset-0'
            style={{ rotate: `${i * 120}deg` }}>
            <motion.div
              className='absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full'
              style={{
                backgroundColor:
                  i === 0 ? "#6366f1" : i === 1 ? "#f59e0b" : "#10b981",
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          </motion.div>
        ))}

        {/* Icono central */}
        <motion.div
          className='absolute inset-0 flex items-center justify-center'
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}>
          <div className='w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg'>
            {phase === "story" && <BookOpen className='w-10 h-10 text-white' />}
            {phase === "finishing" && (
              <Sparkles className='w-10 h-10 text-white' />
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Título animado */}
      <motion.h3
        className='text-2xl font-bold text-center mb-2'
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}>
        Creando la historia de <span className='text-primary'>{kidName}</span>
      </motion.h3>

      <p className='text-text-muted text-center mb-6'>{theme}</p>

      {/* Fases */}
      <div className='flex items-center gap-4 mb-6'>
        {phases.map((p, index) => {
          const Icon = p.icon;
          const isActive = index === currentPhaseIndex;
          const isCompleted = index < currentPhaseIndex;

          return (
            <div key={p.id} className='flex items-center gap-2'>
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-primary text-white"
                    : "bg-surface text-text-muted"
                }`}
                animate={
                  isActive
                    ? {
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          "0 0 0 0 rgba(99,102,241,0.4)",
                          "0 0 0 10px rgba(99,102,241,0)",
                          "0 0 0 0 rgba(99,102,241,0)",
                        ],
                      }
                    : {}
                }
                transition={{ duration: 1.5, repeat: Infinity }}>
                <Icon className='w-5 h-5' />
              </motion.div>
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? "text-primary"
                    : isCompleted
                    ? "text-green-500"
                    : "text-text-muted"
                }`}>
                {p.label}
              </span>
              {index < phases.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    isCompleted ? "bg-green-500" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Barra de progreso */}
      <div className='w-full max-w-sm'>
        <div className='flex justify-between text-sm mb-2'>
          <span className='text-text-muted'>{status}</span>
          <span className='text-primary font-semibold'>{progress}%</span>
        </div>
        <div className='h-2 bg-surface rounded-full overflow-hidden'>
          <motion.div
            className='h-full bg-gradient-to-r from-primary to-secondary rounded-full'
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Mensajes rotativos */}
      <motion.div
        className='mt-6 text-sm text-text-muted text-center'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}>
        <LoadingMessages phase={phase} />
      </motion.div>
    </div>
  );
}

function LoadingMessages({ phase }: { phase: string }) {
  const messages = {
    story: [
      "Imaginando personajes increíbles...",
      "Escribiendo aventuras emocionantes...",
      "Creando diálogos divertidos...",
      "Desarrollando la trama...",
    ],
    images: [
      "Pintando escenas mágicas...",
      "Dando vida a los personajes...",
      "Añadiendo colores vibrantes...",
      "Creando fondos fantásticos...",
    ],
    finishing: [
      "Puliendo los últimos detalles...",
      "Preparando tu libro...",
      "¡Casi listo!",
    ],
  };

  const currentMessages =
    messages[phase as keyof typeof messages] || messages.story;

  return (
    <motion.span
      key={phase}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}>
      {currentMessages[Math.floor(Date.now() / 3000) % currentMessages.length]}
    </motion.span>
  );
}
