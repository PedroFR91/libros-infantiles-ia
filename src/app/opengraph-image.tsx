import { OG_SUBTITLE, renderOgImage } from "@/components/OgCard";

export const alt =
  "LibrosIA: regala un cuento donde el héroe lleva su nombre. Historia y portada gratis; el cuento ilustrado, en PDF en minutos.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOgImage({
    title: "Regala un cuento donde el héroe lleva su nombre",
    subtitle: OG_SUBTITLE,
  });
}
