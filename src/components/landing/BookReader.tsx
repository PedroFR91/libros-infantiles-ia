"use client";

import { useEffect, useId, useRef, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
} from "lucide-react";
import type { ShowcaseBook, ShowcasePage } from "@/components/landing/showcase-types";

/** Páginas que se pueden hojear (con dibujo o con texto) */
export function readerPages(book: ShowcaseBook): ShowcasePage[] {
  return book.pages.filter((p) => p.imageUrl || p.text);
}

/**
 * Texto de página listo para pintar: la raya de diálogo no se separa de la
 * palabra que la sigue ("—¿Habrá…", "—pregunta Lucía").
 */
export function bookText(text: string | null): string {
  return (text ?? "").replace(/\u2014(?=\S)/g, "\u2014\u2060");
}

export function bookTitle(book: ShowcaseBook): string {
  return book.title?.trim() || "Cuento de ejemplo";
}

// En escritorio la doble página ocupa como mucho el 88 % del ancho y deja
// sitio a la cabecera y a los controles en alto.
const SPREAD_WIDTH = "lg:w-[min(88vw,calc((100dvh-200px)*2))]";
const PAGE_SIZES = "(min-width: 1024px) 44vw, (min-width: 480px) 448px, 100vw";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Lector a pantalla completa de un libro de ejemplo: portada, las páginas
 * (dibujo + texto, como en el libro) y al final la llamada a crear el suyo.
 * Modal accesible: Escape cierra, flechas pasan página, swipe en móvil y el
 * foco no sale del diálogo. Solo carga la vista actual y la siguiente.
 */
export function BookReader({
  book,
  initialView = 0,
  onClose,
  onOtherBook,
}: {
  book: ShowcaseBook;
  /** 0 = portada, 1..n = páginas */
  initialView?: number;
  onClose: () => void;
  /** Si hay más ejemplos: abre el siguiente */
  onOtherBook?: () => void;
}) {
  const pages = readerPages(book);
  const total = pages.length;
  const last = total + 1; // vista final con la llamada a la acción
  const [view, setView] = useState(() => Math.min(Math.max(0, initialView), last));
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const titleId = useId();
  const title = bookTitle(book);

  const go = (delta: number) =>
    setView((v) => Math.min(last, Math.max(0, v + delta)));

  // Bloquea el scroll del fondo y lleva el foco al diálogo
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Teclado: Escape, flechas y foco atrapado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setView((v) => Math.min(last, v + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setView((v) => Math.max(0, v - 1));
      } else if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (nodes.length === 0) return;
        const first = nodes[0];
        const lastNode = nodes[nodes.length - 1];
        const active = document.activeElement;
        const inside = active instanceof Node && root.contains(active);
        if (e.shiftKey && (!inside || active === first)) {
          e.preventDefault();
          lastNode.focus();
        } else if (!e.shiftKey && (!inside || active === lastNode)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, last]);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  };

  const label =
    view === 0 ? "Portada" : view === last ? "Fin del cuento" : `Página ${view} de ${total}`;
  const progress = Math.round((view / last) * 100);

  // Siguiente imagen, para que pasar página sea instantáneo
  const nextImage = view === 0 ? pages[0]?.imageUrl : view < total ? pages[view]?.imageUrl : null;

  let stage: React.ReactNode;
  if (view === 0) {
    stage = (
      <div className='my-auto w-full max-w-md lg:max-w-none lg:w-[min(44vw,calc(100dvh-200px))]'>
        <div className='relative aspect-square w-full rounded-r-md rounded-l-[3px] overflow-hidden bg-[#2b2118] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]'>
          {book.coverUrl && (
            <Image
              src={book.coverUrl}
              alt={`Portada de «${title}»`}
              fill
              sizes={PAGE_SIZES}
              loading='eager'
              className='object-cover'
            />
          )}
          <span
            aria-hidden
            className='absolute inset-y-0 left-0 w-[6%] bg-linear-to-r from-black/30 via-white/10 to-transparent'
          />
        </div>
        <button
          type='button'
          onClick={() => go(1)}
          className='mt-5 mx-auto flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-colors'>
          <BookOpen className='w-5 h-5' aria-hidden />
          Abrir el cuento
        </button>
      </div>
    );
  } else if (view === last) {
    stage = (
      <div className='my-auto w-full max-w-lg rounded-3xl bg-surface text-text p-7 sm:p-10 text-center shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]'>
        <BookOpen className='w-9 h-9 text-primary mx-auto mb-4' aria-hidden />
        <p className='font-display font-semibold text-2xl sm:text-3xl mb-3'>
          ¿Y si el protagonista fuera tu hijo?
        </p>
        <p className='text-text-muted text-lg mb-7'>
          Escribe su nombre y lo que le gusta. Lees su historia y ves su portada
          gratis, sin tarjeta.
        </p>
        <Link
          href='/editor'
          className='inline-flex items-center justify-center gap-2 min-h-13 px-7 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg transition-colors'>
          Crear el de tu hijo gratis
          <ArrowRight className='w-5 h-5' aria-hidden />
        </Link>
        <div className='mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2'>
          <button
            type='button'
            onClick={() => setView(0)}
            className='inline-flex items-center gap-1.5 min-h-11 px-2 font-semibold text-secondary underline-offset-2 hover:underline'>
            <RotateCcw className='w-4 h-4' aria-hidden />
            Volver a empezar
          </button>
          {onOtherBook && (
            <button
              type='button'
              onClick={onOtherBook}
              className='inline-flex items-center gap-1.5 min-h-11 px-2 font-semibold text-secondary underline-offset-2 hover:underline'>
              Ver otro ejemplo
              <ChevronRight className='w-4 h-4' aria-hidden />
            </button>
          )}
        </div>
      </div>
    );
  } else {
    const page = pages[view - 1];
    stage = (
      <div
        className={`my-auto w-full max-w-md lg:max-w-none ${SPREAD_WIDTH} flex flex-col lg:flex-row rounded-md overflow-hidden bg-surface text-text shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]`}>
        <div className='relative aspect-square w-full lg:w-1/2 shrink-0 bg-bg'>
          {page.imageUrl && (
            <Image
              key={page.imageUrl}
              src={page.imageUrl}
              alt={`Ilustración de la página ${view}`}
              fill
              sizes={PAGE_SIZES}
              loading='eager'
              className='object-cover'
            />
          )}
        </div>
        <div className='relative w-full lg:w-1/2 lg:aspect-square flex flex-col'>
          {/* Pliegue central de la doble página */}
          <span
            aria-hidden
            className='hidden lg:block absolute inset-y-0 left-0 w-10 bg-linear-to-r from-[#2b2118]/12 to-transparent'
          />
          <div className='flex-1 flex items-center px-5 pt-5 pb-3 sm:px-7 lg:px-14 lg:py-10 lg:overflow-y-auto'>
            <p className='font-display text-[1.2rem] sm:text-xl lg:text-[1.4rem] xl:text-2xl leading-relaxed whitespace-pre-line'>
              {bookText(page.text)}
            </p>
          </div>
          <p className='pb-3 text-center text-sm text-text-muted' aria-hidden>
            {view}
          </p>
        </div>
      </div>
    );
  }

  return createPortal(
    <div
      ref={dialogRef}
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className='fixed inset-0 z-[100] flex flex-col bg-[#1f1712]/95 text-white backdrop-blur-sm'>
      <div className='flex items-center gap-3 px-4 py-3 sm:px-6'>
        <div className='min-w-0 flex-1'>
          <h2 id={titleId} className='font-display font-semibold text-lg sm:text-xl truncate'>
            {title}
          </h2>
          <p className='flex items-center gap-1.5 text-[0.8rem] sm:text-sm text-white/80'>
            <BadgeCheck className='w-4 h-4 shrink-0 text-[#86EFAC]' aria-hidden />
            Ejemplo real generado con LibrosIA, sin retoques
          </p>
        </div>
        <button
          ref={closeRef}
          type='button'
          onClick={onClose}
          aria-label='Cerrar el cuento'
          className='w-11 h-11 shrink-0 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors'>
          <X className='w-6 h-6' aria-hidden />
        </button>
      </div>

      <div className='flex-1 min-h-0 flex flex-col items-center overflow-y-auto px-4 sm:px-6 py-2'>
        {stage}
      </div>

      <div className='px-4 pt-2 pb-4 sm:pb-6 flex items-center justify-center gap-4 sm:gap-6'>
        <button
          type='button'
          onClick={() => go(-1)}
          disabled={view === 0}
          aria-label='Página anterior'
          className='w-12 h-12 shrink-0 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 flex items-center justify-center transition-colors'>
          <ChevronLeft className='w-7 h-7' aria-hidden />
        </button>
        <div className='w-40 sm:w-56 text-center'>
          <p aria-live='polite' className='text-sm font-semibold mb-1.5'>
            {label}
          </p>
          <div className='h-1.5 rounded-full bg-white/15 overflow-hidden' aria-hidden>
            <div
              className='h-full rounded-full bg-[#FDBA74] transition-[width] duration-300 motion-reduce:transition-none'
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          type='button'
          onClick={() => go(1)}
          disabled={view === last}
          aria-label='Página siguiente'
          className='w-12 h-12 shrink-0 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 flex items-center justify-center transition-colors'>
          <ChevronRight className='w-7 h-7' aria-hidden />
        </button>
      </div>

      {nextImage && (
        <div aria-hidden className='absolute w-px h-px overflow-hidden opacity-0 pointer-events-none'>
          <Image src={nextImage} alt='' width={1024} height={1024} sizes={PAGE_SIZES} loading='eager' />
        </div>
      )}
    </div>,
    document.body,
  );
}
