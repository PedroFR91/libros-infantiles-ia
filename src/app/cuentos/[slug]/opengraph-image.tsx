import { SEO_INDEX, getSeoPage } from "@/lib/seo-pages";
import { OG_SUBTITLE, renderOgImage } from "@/components/OgCard";

export const alt =
  "LibrosIA: cuento personalizado donde tu hijo es el protagonista.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return SEO_INDEX.map((p) => ({ slug: p.slug }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  return renderOgImage({
    eyebrow: page?.label,
    title: page?.h1 ?? "Regala un cuento donde el héroe lleva su nombre",
    subtitle: OG_SUBTITLE,
  });
}
