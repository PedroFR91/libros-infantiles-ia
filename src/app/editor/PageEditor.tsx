"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
} from "lucide-react";

interface PageEditorProps {
  pageNumber: number;
  totalPages: number;
  text: string;
  imageUrl?: string | null;
  onSave: (text: string) => void;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  isGenerating?: boolean;
}

export default function PageEditor({
  pageNumber,
  totalPages,
  text,
  imageUrl,
  onSave,
  onClose,
  onNavigate,
  isGenerating = false,
}: PageEditorProps) {
  const [editedText, setEditedText] = useState(text);
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom">(
    "bottom"
  );
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    "left"
  );
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
    "medium"
  );

  const isCover = pageNumber === 1;
  const hasChanges = editedText !== text;

  const handleSave = () => {
    onSave(editedText);
  };

  const getTextPositionClass = () => {
    switch (textPosition) {
      case "top":
        return "items-start pt-8";
      case "center":
        return "items-center";
      case "bottom":
        return "items-end pb-8";
    }
  };

  const getTextAlignClass = () => {
    switch (textAlign) {
      case "left":
        return "text-left";
      case "center":
        return "text-center";
      case "right":
        return "text-right";
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case "small":
        return "text-sm";
      case "medium":
        return "text-base";
      case "large":
        return "text-lg";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className='bg-bg-light rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-border'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => onNavigate("prev")}
              disabled={pageNumber <= 1}
              className='p-2 rounded-lg bg-surface hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
              <ChevronLeft className='w-5 h-5' />
            </button>
            <h2 className='text-lg font-bold'>
              {isCover ? "Portada" : `Página ${pageNumber}`}
              <span className='text-text-muted font-normal ml-2'>
                de {totalPages}
              </span>
            </h2>
            <button
              onClick={() => onNavigate("next")}
              disabled={pageNumber >= totalPages}
              className='p-2 rounded-lg bg-surface hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
              <ChevronRight className='w-5 h-5' />
            </button>
          </div>

          <div className='flex items-center gap-3'>
            {hasChanges && (
              <span className='text-sm text-amber-500'>Sin guardar</span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className='flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
              <Check className='w-4 h-4' />
              Guardar
            </button>
            <button
              onClick={onClose}
              className='p-2 rounded-lg bg-surface hover:bg-border transition-colors'>
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className='flex-1 flex overflow-hidden'>
          {/* Panel izquierdo - Editor */}
          <div className='w-1/2 border-r border-border flex flex-col'>
            {/* Toolbar de formato */}
            <div className='flex items-center gap-2 p-4 border-b border-border bg-surface'>
              {/* Posición */}
              <div className='flex items-center gap-1 bg-bg rounded-lg p-1'>
                <button
                  onClick={() => setTextPosition("top")}
                  className={`p-2 rounded ${
                    textPosition === "top"
                      ? "bg-primary text-white"
                      : "hover:bg-border"
                  }`}
                  title='Arriba'>
                  <AlignLeft className='w-4 h-4 rotate-90' />
                </button>
                <button
                  onClick={() => setTextPosition("center")}
                  className={`p-2 rounded ${
                    textPosition === "center"
                      ? "bg-primary text-white"
                      : "hover:bg-border"
                  }`}
                  title='Centro'>
                  <AlignCenter className='w-4 h-4 rotate-90' />
                </button>
                <button
                  onClick={() => setTextPosition("bottom")}
                  className={`p-2 rounded ${
                    textPosition === "bottom"
                      ? "bg-primary text-white"
                      : "hover:bg-border"
                  }`}
                  title='Abajo'>
                  <AlignRight className='w-4 h-4 rotate-90' />
                </button>
              </div>

              <div className='w-px h-6 bg-border' />

              {/* Alineación */}
              <div className='flex items-center gap-1 bg-bg rounded-lg p-1'>
                <button
                  onClick={() => setTextAlign("left")}
                  className={`p-2 rounded ${
                    textAlign === "left"
                      ? "bg-primary text-white"
                      : "hover:bg-border"
                  }`}
                  title='Izquierda'>
                  <AlignLeft className='w-4 h-4' />
                </button>
                <button
                  onClick={() => setTextAlign("center")}
                  className={`p-2 rounded ${
                    textAlign === "center"
                      ? "bg-primary text-white"
                      : "hover:bg-border"
                  }`}
                  title='Centro'>
                  <AlignCenter className='w-4 h-4' />
                </button>
                <button
                  onClick={() => setTextAlign("right")}
                  className={`p-2 rounded ${
                    textAlign === "right"
                      ? "bg-primary text-white"
                      : "hover:bg-border"
                  }`}
                  title='Derecha'>
                  <AlignRight className='w-4 h-4' />
                </button>
              </div>

              <div className='w-px h-6 bg-border' />

              {/* Tamaño */}
              <div className='flex items-center gap-1 bg-bg rounded-lg p-1'>
                <button
                  onClick={() => setFontSize("small")}
                  className={`px-3 py-1.5 rounded text-xs ${
                    fontSize === "small"
                      ? "bg-primary text-white"
                      : "hover:bg-border"
                  }`}>
                  S
                </button>
                <button
                  onClick={() => setFontSize("medium")}
                  className={`px-3 py-1.5 rounded text-sm ${
                    fontSize === "medium"
                      ? "bg-primary text-white"
                      : "hover:bg-border"
                  }`}>
                  M
                </button>
                <button
                  onClick={() => setFontSize("large")}
                  className={`px-3 py-1.5 rounded text-base ${
                    fontSize === "large"
                      ? "bg-primary text-white"
                      : "hover:bg-border"
                  }`}>
                  L
                </button>
              </div>
            </div>

            {/* Área de texto */}
            <div className='flex-1 p-4'>
              <label className='block text-sm font-medium text-text-muted mb-2'>
                <Type className='w-4 h-4 inline mr-1' />
                {isCover ? "Título del libro" : "Texto de la página"}
              </label>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder={
                  isCover
                    ? "Escribe el título de tu libro..."
                    : "Escribe el texto de esta página..."
                }
                className='w-full h-[calc(100%-2rem)] p-4 bg-surface border border-border rounded-xl text-text placeholder-text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none'
              />
            </div>

            {/* Info */}
            <div className='p-4 border-t border-border bg-surface'>
              <p className='text-xs text-text-muted'>
                💡 <strong>Gratis:</strong> Editar el texto no consume créditos.
                Solo se cobran al generar las ilustraciones.
              </p>
            </div>
          </div>

          {/* Panel derecho - Preview */}
          <div className='w-1/2 bg-bg p-6 flex flex-col'>
            <h3 className='text-sm font-medium text-text-muted mb-4'>
              Vista previa
            </h3>

            <div className='flex-1 flex items-center justify-center'>
              {/* Página simulada */}
              <div
                className='relative w-[320px] h-[450px] bg-white rounded-lg shadow-2xl overflow-hidden'
                style={{ aspectRatio: "7/10" }}>
                {/* Imagen de fondo */}
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`Página ${pageNumber}`}
                    className='absolute inset-0 w-full h-full object-cover'
                  />
                ) : (
                  <div className='absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center'>
                    {isGenerating ? (
                      <div className='text-center text-text-muted'>
                        <div className='w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2' />
                        <p className='text-sm'>Generando...</p>
                      </div>
                    ) : (
                      <p className='text-text-muted text-sm text-center px-4'>
                        La ilustración se generará
                        <br />
                        al crear el libro
                      </p>
                    )}
                  </div>
                )}

                {/* Overlay de texto */}
                <div
                  className={`absolute inset-0 flex flex-col px-6 ${getTextPositionClass()}`}>
                  {editedText && (
                    <div
                      className={`
                        ${
                          isCover
                            ? "bg-black/60"
                            : "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                        } 
                        p-4 rounded-lg max-w-full
                      `}>
                      <p
                        className={`
                          text-white leading-relaxed
                          ${getTextAlignClass()}
                          ${getFontSizeClass()}
                          ${isCover ? "font-bold" : ""}
                        `}>
                        {editedText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Número de página */}
                {!isCover && (
                  <div className='absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-white/70 bg-black/30 px-2 py-0.5 rounded'>
                    {pageNumber}
                  </div>
                )}
              </div>
            </div>

            <p className='text-xs text-text-muted text-center mt-4'>
              Así se verá tu texto en el documento final
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
