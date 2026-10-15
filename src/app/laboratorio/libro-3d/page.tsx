import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import Book3D from "@/components/Book3D";

// Página de pruebas (no enlazada ni indexada): el libro 3D con los cuentos de
// ejemplo, para decidir dónde lo usamos (landing, mejora al papel...).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Laboratorio · libro 3D", robots: { index: false, follow: false } };

export default async function Libro3DLab() {
  const books = await prisma.book.findMany({
    where: { showcase: true, status: "COMPLETED", coverImageUrl: { not: null } },
    include: { pages: { where: { pageNumber: { gt: 1 } }, orderBy: { pageNumber: "asc" }, select: { imageUrl: true, text: true } } },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return (
    <main className='min-h-screen bg-bg px-4 py-10'>
      <h1 className='font-display text-3xl font-semibold text-center'>Laboratorio: libro en 3D</h1>
      <p className='text-center text-text-muted mt-2'>
        Arrastra para girarlo. «Abrir y hojear» (o tócalo) y pasa páginas con las flechas, tocando a
        cada lado o deslizando; en el ordenador, también con el teclado.
      </p>
      <div className='mt-8 grid gap-6 max-w-4xl mx-auto'>
        {books.map((b) => (
          <figure key={b.id} className='rounded-3xl bg-bg-light border border-border p-3'>
            <Book3D
              className='w-full aspect-[4/3]'
              coverUrl={b.coverImageUrl}
              title={b.title ?? undefined}
              kidName={b.kidName}
              pages={b.pages.map((p) => ({ imageUrl: p.imageUrl, text: p.text ?? "" }))}
            />
            <figcaption className='text-center text-sm text-text-muted pb-2'>{b.title}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
