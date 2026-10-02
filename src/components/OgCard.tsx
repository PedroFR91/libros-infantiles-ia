import { ImageResponse } from "next/og";

// Imagen Open Graph compartida (landing y /cuentos/[slug]) con el tema claro.
// Sin fuentes externas ni emojis (Satori los descargaría de la red).
export const OG_SIZE = { width: 1200, height: 630 };

export function renderOgImage({
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
          padding: "60px 72px",
          background: "#FFF8EE",
          color: "#2B2118",
          borderBottom: "18px solid #C2410C",
        }}>
        {/* Marca */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#C2410C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <div style={{ display: "flex", gap: 4 }}>
              <div
                style={{
                  width: 18,
                  height: 30,
                  background: "#FFF8EE",
                  borderRadius: "4px 2px 2px 4px",
                }}
              />
              <div
                style={{
                  width: 18,
                  height: 30,
                  background: "#FFF8EE",
                  borderRadius: "2px 4px 4px 2px",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
            <span style={{ color: "#C2410C" }}>Libros</span>
            <span style={{ color: "#1E3A5F" }}>IA</span>
          </div>
        </div>

        {/* Titular */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {eyebrow ? (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                color: "#9A3412",
              }}>
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: title.length > 60 ? 58 : 70,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1,
              maxWidth: 1040,
            }}>
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#6B5B4E",
              maxWidth: 1040,
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
            color: "#6B5B4E",
          }}>
          <span>libros.iconicospace.com</span>
          <div
            style={{
              display: "flex",
              padding: "12px 28px",
              borderRadius: 14,
              background: "#C2410C",
              color: "#ffffff",
              fontWeight: 700,
            }}>
            Empezar su cuento gratis
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}

export const OG_SUBTITLE =
  "Historia y portada gratis · Impreso en casa o en PDF";
