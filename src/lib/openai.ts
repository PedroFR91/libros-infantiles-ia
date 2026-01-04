import OpenAI from "openai";

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
- Las descripciones visuales deben ser coloridas y alegres

FORMATO DE RESPUESTA (JSON):
{
  "title": "Título del cuento",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Texto de la página",
      "imagePrompt": "Descripción detallada para generar la imagen en estilo ilustración infantil"
    }
  ]
}`;

export const IMAGE_STYLE_PROMPT = `Children's book illustration style, cute and colorful, digital art, soft colors, friendly characters, whimsical, storybook illustration, high quality, detailed background, warm lighting`;

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
  pages: GeneratedPage[];
}

// Generar historia completa
export async function generateStoryText(
  kidName: string,
  theme: string,
  categories: string[],
  characterDescription?: string | null
): Promise<GeneratedStory> {
  const categoryText =
    categories.length > 0 ? `con elementos de: ${categories.join(", ")}` : "";

  // Si hay descripción del personaje, la incluimos en las instrucciones
  const characterInstructions = characterDescription
    ? `\n\nIMPORTANTE - APARIENCIA DEL PROTAGONISTA:
El protagonista "${kidName}" debe tener EXACTAMENTE estas características físicas en TODAS las ilustraciones:
${characterDescription}

En cada imagePrompt, incluye esta descripción para mantener la consistencia visual del personaje.`
    : "";

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Modelo eficiente con buena calidad
    messages: [
      { role: "system", content: STORY_SYSTEM_PROMPT + characterInstructions },
      {
        role: "user",
        content: `Crea un cuento infantil de 12 páginas donde el protagonista se llama "${kidName}". 
El tema principal es: "${theme}" ${categoryText}.
Genera el título y el texto de cada página con su prompt de imagen correspondiente.
${
  characterDescription
    ? `Recuerda incluir la descripción física del protagonista (${characterDescription}) en cada imagePrompt para mantener consistencia.`
    : ""
}
Responde SOLO con el JSON, sin markdown ni explicaciones.`,
      },
    ],
    temperature: 0.8,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No se pudo generar la historia");
  }

  return JSON.parse(content) as GeneratedStory;
}

// Regenerar una página específica
export async function regeneratePageText(
  kidName: string,
  theme: string,
  pageNumber: number,
  currentText: string,
  customPrompt?: string
): Promise<{ text: string; imagePrompt: string }> {
  const prompt = customPrompt
    ? `Regenera la página ${pageNumber} del cuento sobre "${theme}" con el protagonista "${kidName}". 
       Instrucción específica: ${customPrompt}
       Texto actual: "${currentText}"
       Mejora o cambia según la instrucción.`
    : `Regenera la página ${pageNumber} del cuento sobre "${theme}" con el protagonista "${kidName}".
       Texto actual: "${currentText}"
       Crea una versión alternativa manteniendo la coherencia con la historia.`;

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

  return JSON.parse(content);
}

// Generar imagen con DALL-E
export async function generateImage(prompt: string): Promise<string> {
  const fullPrompt = `${prompt}. ${IMAGE_STYLE_PROMPT}`;

  const openai = getOpenAI();
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: fullPrompt,
    n: 1,
    size: "1024x1024",
    quality: "standard", // 'hd' para mayor calidad pero más caro
    style: "vivid",
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("No se pudo generar la imagen");
  }

  return imageUrl;
}

// Generar thumbnail (versión pequeña)
export async function generateThumbnail(imageUrl: string): Promise<string> {
  // En producción, usaríamos sharp para redimensionar
  // Por ahora retornamos la misma URL
  return imageUrl;
}
