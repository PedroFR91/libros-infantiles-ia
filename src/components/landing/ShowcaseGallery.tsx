"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen } from "lucide-react";
import {
  AGE_ORDER,
  STYLE_LABELS,
  type ShowcaseBook,
  type ShowcasePage,
} from "@/components/landing/showcase-types";
import { BookReader, bookText, bookTitle, readerPages } from "@/components/landing/BookReader";

// Ejemplos reales marcados como `showcase` en el admin (GET /api/showcase).
// Son libros generados por el sistema con nombres ficticios y sin retoques;
// nunca se rellenan con ejemplos inventados. Si no hay ninguno (o la API
// falla) no se pinta nada.

const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];
const COLLAGE_TILTS = ["-rotate-2", "rotate-2 lg:mt-10", "-rotate-1 lg:mt-4", "rotate-1 lg:mt-12"];

interface InsidePage {
  book: ShowcaseBook;
  page: ShowcasePage;
  view: number;
}

/**
 * 3-4 páginas sueltas para el collage: repartidas entre libros distintos y,
 * dentro de cada libro, espaciadas (no todas del principio).
 */
function pickInsidePages(books: ShowcaseBook[]): InsidePage[] {
  const withPages = books
    .map((book) => {
      const pages = readerPages(book);
      return { book, pages, candidates: pages.filter((p) => p.imageUrl && p.text) };
    })
    .filter((b) => b.candidates.length > 0);
  const totalCandidates = withPages.reduce((n, b) => n + b.candidates.length, 0);
  const want = Math.min(4, totalCandidates);
  // Cuántas páginas salen de cada libro (reparto por turnos)
  const quota = withPages.map(() => 0);
  for (let i = 0, added = 0; added < want; i++) {
    const k = i % withPages.length;
    if (quota[k] < withPages[k].candidates.length) {
      quota[k]++;
      added++;
    }
  }
  const perBook = withPages.map(({ book, pages, candidates }, k) =>
    Array.from({ length: quota[k] }, (_, j) => {
      const page = candidates[Math.floor(((j + 0.5) * candidates.length) / quota[k])];
      return { book, page, view: pages.indexOf(page) + 1 };
    }),
  );
  // Intercala los libros: A1, B1, C1, A2…
  const out: InsidePage[] = [];
  for (let j = 0; out.length < want; j++) {
    for (const list of perBook) if (list[j]) out.push(list[j]);
  }
  return out.slice(0, want);
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap min-h-10 px-3.5 sm:px-4 rounded-full font-semibold text-sm sm:text-[0.95rem] border transition-colors ${
      active
        ? "bg-secondary border-secondary text-white"
        : "bg-surface border-border-strong text-text hover:border-secondary"
    }`;
  return (
    <div
      role='group'
      aria-label={label}
      className='w-[calc(100%+2rem)] -mx-4 px-4 flex items-center gap-2 overflow-x-auto sm:w-auto sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center sm:overflow-visible'>
      <span className='shrink-0 w-12 sm:w-auto text-sm font-bold text-text-muted mr-1'>{label}</span>
      <button type='button' aria-pressed={value === null} onClick={() => onChange(null)} className={chip(value === null)}>
        Todos
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type='button'
          aria-pressed={value === o.value}
          onClick={() => onChange(value === o.value ? null : o.value)}
          className={chip(value === o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ShowcaseGallery() {
  const [books, setBooks] = useState<ShowcaseBook[]>([]);
  const [age, setAge] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [reader, setReader] = useState<{ bookId: string; view: number } | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/showcase", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { books: [] }))
      .then((data: { books?: ShowcaseBook[] }) => {
        if (Array.isArray(data.books)) {
          setBooks(data.books.filter((b) => b.coverUrl && Array.isArray(b.pages)));
        }
      })
      .catch(() => {
        /* sin ejemplos: la sección no se muestra */
      });
    return () => controller.abort();
  }, []);

  if (books.length === 0) return null;

  const ages = AGE_ORDER.filter((a) => books.some((b) => b.ageRange === a));
  const styles = Object.keys(STYLE_LABELS).filter((s) => books.some((b) => b.style === s));
  const visible = books.filter(
    (b) => (!age || b.ageRange === age) && (!style || b.style === style),
  );
  const inside = pickInsidePages(books);
  const readerBook = reader ? books.find((b) => b.id === reader.bookId) : undefined;

  const open = (bookId: string, view = 0) => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setReader({ bookId, view });
  };
  const close = () => {
    setReader(null);
    const opener = openerRef.current;
    requestAnimationFrame(() => opener?.focus());
  };
  const list = visible.length > 1 ? visible : books;
  const otherBook =
    readerBook && list.length > 1
      ? () => {
          const i = list.findIndex((b) => b.id === readerBook.id);
          setReader({ bookId: list[(i + 1) % list.length].id, view: 0 });
        }
      : undefined;

  return (
    <section
      id='ejemplos'
      aria-labelledby='ejemplos-titulo'
      className='px-4 py-14 sm:py-20 bg-linear-to-b from-primary-soft/70 via-bg to-bg border-t border-border scroll-mt-16'>
      <div className='max-w-6xl mx-auto'>
        <div className='text-center mb-8 sm:mb-10'>
          <p className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAF5EE] border border-[#BFE0CB] text-success font-bold text-sm mb-4'>
            <BadgeCheck className='w-4 h-4' aria-hidden />
            Ejemplos reales, sin retoques
          </p>
          <h2
            id='ejemplos-titulo'
            className='font-display font-semibold text-3xl sm:text-5xl tracking-tight mb-3'>
            Hojea cuentos de verdad
          </h2>
          <p className='text-text-muted text-lg max-w-2xl mx-auto'>
            Así salen del sistema: portada y páginas ilustradas con su texto,
            tal cual. Los protagonistas tienen nombres ficticios.
          </p>
        </div>

        {(ages.length > 1 || styles.length > 1) && (
          <div className='mb-6 sm:mb-8 flex flex-col lg:flex-row items-start sm:items-center justify-center gap-2.5 sm:gap-3 lg:gap-8'>
            {ages.length > 1 && (
              <FilterGroup
                label='Edad'
                options={ages.map((a) => ({ value: a, label: `${a} años` }))}
                value={age}
                onChange={setAge}
              />
            )}
            {styles.length > 1 && (
              <FilterGroup
                label='Estilo'
                options={styles.map((s) => ({ value: s, label: STYLE_LABELS[s] }))}
                value={style}
                onChange={setStyle}
              />
            )}
          </div>
        )}

        {visible.length === 0 ? (
          <p className='text-center text-lg text-text-muted py-10'>
            Todavía no hay ejemplos con esa combinación.{" "}
            <button
              type='button'
              onClick={() => {
                setAge(null);
                setStyle(null);
              }}
              className='font-semibold text-primary underline underline-offset-2'>
              Ver todos
            </button>
          </p>
        ) : (
          <ul
            className={`flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pt-3 pb-6 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-12 ${
              visible.length === 1 ? "justify-center" : ""
            }`}>
            {visible.map((book, i) => {
              const title = bookTitle(book);
              const count = readerPages(book).length;
              return (
                <li
                  key={book.id}
                  className='snap-center shrink-0 w-[80%] max-w-[360px] sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]'>
                  <article className='group h-full flex flex-col'>
                    <button
                      type='button'
                      tabIndex={-1}
                      aria-hidden
                      onClick={() => open(book.id)}
                      className={`relative block w-full aspect-square cursor-pointer transition-transform duration-300 ease-out motion-reduce:transition-none ${
                        TILTS[i % TILTS.length]
                      } group-hover:rotate-0 group-hover:-translate-y-2 group-focus-within:rotate-0 group-focus-within:-translate-y-2`}>
                      {/* Cantos de las páginas */}
                      <span className='absolute inset-0 translate-x-[7px] translate-y-[6px] rounded-r-md bg-[#efe3d1] border border-border-strong' />
                      <span className='absolute inset-0 translate-x-[3.5px] translate-y-[3px] rounded-r-md bg-white border border-border' />
                      <span className='absolute inset-0 rounded-r-md rounded-l-[3px] overflow-hidden bg-[#2b2118] shadow-[0_2px_4px_rgba(43,33,24,0.12),0_18px_32px_-12px_rgba(43,33,24,0.4)] group-hover:shadow-[0_4px_8px_rgba(43,33,24,0.12),0_34px_50px_-18px_rgba(43,33,24,0.5)] transition-shadow duration-300'>
                        <Image
                          src={book.coverUrl!}
                          alt=''
                          fill
                          sizes='(min-width: 1024px) 360px, (min-width: 640px) 45vw, 80vw'
                          className='object-cover'
                        />
                        {/* Lomo */}
                        <span className='absolute inset-y-0 left-0 w-[7%] bg-linear-to-r from-black/30 via-white/10 to-transparent' />
                        <span className='absolute inset-y-0 left-[6.5%] w-px bg-black/15' />
                      </span>
                    </button>

                    <div className='pt-6 flex flex-col gap-2 flex-1'>
                      <p className='inline-flex items-start gap-1.5 text-sm font-semibold text-success'>
                        <BadgeCheck className='w-4 h-4 mt-0.5 shrink-0' aria-hidden />
                        Ejemplo real generado con LibrosIA, sin retoques
                      </p>
                      <h3 className='font-display font-semibold text-xl sm:text-2xl leading-snug'>
                        {title}
                      </h3>
                      <ul className='flex flex-wrap gap-1.5 text-sm' aria-label='Detalles'>
                        {book.ageRange && (
                          <li className='px-2.5 py-0.5 rounded-full bg-surface border border-border'>
                            {book.ageRange} años
                          </li>
                        )}
                        {STYLE_LABELS[book.style] && (
                          <li className='px-2.5 py-0.5 rounded-full bg-surface border border-border'>
                            {STYLE_LABELS[book.style]}
                          </li>
                        )}
                        <li className='px-2.5 py-0.5 rounded-full bg-surface border border-border'>
                          Portada + {count} páginas
                        </li>
                      </ul>
                      <p className='text-text-muted text-[0.95rem] line-clamp-2'>
                        <span className='font-semibold text-text'>Idea de partida:</span>{" "}
                        «{book.theme}»
                      </p>
                      <div className='mt-auto pt-2'>
                        <button
                          type='button'
                          onClick={() => open(book.id)}
                          aria-label={`Hojear el cuento «${title}»`}
                          className='w-full inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-xl border-2 border-primary text-primary-hover font-bold hover:bg-primary hover:text-white transition-colors'>
                          <BookOpen className='w-5 h-5' aria-hidden />
                          Hojear el cuento
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
        {visible.length > 1 && (
          <p className='sm:hidden -mt-2 text-center text-sm text-text-muted' aria-hidden>
            Desliza para ver más ejemplos
          </p>
        )}

        {inside.length >= 3 && (
          <div className='mt-16 sm:mt-20'>
            <div className='text-center mb-8 sm:mb-10'>
              <h3 className='font-display font-semibold text-2xl sm:text-4xl mb-2'>
                Así queda por dentro
              </h3>
              <p className='text-text-muted text-lg max-w-2xl mx-auto'>
                Páginas sueltas de los ejemplos, con su texto tal cual. Toca
                una para abrir el cuento por ahí.
              </p>
            </div>
            <ul className='grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6 sm:gap-x-6 lg:gap-x-8 items-start'>
              {inside.map(({ book, page, view }, i) => {
                const title = bookTitle(book);
                return (
                  <li key={`${book.id}-${page.pageNumber}`} className={COLLAGE_TILTS[i % COLLAGE_TILTS.length]}>
                    <button
                      type='button'
                      onClick={() => open(book.id, view)}
                      aria-label={`Abrir «${title}» por la página ${view}`}
                      className='group block w-full text-left rounded-md bg-white p-2 sm:p-3 pb-3 sm:pb-4 border border-border shadow-[0_2px_4px_rgba(43,33,24,0.08),0_16px_28px_-14px_rgba(43,33,24,0.35)] hover:-translate-y-1 hover:rotate-0 transition-transform duration-300 motion-reduce:transition-none'>
                      <span className='relative block aspect-square overflow-hidden rounded-[3px] bg-bg'>
                        <Image
                          src={page.imageUrl!}
                          alt=''
                          fill
                          sizes='(min-width: 1024px) 260px, 45vw'
                          className='object-cover'
                        />
                      </span>
                      <span className='block mt-2.5 sm:mt-3 font-display text-[0.95rem] sm:text-base leading-snug text-text line-clamp-3'>
                        {bookText(page.text)}
                      </span>
                      <span className='block mt-1.5 text-xs sm:text-sm text-text-muted truncate'>
                        «{title}» · pág. {view}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className='mt-14 text-center'>
          <Link
            href='/#empezar'
            className='inline-flex items-center gap-2 min-h-13 px-7 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg transition-colors'>
            Crear el de tu hijo gratis
            <ArrowRight className='w-5 h-5' aria-hidden />
          </Link>
          <p className='mt-3 text-text-muted'>Lees su historia y ves su portada antes de pagar nada.</p>
        </div>
      </div>

      {readerBook && reader && (
        <BookReader
          key={readerBook.id}
          book={readerBook}
          initialView={reader.view}
          onClose={close}
          onOtherBook={otherBook}
        />
      )}
    </section>
  );
}
