// ============================================
// TIPOS PARA EL EDITOR DE LIBROS
// ============================================

// Página del libro
export interface BookPage {
  id: string;
  pageNumber: number;
  text: string | null;
  imagePrompt: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  // Nuevos campos de personalización
  textPosition?: TextPosition;
  textStyle?: TextStyle;
  textColor?: string;
  textBackground?: TextBackground;
}

// Datos del libro
export interface BookData {
  id: string;
  title: string | null;
  kidName: string;
  theme: string;
  style: BookStyle;
  status: "DRAFT" | "GENERATING" | "COMPLETED" | "ERROR";
  pages: BookPage[];
}

// Pack de créditos
export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceFormatted: string;
  description: string;
  popular?: boolean;
}

// ============================================
// MODOS DE VISUALIZACIÓN
// ============================================

export type ViewMode = "spread" | "single" | "preview" | "cover";

export const VIEW_MODES = [
  { id: "spread" as ViewMode, label: "Doble página", icon: "BookOpen" },
  { id: "single" as ViewMode, label: "Página completa", icon: "Square" },
  { id: "preview" as ViewMode, label: "Previsualizar", icon: "Eye" },
  { id: "cover" as ViewMode, label: "Portada", icon: "Image" },
];

// ============================================
// POSICIONES DE TEXTO
// ============================================

export type TextPosition =
  | "bottom"
  | "top"
  | "center"
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

export const TEXT_POSITIONS = [
  {
    id: "bottom" as TextPosition,
    label: "Abajo",
    icon: "AlignVerticalJustifyEnd",
  },
  {
    id: "top" as TextPosition,
    label: "Arriba",
    icon: "AlignVerticalJustifyStart",
  },
  {
    id: "center" as TextPosition,
    label: "Centro",
    icon: "AlignVerticalJustifyCenter",
  },
  {
    id: "bottom-left" as TextPosition,
    label: "Abajo izq.",
    icon: "AlignStartVertical",
  },
  {
    id: "bottom-right" as TextPosition,
    label: "Abajo der.",
    icon: "AlignEndVertical",
  },
  {
    id: "top-left" as TextPosition,
    label: "Arriba izq.",
    icon: "AlignStartVertical",
  },
  {
    id: "top-right" as TextPosition,
    label: "Arriba der.",
    icon: "AlignEndVertical",
  },
];

// ============================================
// FONDOS DE TEXTO
// ============================================

export type TextBackground = "none" | "gradient" | "bubble" | "box" | "banner";

export const TEXT_BACKGROUNDS = [
  {
    id: "none" as TextBackground,
    label: "Sin fondo",
    preview: "Texto directo",
  },
  {
    id: "gradient" as TextBackground,
    label: "Degradado",
    preview: "Con sombra",
  },
  {
    id: "bubble" as TextBackground,
    label: "Bocadillo",
    preview: "Estilo cómic",
  },
  { id: "box" as TextBackground, label: "Caja", preview: "Fondo sólido" },
  {
    id: "banner" as TextBackground,
    label: "Banner",
    preview: "Cinta decorativa",
  },
];

// ============================================
// ESTILOS DE TEXTO
// ============================================

export type TextStyle =
  | "default"
  | "handwritten"
  | "comic"
  | "elegant"
  | "playful"
  | "bold";

export const TEXT_STYLES = [
  {
    id: "default" as TextStyle,
    label: "Normal",
    fontFamily: "inherit",
    fontWeight: "normal",
  },
  {
    id: "handwritten" as TextStyle,
    label: "Manuscrito",
    fontFamily: "'Comic Sans MS', cursive",
    fontWeight: "normal",
  },
  {
    id: "comic" as TextStyle,
    label: "Cómic",
    fontFamily: "'Bangers', 'Impact', sans-serif",
    fontWeight: "bold",
  },
  {
    id: "elegant" as TextStyle,
    label: "Elegante",
    fontFamily: "'Georgia', serif",
    fontWeight: "normal",
  },
  {
    id: "playful" as TextStyle,
    label: "Divertido",
    fontFamily: "'Fredoka', 'Comic Sans MS', cursive",
    fontWeight: "500",
  },
  {
    id: "bold" as TextStyle,
    label: "Negrita",
    fontFamily: "inherit",
    fontWeight: "bold",
  },
];

// ============================================
// COLORES DE TEXTO PREDEFINIDOS
// ============================================

export const TEXT_COLORS = [
  { id: "white", color: "#FFFFFF", label: "Blanco" },
  { id: "black", color: "#000000", label: "Negro" },
  { id: "yellow", color: "#FEF08A", label: "Amarillo" },
  { id: "orange", color: "#FDBA74", label: "Naranja" },
  { id: "pink", color: "#F9A8D4", label: "Rosa" },
  { id: "blue", color: "#93C5FD", label: "Azul" },
  { id: "green", color: "#86EFAC", label: "Verde" },
  { id: "purple", color: "#C4B5FD", label: "Morado" },
];

// ============================================
// ESTILOS DE LIBRO
// ============================================

export type BookStyle =
  | "classic"
  | "comic"
  | "watercolor"
  | "cartoon"
  | "realistic"
  | "minimalist";

export const BOOK_STYLES = [
  {
    id: "classic" as BookStyle,
    label: "Cuento Clásico",
    description: "Ilustraciones tradicionales con texto narrativo",
    emoji: "📖",
    textDefaults: {
      position: "bottom" as TextPosition,
      background: "gradient" as TextBackground,
      style: "elegant" as TextStyle,
    },
  },
  {
    id: "comic" as BookStyle,
    label: "Cómic",
    description: "Viñetas con bocadillos de diálogo",
    emoji: "💬",
    textDefaults: {
      position: "top" as TextPosition,
      background: "bubble" as TextBackground,
      style: "comic" as TextStyle,
    },
  },
  {
    id: "watercolor" as BookStyle,
    label: "Acuarela",
    description: "Estilo artístico con colores suaves",
    emoji: "🎨",
    textDefaults: {
      position: "bottom" as TextPosition,
      background: "none" as TextBackground,
      style: "handwritten" as TextStyle,
    },
  },
  {
    id: "cartoon" as BookStyle,
    label: "Dibujos Animados",
    description: "Colores vivos y personajes expresivos",
    emoji: "🌈",
    textDefaults: {
      position: "bottom" as TextPosition,
      background: "box" as TextBackground,
      style: "playful" as TextStyle,
    },
  },
  {
    id: "realistic" as BookStyle,
    label: "Realista",
    description: "Ilustraciones detalladas y realistas",
    emoji: "📸",
    textDefaults: {
      position: "bottom" as TextPosition,
      background: "banner" as TextBackground,
      style: "default" as TextStyle,
    },
  },
  {
    id: "minimalist" as BookStyle,
    label: "Minimalista",
    description: "Diseño limpio con pocos elementos",
    emoji: "⚪",
    textDefaults: {
      position: "center" as TextPosition,
      background: "none" as TextBackground,
      style: "bold" as TextStyle,
    },
  },
];

// ============================================
// CATEGORÍAS TEMÁTICAS
// ============================================

export const THEME_CATEGORIES = [
  { id: "bombero", label: "Bombero", emoji: "🚒" },
  { id: "policia", label: "Policía", emoji: "👮" },
  { id: "explorador", label: "Explorador", emoji: "🧭" },
  { id: "astronauta", label: "Astronauta", emoji: "🚀" },
  { id: "veterinaria", label: "Veterinaria", emoji: "🐾" },
  { id: "pirata", label: "Pirata", emoji: "🏴‍☠️" },
  { id: "princesa", label: "Princesa", emoji: "👑" },
  { id: "dinosaurios", label: "Dinosaurios", emoji: "🦕" },
  { id: "futbol", label: "Fútbol", emoji: "⚽" },
  { id: "espacio", label: "Espacio", emoji: "🌟" },
  { id: "magia", label: "Magia", emoji: "✨" },
  { id: "animales", label: "Animales", emoji: "🦁" },
  { id: "coches", label: "Coches", emoji: "🚗" },
  { id: "oceano", label: "Océano", emoji: "🌊" },
  { id: "superheroe", label: "Superhéroe", emoji: "🦸" },
  { id: "hadas", label: "Hadas", emoji: "🧚" },
];

// ============================================
// CATEGORÍAS DE ESTILO VISUAL
// ============================================

export const VISUAL_CATEGORIES = [
  {
    id: "bright",
    label: "Colores Vivos",
    emoji: "🌈",
    description: "Paleta brillante y saturada",
  },
  {
    id: "pastel",
    label: "Pastel",
    emoji: "🍬",
    description: "Tonos suaves y delicados",
  },
  {
    id: "vintage",
    label: "Vintage",
    emoji: "📜",
    description: "Estética retro y nostálgica",
  },
  {
    id: "fantasy",
    label: "Fantasía",
    emoji: "🦄",
    description: "Elementos mágicos y oníricos",
  },
  {
    id: "nature",
    label: "Naturaleza",
    emoji: "🌿",
    description: "Inspirado en el mundo natural",
  },
  {
    id: "urban",
    label: "Urbano",
    emoji: "🏙️",
    description: "Escenarios de ciudad",
  },
  {
    id: "night",
    label: "Nocturno",
    emoji: "🌙",
    description: "Escenas de noche y estrellas",
  },
  {
    id: "sunny",
    label: "Soleado",
    emoji: "☀️",
    description: "Luz cálida y alegre",
  },
];

// ============================================
// HELPERS
// ============================================

// Obtener estilos CSS para posición de texto
export function getTextPositionStyles(
  position: TextPosition
): React.CSSProperties {
  const baseStyles: React.CSSProperties = {
    position: "absolute",
    padding: "1rem",
    maxWidth: "100%",
  };

  switch (position) {
    case "bottom":
      return { ...baseStyles, bottom: 0, left: 0, right: 0 };
    case "top":
      return { ...baseStyles, top: 0, left: 0, right: 0 };
    case "center":
      return {
        ...baseStyles,
        top: "50%",
        left: 0,
        right: 0,
        transform: "translateY(-50%)",
      };
    case "bottom-left":
      return { ...baseStyles, bottom: 0, left: 0, maxWidth: "60%" };
    case "bottom-right":
      return {
        ...baseStyles,
        bottom: 0,
        right: 0,
        maxWidth: "60%",
        textAlign: "right",
      };
    case "top-left":
      return { ...baseStyles, top: 0, left: 0, maxWidth: "60%" };
    case "top-right":
      return {
        ...baseStyles,
        top: 0,
        right: 0,
        maxWidth: "60%",
        textAlign: "right",
      };
    default:
      return { ...baseStyles, bottom: 0, left: 0, right: 0 };
  }
}

// Obtener estilos CSS para fondo de texto
export function getTextBackgroundStyles(
  background: TextBackground,
  color: string = "#FFFFFF"
): React.CSSProperties {
  switch (background) {
    case "none":
      return {
        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
      };
    case "gradient":
      return {
        background:
          "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
        padding: "2rem 1rem 1rem",
      };
    case "bubble":
      return {
        background: "white",
        color: "#000",
        borderRadius: "1rem",
        padding: "0.75rem 1rem",
        position: "relative",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        border: "2px solid #333",
        margin: "0.5rem",
        maxWidth: "80%",
      };
    case "box":
      return {
        background: "rgba(0,0,0,0.75)",
        borderRadius: "0.5rem",
        padding: "0.75rem 1rem",
        margin: "0.5rem",
      };
    case "banner":
      return {
        background:
          "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.8) 10%, rgba(0,0,0,0.8) 90%, transparent 100%)",
        padding: "0.75rem 2rem",
        textAlign: "center",
      };
    default:
      return {};
  }
}

// Obtener estilos CSS para estilo de texto
export function getTextFontStyles(style: TextStyle): React.CSSProperties {
  const styleConfig = TEXT_STYLES.find((s) => s.id === style);
  if (!styleConfig) return {};

  return {
    fontFamily: styleConfig.fontFamily,
    fontWeight: styleConfig.fontWeight as any,
  };
}
