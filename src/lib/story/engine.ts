import { getOpenAI } from "@/lib/openai";
import { ART_STYLES } from "@/lib/openai";
import { createLogger } from "@/lib/logger";
import type { AgeRange } from "@/lib/validation";

const log = createLogger("story-engine");

// ============================================
// Motor de historias v2
// ============================================
// 1. Biblia: personajes con ficha visual FIJA, escenarios FIJOS, arco y valor.
// 2. Páginas: texto + escena estructurada (qué personajes, qué escenario, plano, acción).
// 3. Revisión: un editor corrige continuidad, longitud por edad y tono.
// Los prompts de imagen los compone el código a partir de las fichas, así que
// la descripción de un personaje o lugar es idéntica en todas las páginas.

/** Modelo de texto (configurable para comparar calidad/coste) */
const STORY_MODEL = process.env.STORY_MODEL || "gpt-4.1";

export const STORY_PAGES = 12; // páginas de historia (más la portada = página 1)

export interface BibleCharacter {
  id: string;
  name: string;
  role: "protagonist" | "companion" | "secondary";
  kind: string; // "niña", "perro", "dragón"...
  visual: string; // EN, ficha visual fija para los prompts de imagen
  personality: string; // ES
  refUrl?: string | null; // hoja de referencia generada
}

export interface BibleLocation {
  id: string;
  name: string; // ES
  visual: string; // EN, descripción fija para los prompts de imagen
}

export interface StoryBible {
  version: 2;
  title: string;
  value: string; // valor o moraleja
  summary: string;
  palette: string; // EN
  characters: BibleCharacter[];
  locations: BibleLocation[];
  beats: string[];
  cover: SceneSpec;
}

export interface SceneSpec {
  characters: string[]; // ids
  location: string; // id
  shot: "wide" | "medium" | "close-up";
  action: string; // EN: acción, pose y emoción (sin repetir el aspecto)
}

export interface StoryPage {
  pageNumber: number; // 2..13 (la 1 es la portada)
  text: string;
  scene: SceneSpec;
}

export interface CreatedStory {
  title: string;
  bible: StoryBible;
  pages: StoryPage[]; // incluye la portada como pageNumber 1
}

export interface StoryInput {
  kidName: string;
  theme: string;
  ageRange: AgeRange;
  style: string;
  companion?: string | null;
  characterDescription?: string | null; // rasgos sacados de la foto (ES)
}

const AGE_GUIDE: Record<AgeRange, string> = {
  "3-4":
    "Edad 3-4 años: 1-2 frases muy cortas por página (15-30 palabras). Vocabulario muy sencillo y concreto, repeticiones y sonidos (onomatopeyas) que el niño pueda anticipar. Un único problema simple. Nada que dé miedo.",
  "5-6":
    "Edad 5-6 años: 2-4 frases por página (30-55 palabras). Vocabulario sencillo con alguna palabra nueva fácil de entender por el contexto. Algún diálogo breve. Tensión suave que se resuelve bien.",
  "7-8":
    "Edad 7-8 años: 4-6 frases por página (55-90 palabras). Diálogos, algo de humor, un reto con varios intentos y una resolución ingeniosa del protagonista. Vocabulario rico pero claro.",
};

const SHOT_TEXT: Record<SceneSpec["shot"], string> = {
  wide: "Wide establishing shot showing the full setting",
  medium: "Medium shot, characters from the knees up",
  "close-up": "Close-up on the characters' faces and emotions",
};

// ============================================
// Esquemas JSON (structured outputs, strict)
// ============================================

const sceneSchema = {
  type: "object",
  additionalProperties: false,
  required: ["characters", "location", "shot", "action"],
  properties: {
    characters: { type: "array", items: { type: "string" } },
    location: { type: "string" },
    shot: { type: "string", enum: ["wide", "medium", "close-up"] },
    action: { type: "string" },
  },
} as const;

const bibleSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "value",
    "summary",
    "palette",
    "characters",
    "locations",
    "beats",
    "cover",
  ],
  properties: {
    title: { type: "string" },
    value: { type: "string" },
    summary: { type: "string" },
    palette: { type: "string" },
    characters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "role", "kind", "visual", "personality"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: {
            type: "string",
            enum: ["protagonist", "companion", "secondary"],
          },
          kind: { type: "string" },
          visual: { type: "string" },
          personality: { type: "string" },
        },
      },
    },
    locations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "visual"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          visual: { type: "string" },
        },
      },
    },
    beats: { type: "array", items: { type: "string" } },
    cover: sceneSchema,
  },
} as const;

const pagesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["issues", "pages"],
  properties: {
    issues: { type: "array", items: { type: "string" } },
    pages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pageNumber", "text", "scene"],
        properties: {
          pageNumber: { type: "integer" },
          text: { type: "string" },
          scene: sceneSchema,
        },
      },
    },
  },
} as const;

// ============================================
// Llamadas al modelo
// ============================================

async function callJSON<T>(
  name: string,
  schema: object,
  system: string,
  user: string,
  temperature: number,
): Promise<T> {
  const openai = getOpenAI();
  // Los modelos de razonamiento (gpt-5*, o*) no aceptan temperature
  const supportsTemperature = !/^(gpt-5|o\d)/.test(STORY_MODEL);
  const response = await openai.chat.completions.create({
    model: STORY_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    ...(supportsTemperature && { temperature }),
    response_format: {
      type: "json_schema",
      json_schema: { name, schema: schema as Record<string, unknown>, strict: true },
    },
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`Respuesta vacía del modelo (${name})`);
  return JSON.parse(content) as T;
}

const WRITER_RULES = `Eres un autor premiado de álbumes ilustrados infantiles en español de España.
Escribes historias cálidas, con ritmo, que apetece leer en voz alta antes de dormir.
- El protagonista es el niño o niña cuyo nombre te dan; es quien resuelve el problema con sus propias cualidades.
- Valores positivos (valentía, amistad, empatía, curiosidad...) mostrados con hechos, nunca con sermones.
- Nada de violencia, miedo intenso, marcas comerciales, personajes con derechos de autor ni estereotipos.
- Español de España natural; nada de anglicismos innecesarios.`;

async function generateBible(input: StoryInput): Promise<StoryBible> {
  const style = ART_STYLES[input.style] || ART_STYLES.cartoon;
  const protagonistBase = input.characterDescription
    ? `Rasgos REALES del protagonista sacados de su foto (respétalos fielmente en "visual"): ${input.characterDescription}`
    : `Inventa un aspecto entrañable y concreto para el protagonista.`;
  const companion = input.companion?.trim()
    ? `Debe aparecer este compañero de aventura pedido por la familia: "${input.companion.trim()}". Crea su ficha como personaje con role "companion".`
    : `Puedes añadir como mucho un compañero (mascota o amigo) si mejora la historia.`;

  const system = `${WRITER_RULES}

Ahora preparas la BIBLIA del libro antes de escribirlo. Responde en JSON.
- characters: 1 a 3 personajes. El primero, id "prota", role "protagonist", con el nombre exacto que te dan. Ids cortos en minúsculas sin espacios.
- "visual" de cada personaje: EN INGLÉS, 40-70 palabras, ficha visual FIJA y muy concreta para un ilustrador: especie/edad aparente, complexión, cara, ojos, pelo (color, largo, peinado), tono de piel o pelaje, y UN atuendo fijo con colores exactos y un accesorio característico. Nada que dependa de la escena.
- locations: 2 a 4 escenarios. "visual" EN INGLÉS, 30-50 palabras, fijo: elementos clave, materiales, colores, luz y momento del día.
- palette: EN INGLÉS, paleta de color común a todo el libro (5-7 colores).
- beats: exactamente ${STORY_PAGES} frases en español con el arco: planteamiento (1-2), aparición del problema (3), intentos que fallan o se complican (4-8), momento difícil (9), resolución gracias al protagonista (10-11), cierre cálido y tranquilo (12).
- cover: escena de portada (ids de characters y location existentes; action EN INGLÉS describiendo pose y emoción, sin repetir el aspecto).
- title: título corto y bonito en español que incluya el nombre del protagonista.
- value: el valor que trabaja la historia. summary: 2 frases.`;

  const user = `Protagonista: "${input.kidName}".
Tema pedido por la familia: "${input.theme}".
${AGE_GUIDE[input.ageRange]}
${protagonistBase}
${companion}
Estilo de ilustración del libro (tenlo en cuenta al describir): ${style}.`;

  const bible = await callJSON<Omit<StoryBible, "version">>(
    "story_bible",
    bibleSchema,
    system,
    user,
    0.8,
  );
  // El modo strict garantiza la forma, no un mínimo de elementos
  if (!bible.characters.length || !bible.locations.length) {
    throw new Error("Biblia incompleta (sin personajes o sin escenarios)");
  }
  return normalizeBible({ version: 2, ...bible }, input.kidName);
}

async function writePages(
  input: StoryInput,
  bible: StoryBible,
): Promise<StoryPage[]> {
  const system = `${WRITER_RULES}

Escribe el libro página a página siguiendo la biblia. Responde en JSON con "pages" (exactamente ${STORY_PAGES}, pageNumber de 2 a ${STORY_PAGES + 1}, una por beat en orden) e "issues" vacío.
- text: el texto de la página en español. ${AGE_GUIDE[input.ageRange]}
- scene.characters: ids de los personajes que SE VEN en la ilustración (solo ids de la biblia).
- scene.location: id de un escenario de la biblia.
- scene.shot: varía los planos a lo largo del libro (wide/medium/close-up).
- scene.action: EN INGLÉS, 20-40 palabras: qué hacen, pose, expresión y elementos de la escena. NO describas el aspecto de los personajes ni del lugar (ya está en la biblia).
- Mantén la continuidad: objetos que aparecen siguen existiendo, el momento del día avanza con lógica, nadie cambia de ropa.`;

  const user = `BIBLIA:\n${JSON.stringify(stripRefs(bible))}`;
  const result = await callJSON<{ issues: string[]; pages: StoryPage[] }>(
    "story_pages",
    pagesSchema,
    system,
    user,
    0.85,
  );
  return result.pages;
}

async function reviewPages(
  input: StoryInput,
  bible: StoryBible,
  pages: StoryPage[],
): Promise<StoryPage[]> {
  const system = `Eres el editor de una editorial de álbumes ilustrados. Revisas el libro antes de ilustrarlo.
Comprueba y CORRIGE directamente:
1. Continuidad: nombres, objetos, momento del día, quién aparece en cada escena (scene.characters debe incluir a quien actúa en el texto).
2. Longitud y vocabulario según la edad: ${AGE_GUIDE[input.ageRange]}
3. Que el protagonista resuelva el problema y que el final sea cálido.
4. Ortografía y naturalidad del español de España; sin repeticiones torpes.
5. Que solo se usen ids de personajes y escenarios de la biblia.
Devuelve las ${STORY_PAGES} páginas completas (corregidas o iguales) y en "issues" una lista breve de lo que cambiaste.`;

  const user = `BIBLIA:\n${JSON.stringify(stripRefs(bible))}\n\nPÁGINAS:\n${JSON.stringify(pages)}`;
  const result = await callJSON<{ issues: string[]; pages: StoryPage[] }>(
    "story_review",
    pagesSchema,
    system,
    user,
    0.3,
  );
  if (result.issues.length) {
    log.info({ issues: result.issues }, "Revisión de continuidad aplicada");
  }
  return result.pages.length === STORY_PAGES ? result.pages : pages;
}

// ============================================
// API pública
// ============================================

export async function createStory(input: StoryInput): Promise<CreatedStory> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await createStoryOnce(input);
    } catch (error) {
      lastError = error;
      log.warn({ err: error, attempt }, "Historia descartada, reintentando");
    }
  }
  throw lastError;
}

async function createStoryOnce(input: StoryInput): Promise<CreatedStory> {
  const bible = await generateBible(input);
  const draft = await writePages(input, bible);
  const reviewed = await reviewPages(input, bible, draft);
  if (reviewed.length < STORY_PAGES) {
    throw new Error(`Historia incompleta (${reviewed.length} de ${STORY_PAGES} páginas)`);
  }
  const pages = normalizePages(reviewed, bible);

  return {
    title: bible.title,
    bible,
    pages: [
      { pageNumber: 1, text: bible.title, scene: bible.cover },
      ...pages,
    ],
  };
}

/** Prompt de imagen de una página, compuesto a partir de la biblia */
export function composeScenePrompt(
  bible: StoryBible,
  scene: SceneSpec,
  style: string,
): string {
  const styleText = ART_STYLES[style] || ART_STYLES.cartoon;
  const location =
    bible.locations.find((l) => l.id === scene.location) ?? bible.locations[0];
  const characters = scene.characters
    .map((id) => bible.characters.find((c) => c.id === id))
    .filter((c): c is BibleCharacter => !!c);

  return [
    `Children's picture book illustration. Art style: ${styleText}.`,
    `${SHOT_TEXT[scene.shot] ?? SHOT_TEXT.medium}.`,
    `Scene: ${scene.action}`,
    location ? `Setting (${location.name}): ${location.visual}` : "",
    characters.length
      ? `Characters in this scene: ${characters
          .map((c) => `${c.name} (${c.kind}): ${c.visual}`)
          .join(" | ")}`
      : "",
    `Color palette for the whole book: ${bible.palette}.`,
    characters.some((c) => c.refUrl)
      ? `Each character must look exactly like their reference image: same face, hair, skin tone, outfit, colors and proportions.`
      : "",
    `Square composition with a calm, less detailed area in the lower third.`,
    `No text, no letters, no words, no numbers, no signature, no watermark.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Prompt de la portada: protagonista destacado y hueco arriba para el título */
export function composeCoverPrompt(bible: StoryBible, style: string): string {
  return composeScenePrompt(bible, bible.cover, style)
    .replace(
      "Square composition with a calm, less detailed area in the lower third.",
      "Book cover composition: the protagonist is the clear focal point, inviting and joyful. Leave the top 30% of the image as simple sky or background for a title that will be added later.",
    );
}

/** Prompt de la hoja de referencia de un personaje */
export function composeReferencePrompt(
  character: BibleCharacter,
  style: string,
  fromPhoto: boolean,
): string {
  const styleText = ART_STYLES[style] || ART_STYLES.cartoon;
  return [
    fromPhoto
      ? `Turn the child in the photo into a children's picture book character. Keep them clearly recognizable: face shape, eyes, hair color and style, skin tone. Do not copy the photo's clothes or background.`
      : `Character design reference for a children's picture book.`,
    `Character: ${character.name} (${character.kind}). ${character.visual}`,
    `Single full-body view, three-quarter front angle, friendly neutral expression, standing on a plain off-white background. Only this character.`,
    `Art style: ${styleText}.`,
    `No text, no letters, no watermark.`,
  ].join("\n");
}

// ============================================
// Normalización (el modelo puede devolver ids o páginas imperfectas)
// ============================================

function normalizeBible(bible: StoryBible, kidName: string): StoryBible {
  const characters = bible.characters.slice(0, 3);
  if (!characters.some((c) => c.role === "protagonist")) {
    characters[0] = { ...characters[0], role: "protagonist" };
  }
  const protagonist = characters.find((c) => c.role === "protagonist")!;
  protagonist.id = "prota";
  protagonist.name = kidName;

  const locations = bible.locations.slice(0, 4);
  const charIds = new Set(characters.map((c) => c.id));
  const locIds = new Set(locations.map((l) => l.id));
  const cover: SceneSpec = {
    ...bible.cover,
    characters: bible.cover.characters.filter((id) => charIds.has(id)),
    location: locIds.has(bible.cover.location)
      ? bible.cover.location
      : locations[0].id,
  };
  if (!cover.characters.includes("prota")) cover.characters.unshift("prota");

  return { ...bible, characters, locations, cover };
}

function normalizePages(pages: StoryPage[], bible: StoryBible): StoryPage[] {
  const charIds = new Set(bible.characters.map((c) => c.id));
  const locIds = new Set(bible.locations.map((l) => l.id));
  return pages.slice(0, STORY_PAGES).map((page, index) => ({
    pageNumber: index + 2,
    text: page.text.trim(),
    scene: {
      ...page.scene,
      characters: page.scene.characters.filter((id) => charIds.has(id)),
      location: locIds.has(page.scene.location)
        ? page.scene.location
        : bible.locations[0].id,
    },
  }));
}

function stripRefs(bible: StoryBible) {
  return {
    ...bible,
    characters: bible.characters.map(({ refUrl: _refUrl, ...c }) => c),
  };
}

/** Lee la biblia guardada en Book.bible (null si es un libro del motor v1) */
export function parseBible(value: unknown): StoryBible | null {
  if (
    value &&
    typeof value === "object" &&
    (value as StoryBible).version === 2 &&
    Array.isArray((value as StoryBible).characters)
  ) {
    return value as StoryBible;
  }
  return null;
}

export function parseScene(value: unknown): SceneSpec | null {
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as SceneSpec).characters) &&
    typeof (value as SceneSpec).action === "string"
  ) {
    return value as SceneSpec;
  }
  return null;
}
