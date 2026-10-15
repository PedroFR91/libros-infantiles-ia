import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { musicUrl } from "@/lib/narration";
import BookDive from "@/components/BookDive";
import { loadListenBook } from "../loadBook";

// /leer/[id]/3d?s=firma — el cuento inmersivo: el libro en 3D, y al hacer
// scroll (o con los botones) se entra en cada ilustración, que cobra vida.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const book = await loadListenBook((await params).id, (await searchParams).s);
  const title = book ? book.title || `El cuento de ${book.kidName}` : "Cuento no disponible";
  return { title: `${title} · en 3D`, robots: { index: false, follow: false } };
}

export default async function ImmersivePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { s } = await searchParams;
  const book = await loadListenBook(id, s);
  if (!book) notFound();

  const cover = book.pages.find((p) => p.pageNumber === 1);
  const pages = book.pages
    .filter((p) => p.pageNumber > 1 && p.imageUrl)
    .map((p) => ({ imageUrl: p.imageUrl, text: p.text ?? "", audioUrl: p.audioUrl, videoUrl: p.videoUrl }));

  return (
    <BookDive
      title={book.title || `El cuento de ${book.kidName}`}
      kidName={book.kidName}
      coverUrl={book.coverImageUrl ?? cover?.imageUrl ?? null}
      coverVideoUrl={cover?.videoUrl}
      pages={pages}
      musicUrl={musicUrl(book.musicTrack)}
      readUrl={`/leer/${book.id}?s=${s}`}
    />
  );
}
