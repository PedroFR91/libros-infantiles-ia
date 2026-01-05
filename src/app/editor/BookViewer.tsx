"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Square,
  Eye,
  Image as ImageIcon,
  Check,
  X,
  Edit3,
} from "lucide-react";
import {
  BookData,
  BookPage,
  ViewMode,
  VIEW_MODES,
  TextPosition,
  TextBackground,
  TextStyle,
  getTextPositionStyles,
  getTextBackgroundStyles,
  getTextFontStyles,
} from "./types";

interface BookViewerProps {
  book: BookData;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  selectedPage: number | null;
  onSelectPage: (page: number | null) => void;
  editingText: { pageNumber: number; text: string } | null;
  onEditText: (edit: { pageNumber: number; text: string } | null) => void;
  onSaveText: () => void;
}

export default function BookViewer({
  book,
  viewMode,
  onViewModeChange,
  currentPage,
  onPageChange,
  selectedPage,
  onSelectPage,
  editingText,
  onEditText,
  onSaveText,
}: BookViewerProps) {
  const totalPages = book.pages.length;

  // Para vista spread (doble página)
  const currentSpread = Math.floor(currentPage / 2);
  const totalSpreads = Math.ceil(totalPages / 2);
  const leftPageIndex = currentSpread * 2;
  const rightPageIndex = leftPageIndex + 1;
  const leftPage = book.pages[leftPageIndex] || null;
  const rightPage = book.pages[rightPageIndex] || null;

  // Página actual para vista single/preview
  const currentSinglePage = book.pages[currentPage] || null;

  // Iconos para los modos
  const getModeIcon = (iconName: string) => {
    switch (iconName) {
      case "BookOpen":
        return <BookOpen className='w-4 h-4' />;
      case "Square":
        return <Square className='w-4 h-4' />;
      case "Eye":
        return <Eye className='w-4 h-4' />;
      case "Image":
        return <ImageIcon className='w-4 h-4' />;
      default:
        return null;
    }
  };

  return (
    <div className='flex flex-col h-full'>
      {/* Toolbar de modos de vista */}
      <div className='flex-shrink-0 flex items-center justify-between px-4 py-2 bg-bg-light border-b border-border'>
        {/* Modos de visualización */}
        <div className='flex items-center gap-1 bg-surface rounded-lg p-1'>
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onViewModeChange(mode.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === mode.id
                  ? "bg-primary text-white"
                  : "text-text-muted hover:text-text hover:bg-bg"
              }`}>
              {getModeIcon(mode.icon)}
              <span className='hidden sm:inline'>{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Indicador de página */}
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-text-muted'>Página</span>
          <span className='font-bold text-primary'>
            {viewMode === "spread"
              ? `${leftPageIndex + 1}${
                  rightPage ? `-${rightPageIndex + 1}` : ""
                }`
              : currentPage + 1}
          </span>
          <span className='text-text-muted'>de {totalPages}</span>
        </div>

        {/* Título del libro */}
        <div className='text-sm font-medium text-text truncate max-w-[200px]'>
          {book.title || `Historia de ${book.kidName}`}
        </div>
      </div>

      {/* Área de visualización */}
      <div className='flex-1 flex items-center justify-center p-4 overflow-hidden'>
        <AnimatePresence mode='wait'>
          {viewMode === "spread" && (
            <SpreadView
              leftPage={leftPage}
              rightPage={rightPage}
              currentSpread={currentSpread}
              totalSpreads={totalSpreads}
              selectedPage={selectedPage}
              onSelectPage={onSelectPage}
              editingText={editingText}
              onEditText={onEditText}
              onSaveText={onSaveText}
              onPrevSpread={() =>
                currentSpread > 0 && onPageChange((currentSpread - 1) * 2)
              }
              onNextSpread={() =>
                currentSpread < totalSpreads - 1 &&
                onPageChange((currentSpread + 1) * 2)
              }
            />
          )}

          {viewMode === "single" && (
            <SinglePageView
              page={currentSinglePage}
              pageNumber={currentPage}
              totalPages={totalPages}
              selectedPage={selectedPage}
              onSelectPage={onSelectPage}
              editingText={editingText}
              onEditText={onEditText}
              onSaveText={onSaveText}
              onPrevPage={() =>
                currentPage > 0 && onPageChange(currentPage - 1)
              }
              onNextPage={() =>
                currentPage < totalPages - 1 && onPageChange(currentPage + 1)
              }
            />
          )}

          {viewMode === "preview" && (
            <PreviewView
              book={book}
              currentPage={currentPage}
              onPageChange={onPageChange}
            />
          )}

          {viewMode === "cover" && (
            <CoverView book={book} coverPage={book.pages[0]} />
          )}
        </AnimatePresence>
      </div>

      {/* Miniaturas de páginas */}
      <div className='flex-shrink-0 bg-bg-light border-t border-border'>
        <div className='flex items-center gap-2 p-3 overflow-x-auto'>
          {book.pages.map((page, index) => (
            <button
              key={page.id}
              onClick={() => onPageChange(index)}
              className={`relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                (
                  viewMode === "spread"
                    ? index === leftPageIndex || index === rightPageIndex
                    : index === currentPage
                )
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              }`}>
              {page.imageUrl ? (
                <img
                  src={page.imageUrl}
                  alt={`Página ${page.pageNumber}`}
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='w-full h-full bg-surface flex items-center justify-center'>
                  <span className='text-xs text-text-muted'>
                    {page.pageNumber}
                  </span>
                </div>
              )}
              {/* Número de página */}
              <div className='absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] text-center py-0.5'>
                {page.pageNumber}
              </div>
              {/* Indicador de portada */}
              {index === 0 && (
                <div className='absolute top-0 left-0 right-0 bg-primary/90 text-white text-[8px] text-center py-0.5'>
                  Portada
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// VISTA SPREAD (DOBLE PÁGINA)
// ============================================

interface SpreadViewProps {
  leftPage: BookPage | null;
  rightPage: BookPage | null;
  currentSpread: number;
  totalSpreads: number;
  selectedPage: number | null;
  onSelectPage: (page: number | null) => void;
  editingText: { pageNumber: number; text: string } | null;
  onEditText: (edit: { pageNumber: number; text: string } | null) => void;
  onSaveText: () => void;
  onPrevSpread: () => void;
  onNextSpread: () => void;
}

function SpreadView({
  leftPage,
  rightPage,
  currentSpread,
  totalSpreads,
  selectedPage,
  onSelectPage,
  editingText,
  onEditText,
  onSaveText,
  onPrevSpread,
  onNextSpread,
}: SpreadViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className='flex items-center gap-4'>
      {/* Botón anterior */}
      <button
        onClick={onPrevSpread}
        disabled={currentSpread === 0}
        className='p-3 rounded-full bg-surface border border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all'>
        <ChevronLeft className='w-6 h-6' />
      </button>

      {/* Libro abierto */}
      <div className='flex book-shadow rounded-lg overflow-hidden'>
        {/* Página izquierda */}
        <PageRenderer
          page={leftPage}
          isSelected={selectedPage === leftPage?.pageNumber}
          onSelect={() =>
            leftPage &&
            onSelectPage(
              selectedPage === leftPage.pageNumber ? null : leftPage.pageNumber
            )
          }
          editingText={editingText}
          onEditText={onEditText}
          onSaveText={onSaveText}
          width={350}
          height={500}
        />

        {/* Lomo */}
        <div className='w-2 bg-gradient-to-r from-gray-300 to-gray-200' />

        {/* Página derecha */}
        <PageRenderer
          page={rightPage}
          isSelected={selectedPage === rightPage?.pageNumber}
          onSelect={() =>
            rightPage &&
            onSelectPage(
              selectedPage === rightPage.pageNumber
                ? null
                : rightPage.pageNumber
            )
          }
          editingText={editingText}
          onEditText={onEditText}
          onSaveText={onSaveText}
          width={350}
          height={500}
        />
      </div>

      {/* Botón siguiente */}
      <button
        onClick={onNextSpread}
        disabled={currentSpread >= totalSpreads - 1}
        className='p-3 rounded-full bg-surface border border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all'>
        <ChevronRight className='w-6 h-6' />
      </button>
    </motion.div>
  );
}

// ============================================
// VISTA PÁGINA ÚNICA
// ============================================

interface SinglePageViewProps {
  page: BookPage | null;
  pageNumber: number;
  totalPages: number;
  selectedPage: number | null;
  onSelectPage: (page: number | null) => void;
  editingText: { pageNumber: number; text: string } | null;
  onEditText: (edit: { pageNumber: number; text: string } | null) => void;
  onSaveText: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

function SinglePageView({
  page,
  pageNumber,
  totalPages,
  selectedPage,
  onSelectPage,
  editingText,
  onEditText,
  onSaveText,
  onPrevPage,
  onNextPage,
}: SinglePageViewProps) {
  const isCover = pageNumber === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className='flex items-center gap-6'>
      {/* Botón anterior */}
      <button
        onClick={onPrevPage}
        disabled={pageNumber === 0}
        className='p-3 rounded-full bg-surface border border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all'>
        <ChevronLeft className='w-6 h-6' />
      </button>

      {/* Página */}
      <div className={`relative ${isCover ? "transform scale-105" : ""}`}>
        {isCover && (
          <div className='absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-sm font-bold px-4 py-1 rounded-full'>
            PORTADA
          </div>
        )}
        <PageRenderer
          page={page}
          isSelected={selectedPage === page?.pageNumber}
          onSelect={() =>
            page &&
            onSelectPage(
              selectedPage === page.pageNumber ? null : page.pageNumber
            )
          }
          editingText={editingText}
          onEditText={onEditText}
          onSaveText={onSaveText}
          width={isCover ? 450 : 400}
          height={isCover ? 640 : 570}
          isCover={isCover}
        />
      </div>

      {/* Botón siguiente */}
      <button
        onClick={onNextPage}
        disabled={pageNumber >= totalPages - 1}
        className='p-3 rounded-full bg-surface border border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all'>
        <ChevronRight className='w-6 h-6' />
      </button>
    </motion.div>
  );
}

// ============================================
// VISTA PREVISUALIZACIÓN
// ============================================

interface PreviewViewProps {
  book: BookData;
  currentPage: number;
  onPageChange: (page: number) => void;
}

function PreviewView({ book, currentPage, onPageChange }: PreviewViewProps) {
  const page = book.pages[currentPage];
  const isCover = currentPage === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='relative w-full h-full flex items-center justify-center'>
      {/* Fondo difuminado */}
      {page?.imageUrl && (
        <div
          className='absolute inset-0 bg-cover bg-center blur-3xl opacity-30'
          style={{ backgroundImage: `url(${page.imageUrl})` }}
        />
      )}

      {/* Contenedor de página con sombra 3D */}
      <div className='relative'>
        <div
          className={`relative bg-white rounded-lg overflow-hidden shadow-2xl ${
            isCover ? "ring-4 ring-primary/50" : ""
          }`}
          style={{
            width: isCover ? 400 : 380,
            height: isCover ? 570 : 540,
            transform: isCover ? "perspective(1000px) rotateY(-5deg)" : "none",
          }}>
          {page?.imageUrl && (
            <img
              src={page.imageUrl}
              alt={`Página ${page.pageNumber}`}
              className='w-full h-full object-cover'
            />
          )}

          {/* Texto de la página */}
          {page?.text && !isCover && (
            <div
              style={{
                ...getTextPositionStyles(
                  (page.textPosition as TextPosition) || "bottom"
                ),
                ...getTextBackgroundStyles(
                  (page.textBackground as TextBackground) || "gradient"
                ),
                ...getTextFontStyles(
                  (page.textStyle as TextStyle) || "default"
                ),
                color: page.textColor || "#FFFFFF",
              }}>
              <p className='text-sm leading-relaxed'>{page.text}</p>
            </div>
          )}

          {/* Título en portada */}
          {isCover && (
            <div className='absolute inset-0 flex flex-col items-center justify-end p-6'>
              <div className='text-center bg-black/60 rounded-xl p-4 backdrop-blur-sm'>
                <h2 className='text-2xl font-bold text-white mb-1'>
                  {book.title || `La aventura de ${book.kidName}`}
                </h2>
                <p className='text-white/80 text-sm'>Una historia mágica</p>
              </div>
            </div>
          )}

          {/* Número de página */}
          {!isCover && (
            <div className='absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded'>
              {page?.pageNumber}
            </div>
          )}
        </div>

        {/* Efecto de páginas apiladas */}
        <div
          className='absolute -z-10 bg-gray-100 rounded-lg'
          style={{
            width: isCover ? 400 : 380,
            height: isCover ? 570 : 540,
            top: 4,
            left: 4,
          }}
        />
        <div
          className='absolute -z-20 bg-gray-200 rounded-lg'
          style={{
            width: isCover ? 400 : 380,
            height: isCover ? 570 : 540,
            top: 8,
            left: 8,
          }}
        />
      </div>

      {/* Navegación */}
      <button
        onClick={() => currentPage > 0 && onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className='absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 shadow-lg hover:bg-white disabled:opacity-30 transition-all'>
        <ChevronLeft className='w-6 h-6' />
      </button>
      <button
        onClick={() =>
          currentPage < book.pages.length - 1 && onPageChange(currentPage + 1)
        }
        disabled={currentPage >= book.pages.length - 1}
        className='absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 shadow-lg hover:bg-white disabled:opacity-30 transition-all'>
        <ChevronRight className='w-6 h-6' />
      </button>

      {/* Indicador de página */}
      <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2'>
        {book.pages.map((_, idx) => (
          <button
            key={idx}
            onClick={() => onPageChange(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              idx === currentPage
                ? "bg-primary w-6"
                : "bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// VISTA PORTADA
// ============================================

interface CoverViewProps {
  book: BookData;
  coverPage: BookPage | null;
}

function CoverView({ book, coverPage }: CoverViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, rotateY: -20 }}
      animate={{ opacity: 1, rotateY: 0 }}
      exit={{ opacity: 0, rotateY: 20 }}
      className='relative'
      style={{ perspective: "1000px" }}>
      {/* Portada 3D */}
      <div
        className='relative bg-white rounded-xl overflow-hidden shadow-2xl'
        style={{
          width: 450,
          height: 640,
          transform: "rotateY(-8deg) rotateX(2deg)",
          transformStyle: "preserve-3d",
        }}>
        {coverPage?.imageUrl && (
          <img
            src={coverPage.imageUrl}
            alt='Portada'
            className='w-full h-full object-cover'
          />
        )}

        {/* Overlay con título */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col'>
          {/* Parte superior */}
          <div className='p-6'>
            <div className='inline-block bg-primary text-white text-xs font-bold px-3 py-1 rounded-full'>
              Cuento Personalizado
            </div>
          </div>

          {/* Parte inferior - Título */}
          <div className='mt-auto p-6'>
            <h1 className='text-3xl font-bold text-white mb-2'>
              {book.title || `La aventura de ${book.kidName}`}
            </h1>
            <p className='text-white/80'>Protagonista: {book.kidName}</p>
            <div className='flex items-center gap-2 mt-4'>
              <div className='w-8 h-8 rounded-full bg-white/20 flex items-center justify-center'>
                <span className='text-white text-xs'>IA</span>
              </div>
              <span className='text-white/60 text-sm'>Creado con LibrosIA</span>
            </div>
          </div>
        </div>

        {/* Efecto de brillo */}
        <div
          className='absolute inset-0 pointer-events-none'
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Lomo del libro */}
      <div
        className='absolute bg-gradient-to-r from-gray-600 to-gray-500 rounded-l-sm'
        style={{
          width: 30,
          height: 640,
          left: -30,
          top: 0,
          transform: "rotateY(90deg) translateZ(15px)",
          transformOrigin: "right center",
        }}
      />

      {/* Sombra */}
      <div
        className='absolute bg-black/30 blur-xl rounded-full'
        style={{
          width: 400,
          height: 40,
          bottom: -30,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
    </motion.div>
  );
}

// ============================================
// RENDERIZADOR DE PÁGINA
// ============================================

interface PageRendererProps {
  page: BookPage | null;
  isSelected: boolean;
  onSelect: () => void;
  editingText: { pageNumber: number; text: string } | null;
  onEditText: (edit: { pageNumber: number; text: string } | null) => void;
  onSaveText: () => void;
  width: number;
  height: number;
  isCover?: boolean;
}

function PageRenderer({
  page,
  isSelected,
  onSelect,
  editingText,
  onEditText,
  onSaveText,
  width,
  height,
  isCover = false,
}: PageRendererProps) {
  if (!page) {
    return (
      <div
        className='bg-white flex items-center justify-center text-text-muted'
        style={{ width, height }}>
        Página vacía
      </div>
    );
  }

  const isEditing = editingText?.pageNumber === page.pageNumber;
  const textPosition = (page.textPosition as TextPosition) || "bottom";
  const textBackground = (page.textBackground as TextBackground) || "gradient";
  const textStyle = (page.textStyle as TextStyle) || "default";
  const textColor = page.textColor || "#FFFFFF";

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditText({
      pageNumber: page.pageNumber,
      text: page.text || "",
    });
  };

  return (
    <div
      className={`relative bg-white cursor-pointer transition-all group ${
        isSelected ? "ring-4 ring-primary" : ""
      }`}
      style={{ width, height }}
      onClick={onSelect}>
      {/* Imagen */}
      {page.imageUrl && (
        <div
          className='absolute inset-0 bg-cover bg-center'
          style={{ backgroundImage: `url(${page.imageUrl})` }}
        />
      )}

      {/* Texto */}
      {page.text && !isCover && (
        <div
          style={{
            ...getTextPositionStyles(textPosition),
            ...getTextBackgroundStyles(textBackground),
            ...getTextFontStyles(textStyle),
            color: textBackground === "bubble" ? "#000" : textColor,
          }}>
          {isEditing ? (
            <div className='space-y-2' onClick={(e) => e.stopPropagation()}>
              <textarea
                value={editingText.text}
                onChange={(e) =>
                  onEditText({ ...editingText, text: e.target.value })
                }
                className='w-full p-2 bg-white/90 text-black text-sm rounded resize-none border'
                rows={4}
                autoFocus
              />
              <div className='flex gap-2'>
                <button
                  onClick={onSaveText}
                  className='px-3 py-1 bg-primary text-white text-xs rounded flex items-center gap-1'>
                  <Check className='w-3 h-3' />
                  Guardar
                </button>
                <button
                  onClick={() => onEditText(null)}
                  className='px-3 py-1 bg-gray-500 text-white text-xs rounded flex items-center gap-1'>
                  <X className='w-3 h-3' />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className='relative'>
              <p className='text-sm leading-relaxed'>{page.text}</p>
              {/* Botón de editar siempre visible en hover */}
              <button
                onClick={handleStartEdit}
                className='absolute -top-2 -right-2 p-1.5 bg-primary rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-primary-hover'
                title='Editar texto'>
                <Edit3 className='w-3 h-3' />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Número de página */}
      <div className='absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs'>
        {page.pageNumber}
      </div>

      {/* Indicador de selección */}
      {isSelected && !isEditing && (
        <div className='absolute top-2 right-2 p-1.5 bg-primary rounded text-white'>
          <Check className='w-3 h-3' />
        </div>
      )}

      {/* Overlay de edición rápida para páginas sin texto o portada */}
      {(isCover || !page.text) && (
        <div className='absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
          <button
            onClick={handleStartEdit}
            className='px-3 py-1.5 bg-primary text-white text-xs rounded-full flex items-center gap-1 shadow-lg hover:bg-primary-hover'>
            <Edit3 className='w-3 h-3' />
            {isCover ? "Editar título" : "Añadir texto"}
          </button>
        </div>
      )}
    </div>
  );
}
