import { ImageResponse } from "next/og";
import { SEO_INDEX, getSeoPage } from "@/lib/seo-pages";

export const alt =
  "LibrosIA: cuento personalizado donde tu hijo es el protagonista.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagen OG de cada página /cuentos/[slug] (misma estética que la raíz:
// mantener en sincronía con src/app/opengraph-image.tsx).
// Sin fuentes externas ni emojis (Satori los descargaría de la red).
function renderOgImage({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "linear-gradient(135deg, #fff7ed 0%, #fed7aa 55%, #fdba74 100%)",
          color: "#1c1917",
        }}>
        {/* Marca */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            {/* Libro abierto dibujado con formas */}
            <div style={{ display: "flex", gap: 4 }}>
              <div
                style={{
                  width: 18,
                  height: 30,
                  background: "#ffffff",
                  borderRadius: "4px 2px 2px 4px",
                }}
              />
              <div
                style={{
                  width: 18,
                  height: 30,
                  background: "#ffffff",
                  borderRadius: "2px 4px 4px 2px",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
            <span style={{ color: "#ea580c" }}>Libros</span>
            <span style={{ color: "#57534e" }}>IA</span>
          </div>
        </div>

        {/* Titular */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {eyebrow ? (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 600,
                color: "#c2410c",
              }}>
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: title.length > 60 ? 60 : 72,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1,
              maxWidth: 1000,
            }}>
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#44403c",
              maxWidth: 1000,
            }}>
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            color: "#57534e",
          }}>
          <span>libros.iconicospace.com</span>
          <div
            style={{
              display: "flex",
              padding: "12px 28px",
              borderRadius: 999,
              background: "#f97316",
              color: "#ffffff",
              fontWeight: 700,
            }}>
            Crear su libro gratis
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

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
    title: page?.h1 ?? "Un cuento donde tu hijo es el protagonista",
    subtitle: "Historia y portada gratis · Ilustrado con IA · También impreso",
  });
}
