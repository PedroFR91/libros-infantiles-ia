import OpenAI, { toFile } from "openai";
import { createLogger } from "@/lib/logger";

const log = createLogger("openai");

// Lazy initialization para evitar errores en build time
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY no está configurada");
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

// Estilos artísticos disponibles
export const ART_STYLES: Record<string, string> = {
  classic:
    "classic storybook illustration style, warm watercolor textures, soft lighting, reminiscent of Beatrix Potter and classic fairy tale books",
  comic:
    "comic book style with bold outlines, speech bubbles, dynamic poses, vibrant colors, manga-influenced children's illustration",
  watercolor:
    "delicate watercolor painting style, soft pastel colors, dreamy atmosphere, artistic brush strokes, ethereal lighting",
  cartoon:
    "modern cartoon style, bright saturated colors, cute character designs, smooth gradients, Disney/Pixar influenced",
  realistic:
    "semi-realistic digital illustration, detailed textures, cinematic lighting, photorealistic backgrounds with stylized characters",
  minimalist:
    "minimalist illustration style, clean lines, limited color palette, simple shapes, modern children's book aesthetic",
};

// Prompts del sistema para generar cuentos infantiles
export const STORY_SYSTEM_PROMPT = `Eres un escritor experto en cuentos infantiles. Creas historias mágicas, educativas y apropiadas para niños de 3 a 8 años.

REGLAS:
- El protagonista siempre es el niño cuyo nombre te dan
- Las historias son positivas, con valores como amistad, valentía, bondad
- Lenguaje simple y apropiado para niños
- Cada página tiene 2-4 oraciones cortas
- Un libro tiene exactamente 12 páginas
- La primera página es la portada/título
- La última página es el final feliz

REGLAS CRÍTICAS PARA imagePrompt (MUY IMPORTANTE):
- CADA imagePrompt DEBE comenzar con la descripción EXACTA del protagonista
- Usa SIEMPRE los mismos términos para describir al personaje (edad, pelo, ojos, ropa, etc.)
- El estilo artístico debe ser CONSISTENTE en todas las páginas
- Describe la MISMA ropa/vestimenta del protagonista en TODAS las páginas
- Nunca cambies el aspecto físico del personaje entre páginas

FORMATO DE RESPUESTA (JSON):
{
  "title": "Título del cuento",
  "characterSheet": "Descripción detallada y fija del protagonista que se usará en todas las imágenes",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Texto de la página",
      "imagePrompt": "[DEBE EMPEZAR CON: characterSheet]. Descripción de la escena..."
    }
  ]
}`;

export const IMAGE_STYLE_PROMPT = `Children's book illustration, high quality, detailed, professional illustration`;

// Categorías de temas disponibles
export const STORY_CATEGORIES = [
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
] as const;

export type StoryCategory = (typeof STORY_CATEGORIES)[number]["id"];

export interface GeneratedPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
}

export interface GeneratedStory {
  title: string;
  characterSheet: string;
  pages: GeneratedPage[];
}

// Generar historia completa
export async function generateStoryText(
  kidName: string,
  theme: string,
  categories: string[],
  characterDescription?: string | null,
  artStyle: string = "cartoon",
): Promise<GeneratedStory> {
  const categoryText =
    categories.length > 0 ? `con elementos de: ${categories.join(", ")}` : "";

  // Obtener estilo artístico
  const styleDescription = ART_STYLES[artStyle] || ART_STYLES.cartoon;

  // Si hay descripción del personaje desde la foto, la usamos
  const characterBase = characterDescription
    ? `Basándote en esta descripción física real: "${characterDescription}"`
    : `Crea una apariencia única y memorable para ${kidName}`;

  const characterInstructions = `
INSTRUCCIONES CRÍTICAS PARA CONSISTENCIA DEL PERSONAJE:

1. CHARACTER SHEET (obligatorio):
   ${characterBase}
   - Define: edad aproximada, tipo/color de pelo, color de ojos, tono de piel
   - Define: vestimenta específica (colores exactos, tipo de ropa)
   - Esta descripción EXACTA debe aparecer al inicio de CADA imagePrompt
   
2. ESTILO ARTÍSTICO (obligatorio en todas las imágenes):
   "${styleDescription}"
   - Este estilo debe ser IDÉNTICO en las 12 páginas
   - Incluir al final de cada imagePrompt

3. CONSISTENCIA VISUAL:
   - NUNCA cambies el aspecto del protagonista entre páginas
   - Los fondos pueden cambiar, el personaje NO
   - Usa SIEMPRE los mismos colores de ropa
   - Mantén las mismas proporciones del personaje`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: STORY_SYSTEM_PROMPT + characterInstructions },
      {
        role: "user",
        content: `Crea un cuento infantil de 12 páginas donde el protagonista se llama "${kidName}". 
El tema principal es: "${theme}" ${categoryText}.

IMPORTANTE:
1. Primero, crea un "characterSheet" detallado con la apariencia EXACTA del protagonista
2. En CADA imagePrompt, comienza con la descripción del characterSheet
3. Termina CADA imagePrompt con: "${styleDescription}"

Responde SOLO con el JSON incluyendo el campo "characterSheet":
{
  "title": "...",
  "characterSheet": "Descripción detallada del protagonista...",
  "pages": [...]
}`,
      },
    ],
    temperature: 0.7, // Reducido para más consistencia
    max_tokens: 5000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No se pudo generar la historia");
  }

  const story = JSON.parse(content) as GeneratedStory;

  // Asegurar que cada imagePrompt incluya el characterSheet y el estilo
  story.pages = story.pages.map((page) => ({
    ...page,
    imagePrompt: ensureConsistentPrompt(
      page.imagePrompt,
      story.characterSheet,
      styleDescription,
    ),
  }));

  return story;
}

// Función auxiliar para asegurar consistencia en los prompts
function ensureConsistentPrompt(
  prompt: string,
  characterSheet: string,
  artStyle: string,
): string {
  // Si el prompt no comienza con la descripción del personaje, añadirla
  const hasCharacter = prompt
    .toLowerCase()
    .includes(characterSheet.toLowerCase().substring(0, 30));
  const hasStyle = prompt
    .toLowerCase()
    .includes(artStyle.toLowerCase().substring(0, 30));

  let finalPrompt = prompt;

  if (!hasCharacter) {
    finalPrompt = `${characterSheet}. ${finalPrompt}`;
  }

  if (!hasStyle) {
    finalPrompt = `${finalPrompt}. Art style: ${artStyle}`;
  }

  return finalPrompt;
}

// Regenerar una página específica
export async function regeneratePageText(
  kidName: string,
  theme: string,
  pageNumber: number,
  currentText: string,
  characterSheet: string,
  artStyle: string = "cartoon",
  customPrompt?: string,
): Promise<{ text: string; imagePrompt: string }> {
  const styleDescription = ART_STYLES[artStyle] || ART_STYLES.cartoon;

  const prompt = customPrompt
    ? `Regenera la página ${pageNumber} del cuento sobre "${theme}" con el protagonista "${kidName}". 
       Instrucción específica: ${customPrompt}
       Texto actual: "${currentText}"
       Mejora o cambia según la instrucción.
       
       IMPORTANTE: El imagePrompt DEBE comenzar con esta descripción del personaje:
       "${characterSheet}"
       Y terminar con este estilo artístico: "${styleDescription}"`
    : `Regenera la página ${pageNumber} del cuento sobre "${theme}" con el protagonista "${kidName}".
       Texto actual: "${currentText}"
       Crea una versión alternativa manteniendo la coherencia con la historia.
       
       IMPORTANTE: El imagePrompt DEBE comenzar con esta descripción del personaje:
       "${characterSheet}"
       Y terminar con este estilo artístico: "${styleDescription}"`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: STORY_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          prompt +
          '\nResponde SOLO con JSON: { "text": "...", "imagePrompt": "..." }',
      },
    ],
    temperature: 0.9,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No se pudo regenerar la página");
  }

  const result = JSON.parse(content);

  // Asegurar consistencia
  result.imagePrompt = ensureConsistentPrompt(
    result.imagePrompt,
    characterSheet,
    styleDescription,
  );

  return result;
}

// ── Image Generation (gpt-image-1 — character-consistent) ─────────────
// DALL-E 3 deprecated 2026-05-12. gpt-image-1 supports reference images
// via the images.edit endpoint for cross-page character consistency.

/** Image model to use (easy to bump to gpt-image-1.5 later) */
const IMAGE_MODEL = "gpt-image-1";

/**
 * Generate a character reference illustration for visual consistency.
 * Creates a clean, front-facing character portrait on a white background
 * that is then passed as reference to every page illustration.
 */
export async function generateCharacterImage(
  characterSheet: string,
  artStyle: string = "cartoon",
): Promise<Buffer> {
  const styleDescription = ART_STYLES[artStyle] || ART_STYLES.cartoon;

  const prompt = [
    `CHARACTER REFERENCE SHEET for a children's book illustration.`,
    characterSheet + ".",
    `Full-body front-facing view of the character standing in a relaxed neutral pose.`,
    `Plain white background, no other characters, no distracting elements.`,
    `Clear detailed view of face, hair, clothing, and body proportions.`,
    `Art style: ${styleDescription}.`,
    IMAGE_STYLE_PROMPT,
  ].join(" ");

  log.info("Generating character reference image");
  const openai = getOpenAI();
  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No se pudo generar la imagen de referencia del personaje");
  }

  log.info("Character reference image generated");
  return Buffer.from(b64, "base64");
}

/**
 * Generate a page illustration using a character reference image.
 * The reference image is passed to gpt-image-1's edit endpoint so the
 * model preserves the character's face, hair, clothing and proportions.
 */
export async function generateImageWithReference(
  prompt: string,
  referenceBuffer: Buffer,
): Promise<Buffer> {
  const openai = getOpenAI();
  const referenceFile = await toFile(referenceBuffer, "character-ref.png", {
    type: "image/png",
  });

  const fullPrompt = [
    prompt,
    `CRITICAL: The main character MUST look exactly like the character in the reference image.`,
    `Preserve the same face, hairstyle, hair color, eye color, skin tone, clothing, and body proportions.`,
    IMAGE_STYLE_PROMPT,
  ].join(" ");

  const response = await openai.images.edit({
    model: IMAGE_MODEL,
    image: referenceFile,
    prompt: fullPrompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No se pudo generar la imagen con referencia");
  }

  return Buffer.from(b64, "base64");
}

/**
 * Generate a standalone image without character reference (fallback).
 * Uses gpt-image-1 for better prompt adherence than DALL-E 3.
 */
export async function generateImage(prompt: string): Promise<Buffer> {
  const fullPrompt = `${prompt}. ${IMAGE_STYLE_PROMPT}, same character design throughout, consistent art style`;

  const openai = getOpenAI();
  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt: fullPrompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No se pudo generar la imagen");
  }

  return Buffer.from(b64, "base64");
}
