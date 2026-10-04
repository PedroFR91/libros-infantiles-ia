// Tipos compartidos entre GET /api/showcase y la galería de la landing.
// Solo datos públicos: nada de userId, emails, kidName ni dedicatoria.

export interface ShowcasePage {
  pageNumber: number;
  imageUrl: string | null;
  text: string | null;
}

export interface ShowcaseBook {
  id: string;
  title: string | null;
  theme: string;
  style: string;
  /** "3-4" | "5-6" | "7-8" | null */
  ageRange: string | null;
  /** "nino" | "nina" | null */
  gender: string | null;
  coverUrl: string | null;
  /** Páginas de la historia (2..13; la 1 es la portada), en orden */
  pages: ShowcasePage[];
}

export const STYLE_LABELS: Record<string, string> = {
  classic: "Cuento clásico",
  comic: "Cómic",
  watercolor: "Acuarela",
  cartoon: "Dibujos animados",
  realistic: "Realista",
  minimalist: "Minimalista",
};

export const AGE_ORDER = ["3-4", "5-6", "7-8"] as const;
