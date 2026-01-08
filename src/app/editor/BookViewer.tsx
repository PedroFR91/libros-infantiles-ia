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
import PageEditor from "./PageEditor";
import { Wand2, Edit3 as EditIcon, Sparkles, Palette } from "lucide-react";

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
  onUpdatePageText?: (pageNumber: number, text: string) => Promise<void>;
  onGenerateImages?: () => void;
  credits?: number;
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
  onUpdatePageText,
  onGenerateImages,
  credits = 0,
}: BookViewerProps) {
  const totalPages = book.pages.length;
  const [pageEditorOpen, setPageEditorOpen] = useState<number | null>(null);

  // Detectar si el libro está en modo draft (sin imágenes)
  const isDraft =
    book.status === "DRAFT" && book.pages.some((p) => !p.imageUrl);

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

  // Handlers para el PageEditor
  const handleOpenPageEditor = (pageNumber: number) => {
    setPageEditorOpen(pageNumber);
  };

  const handleClosePageEditor = () => {
    setPageEditorOpen(null);
  };

  const handleNavigatePageEditor = (direction: "prev" | "next") => {
    if (pageEditorOpen === null) return;

    if (direction === "prev" && pageEditorOpen > 1) {
      setPageEditorOpen(pageEditorOpen - 1);
    } else if (direction === "next" && pageEditorOpen < totalPages) {
      setPageEditorOpen(pageEditorOpen + 1);
    }
  };

  const handleSavePageText = async (text: string) => {
    if (pageEditorOpen === null || !onUpdatePageText) return;
    await onUpdatePageText(pageEditorOpen, text);
    // No cerramos el editor para permitir seguir editando
  };

  // Encontrar la página actual del editor
  const editorPage =
    pageEditorOpen !== null
      ? book.pages.find((p) => p.pageNumber === pageEditorOpen)
      : null;

  return (
    <div className='flex flex-col h-full'>
      {/* PageEditor Modal */}
      <AnimatePresence>
        {pageEditorOpen !== null && editorPage && (
          <PageEditor
            pageNumber={pageEditorOpen}
            totalPages={totalPages}
            text={editorPage.text || ""}
            imageUrl={editorPage.imageUrl}
            onSave={handleSavePageText}
            onClose={handleClosePageEditor}
            onNavigate={handleNavigatePageEditor}
          />
        )}
      </AnimatePresence>

      {/* Toolbar de modos de vista */}
      <div className='flex-shrink-0 flex items-center justify-between px-2 sm:px-4 py-2 bg-bg-light border-b border-border'>
        {/* Modos de visualización */}
        <div className='flex items-center gap-0.5 sm:gap-1 bg-surface rounded-lg p-0.5 sm:p-1'>
          {VIEW_MODES.filter(
            (mode) => mode.id !== "spread" || window.innerWidth >= 768
          ).map((mode) => (
            <button
              key={mode.id}
              onClick={() => onViewModeChange(mode.id)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
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
        <div className='flex items-center gap-1 sm:gap-2 text-xs sm:text-sm'>
          <span className='text-text-muted hidden xs:inline'>Página</span>
          <span className='font-bold text-primary'>
            {viewMode === "spread"
              ? `${leftPageIndex + 1}${
                  rightPage ? `-${rightPageIndex + 1}` : ""
                }`
              : currentPage + 1}
          </span>
          <span className='text-text-muted'>/ {totalPages}</span>
        </div>

        {/* Título del libro */}
        <div className='text-xs sm:text-sm font-medium text-text truncate max-w-[100px] sm:max-w-[200px] hidden xs:block'>
          {book.title || `Historia de ${book.kidName}`}
        </div>
      </div>

      {/* Banner de estado DRAFT */}
      {isDraft && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-gradient-to-r from-amber-500/20 via-primary/20 to-amber-500/20 border-b border-amber-500/30 px-3 sm:px-4 py-2 sm:py-3'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2'>
            <div className='flex items-center gap-2 sm:gap-3'>
              <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 flex items-center justify-center'>
                <Palette className='w-4 h-4 sm:w-5 sm:h-5 text-amber-500' />
              </div>
              <div>
                <p className='font-semibold text-sm sm:text-base flex items-center gap-2'>
                  <span>Historia lista</span>
                  <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-amber-500' />
                </p>
                <p className='text-xs sm:text-sm text-text-muted'>
                  Haz clic en las páginas para editar textos • Genera
                  ilustraciones cuando estés listo
                </p>
              </div>
            </div>
            {onGenerateImages && (
              <button
                onClick={onGenerateImages}
                disabled={credits < 5}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm transition-all ${
                  credits >= 5
                    ? "bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90"
                    : "bg-gray-500/20 text-gray-500 cursor-not-allowed"
                }`}>
                <Wand2 className='w-4 h-4' />
                <span className='hidden sm:inline'>Generar Ilustraciones</span>
                <span className='sm:hidden'>Ilustrar</span>
              </button>
            )}
          </div>
        </motion.div>
      )}

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
        <div className='flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 overflow-x-auto'>
          {book.pages.map((page, index) => (
            <button
              key={page.id}
              onClick={() => onPageChange(index)}
              onDoubleClick={() => handleOpenPageEditor(page.pageNumber)}
              className={`relative flex-shrink-0 w-12 h-16 sm:w-16 sm:h-20 rounded-md sm:rounded-lg overflow-hidden border-2 transition-all group ${
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
                /* Miniatura placeholder para draft */
                <div className='w-full h-full bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 flex flex-col items-center justify-center'>
                  <Palette className='w-3 h-3 sm:w-4 sm:h-4 text-primary/40' />
                  <span className='text-[8px] text-text-muted mt-0.5'>
                    {page.pageNumber}
                  </span>
                </div>
              )}
              {/* Overlay de edición en hover */}
              <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                <Edit3 className='w-3 h-3 sm:w-4 sm:h-4 text-white' />
              </div>
              {/* Número de página - solo si tiene imagen */}
              {page.imageUrl && (
                <div className='absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] sm:text-[10px] text-center py-0.5'>
                  {page.pageNumber}
                </div>
              )}
              {/* Indicador de portada */}
              {index === 0 && (
                <div className='absolute top-0 left-0 right-0 bg-primary/90 text-white text-[6px] sm:text-[8px] text-center py-0.5'>
                  Portada
                </div>
              )}
            </button>
          ))}
        </div>
        <div className='text-center text-[10px] sm:text-xs text-text-muted pb-1.5 sm:pb-2'>
          {isDraft
            ? "Haz clic en una página para editar el texto"
            : "Doble clic en una miniatura para editar el texto"}
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
      className='hidden md:flex items-center gap-2 lg:gap-4'>
      {/* Botón anterior */}
      <button
        onClick={onPrevSpread}
        disabled={currentSpread === 0}
        className='p-2 lg:p-3 rounded-full bg-surface border border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all'>
        <ChevronLeft className='w-5 h-5 lg:w-6 lg:h-6' />
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
          width={280}
          height={400}
        />

        {/* Lomo */}
        <div className='w-1.5 lg:w-2 bg-gradient-to-r from-gray-300 to-gray-200' />

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
          width={280}
          height={400}
        />
      </div>

      {/* Botón siguiente */}
      <button
        onClick={onNextSpread}
        disabled={currentSpread >= totalSpreads - 1}
        className='p-2 lg:p-3 rounded-full bg-surface border border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all'>
        <ChevronRight className='w-5 h-5 lg:w-6 lg:h-6' />
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
      className='flex items-center gap-2 sm:gap-4 lg:gap-6 w-full justify-center px-2'>
      {/* Botón anterior */}
      <button
        onClick={onPrevPage}
        disabled={pageNumber === 0}
        className='p-2 sm:p-3 rounded-full bg-surface border border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0'>
        <ChevronLeft className='w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6' />
      </button>

      {/* Página */}
      <div className={`relative ${isCover ? "sm:transform sm:scale-105" : ""}`}>
        {isCover && (
          <div className='absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-0.5 sm:py-1 rounded-full'>
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
          width={isCover ? 280 : 260}
          height={isCover ? 400 : 370}
          isCover={isCover}
        />
      </div>

      {/* Botón siguiente */}
      <button
        onClick={onNextPage}
        disabled={pageNumber >= totalPages - 1}
        className='p-2 sm:p-3 rounded-full bg-surface border border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0'>
        <ChevronRight className='w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6' />
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
      {/* Imagen o placeholder para draft */}
      {page.imageUrl ? (
        <div
          className='absolute inset-0 bg-cover bg-center'
          style={{ backgroundImage: `url(${page.imageUrl})` }}
        />
      ) : (
        /* Placeholder visual para cuando no hay imagen (modo DRAFT) */
        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10 flex flex-col items-center justify-center p-4'>
          {/* Patrón decorativo */}
          <div className='absolute inset-0 opacity-30'>
            <div className='absolute top-4 left-4 w-8 h-8 border-2 border-primary/30 rounded-full' />
            <div className='absolute top-8 right-6 w-4 h-4 bg-secondary/20 rounded' />
            <div className='absolute bottom-12 left-8 w-6 h-6 border-2 border-secondary/30 rounded' />
            <div className='absolute bottom-6 right-4 w-5 h-5 bg-primary/15 rounded-full' />
          </div>

          {/* Icono central con animación suave */}
          <motion.div
            className='relative z-10 flex flex-col items-center'
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            <div className='w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-2'>
              <Palette className='w-6 h-6 sm:w-8 sm:h-8 text-primary/60' />
            </div>
            <p className='text-xs sm:text-sm text-text-muted text-center font-medium'>
              Ilustración pendiente
            </p>
            <p className='text-[10px] text-text-muted/70 mt-1'>
              Haz clic para editar texto
            </p>
          </motion.div>
        </div>
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
