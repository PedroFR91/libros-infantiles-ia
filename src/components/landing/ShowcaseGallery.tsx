"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";

interface ShowcaseBook {
  id: string;
  title: string | null;
  theme: string;
  style: string;
  coverUrl: string | null;
  pages: { pageNumber: number; imageUrl: string | null; text: string | null }[];
}

/**
 * Ejemplos reales marcados como `showcase` en el admin (GET /api/showcase).
 * Si no hay ninguno (o la API falla) la sección no se pinta.
 */
export function ShowcaseGallery() {
  const [books, setBooks] = useState<ShowcaseBook[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/showcase", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { books: [] }))
      .then((data: { books?: ShowcaseBook[] }) => {
        if (Array.isArray(data.books)) {
          setBooks(data.books.filter((b) => b.coverUrl));
        }
      })
      .catch(() => {
        /* sin ejemplos: la sección no se muestra */
      });
    return () => controller.abort();
  }, []);

  if (books.length === 0) return null;

  return (
    <section id='ejemplos' aria-labelledby='ejemplos-titulo' className='px-4 py-14 sm:py-20'>
      <div className='max-w-6xl mx-auto'>
        <div className='text-center mb-10'>
          <h2
            id='ejemplos-titulo'
            className='font-display font-semibold text-3xl sm:text-4xl mb-3'>
            Cuentos de verdad
          </h2>
          <p className='text-text-muted text-lg max-w-2xl mx-auto'>
            Portadas y páginas tal y como salen del sistema.
          </p>
        </div>

        <ul className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {books.map((book) => {
            const title = book.title || `Un cuento de ${book.theme}`;
            const sample = book.pages.find((p) => p.text);
            const pages = book.pages.filter((p) => p.imageUrl);
            return (
              <li
                key={book.id}
                className='rounded-2xl bg-bg-light border border-border card-shadow overflow-hidden flex flex-col'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.coverUrl!}
                  alt={`Portada del cuento «${title}»`}
                  loading='lazy'
                  className='w-full aspect-square object-cover'
                />
                <div className='p-5 flex flex-col gap-3 flex-1'>
                  <p className='inline-flex items-center gap-1.5 text-sm font-semibold text-success'>
                    <BadgeCheck className='w-4 h-4' aria-hidden />
                    Ejemplo real generado con LibrosIA, sin retoques
                  </p>
                  <h3 className='font-display font-semibold text-xl leading-snug'>{title}</h3>
                  {pages.length > 0 && (
                    <div className='grid grid-cols-3 gap-2'>
                      {pages.map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={p.pageNumber}
                          src={p.imageUrl!}
                          alt={`Ilustración de la página ${p.pageNumber} de «${title}»`}
                          loading='lazy'
                          className='w-full aspect-square object-cover rounded-lg border border-border'
                        />
                      ))}
                    </div>
                  )}
                  {sample?.text && (
                    <p className='text-text-muted italic line-clamp-3'>«{sample.text}»</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
