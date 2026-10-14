import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { appUrl } from "@/lib/appUrl";
import { verifyListenSignature, listenUrl } from "@/lib/listenLink";
import { musicUrl } from "@/lib/narration";
import LiveReader, { type ReaderPage } from "./LiveReader";

// /leer/[id]?s=firma — el cuento narrado: se lee y se escucha página a página.
// Solo lectura (se comparte con la familia); no da acceso al editor.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
};

async function loadBook(id: string, signature?: string) {
  if (!verifyListenSignature(id, signature)) return null;
  const book = await prisma.book.findUnique({
    where: { id },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!book || book.status !== "COMPLETED" || !book.unlockedAt) return null;
  return book;
}

const absolute = (url: string | null | undefined) => (url ? (url.startsWith("http") ? url : appUrl(url)) : undefined);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const book = await loadBook((await params).id, (await searchParams).s);
  if (!book) return { title: "Cuento no disponible · LibrosIA", robots: { index: false } };
  const title = book.title || `El cuento de ${book.kidName}`;
  const cover = absolute(book.coverImageUrl ?? book.pages[0]?.imageUrl);
  return {
    title: `${title} · cuento narrado`,
    description: `Escucha «${title}», un cuento ilustrado y narrado para ${book.kidName}.`,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: `Un cuento ilustrado y narrado para ${book.kidName}. Dale al play.`,
      images: cover ? [{ url: cover, width: 1024, height: 1024 }] : undefined,
    },
  };
}

export default async function ReadPage({ params, searchParams }: Props) {
  const { id } = await params;
  const book = await loadBook(id, (await searchParams).s);
  if (!book) notFound();

  const pages: ReaderPage[] = book.pages
    .map((p) => ({
      pageNumber: p.pageNumber,
      // La portada limpia sustituye a la de muestra una vez pagado
      imageUrl: p.pageNumber === 1 ? (book.coverImageUrl ?? p.imageUrl) : p.imageUrl,
      text: p.pageNumber === 1 ? "" : (p.text ?? ""),
      audioUrl: p.audioUrl,
    }))
    .filter((p) => p.imageUrl);

  return (
    <LiveReader
      title={book.title || `El cuento de ${book.kidName}`}
      kidName={book.kidName}
      dedication={book.dedication}
      pages={pages}
      musicUrl={musicUrl(book.musicTrack)}
      shareUrl={listenUrl(book.id)}
      narrating={!book.narratedAt}
    />
  );
}
