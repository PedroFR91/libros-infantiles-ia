import { getOpenAI } from "@/lib/openai";
import { ART_STYLES } from "@/lib/openai";
import { CLAUDE_STORY_EFFORT, claudeJSON, isClaudeEnabled } from "@/lib/claude";
import { createLogger } from "@/lib/logger";
import type { AgeRange } from "@/lib/validation";
import { normalizeForMatch } from "@/lib/story/contentSafety";

const log = createLogger("story-engine");

// ============================================
// Motor de historias v2 (biblia v3)
// ============================================
// 1. Biblia: personajes con ficha visual FIJA, escenarios FIJOS, arco y valor.
// 2. Páginas: texto + escena estructurada (personajes, escenario, plano,
//    momento del día y acción).
// 3. Revisión: un editor corrige continuidad, longitud por edad y tono.
// 4. Pulido en código: límite de palabras por edad, clichés y diálogos con
//    raya; las páginas que fallan vuelven al editor (y, si no, se recortan).
// Los prompts de imagen los compone el código a partir de las fichas, así que
// la descripción de un personaje o lugar es idéntica en todas las páginas.
//
// Biblia v3 = v2 + ageRange, gender, timeOfDay en las escenas y fromPhoto en
// el protagonista. parseBible acepta ambas; los campos nuevos son opcionales.

/** Modelo de texto (configurable para comparar calidad/coste) */
const STORY_MODEL = process.env.STORY_MODEL || "gpt-4.1";

export const STORY_PAGES = 12; // páginas de historia (más la portada = página 1)

export type Gender = "nino" | "nina";

export const TIMES_OF_DAY = [
  "morning",
  "midday",
  "afternoon",
  "sunset",
  "night",
] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

/** Máximo de palabras por página según la edad (Q9: el texto no tapa el dibujo) */
export const WORD_LIMITS: Record<AgeRange, number> = {
  "3-4": 30,
  "5-6": 55,
  "7-8": 85,
};

export interface BibleCharacter {
  id: string;
  name: string;
  role: "protagonist" | "companion" | "secondary";
  kind: string; // "niña", "perro", "dragón"...
  visual: string; // EN, ficha visual fija para los prompts de imagen
  personality: string; // ES
  refUrl?: string | null; // hoja de referencia generada
  /** La hoja de referencia se hizo a partir de la foto del niño (no regenerar sin ella) */
  fromPhoto?: boolean;
  /** La hoja con foto se perdió y se rehízo sin foto: revisar parecido */
  photoRefLost?: boolean;
}

export interface BibleLocation {
  id: string;
  name: string; // ES
  visual: string; // EN, descripción fija para los prompts de imagen
}

export interface StoryBible {
  version: 2 | 3;
  title: string;
  value: string; // valor o moraleja
  summary: string;
  palette: string; // EN
  characters: BibleCharacter[];
  locations: BibleLocation[];
  beats: string[];
  cover: SceneSpec;
  /** v3: edad del lector/protagonista (proporciones del dibujo y texto) */
  ageRange?: AgeRange;
  /** v3: género del protagonista (concordancia y aspecto); null = sin indicar */
  gender?: Gender | null;
}

export interface SceneSpec {
  characters: string[]; // ids
  location: string; // id
  shot: "wide" | "medium" | "close-up";
  /** v3: momento del día de esta escena (la ficha del escenario ya no lo fija) */
  timeOfDay?: TimeOfDay;
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
  gender?: Gender | null;
}

const AGE_GUIDE: Record<AgeRange, string> = {
  "3-4": `Edad 3-4 años: 1-2 frases muy cortas por página (15-${WORD_LIMITS["3-4"]} palabras, NUNCA más de ${WORD_LIMITS["3-4"]}). Vocabulario muy sencillo y concreto, repeticiones y sonidos que el niño pueda anticipar. Un único problema simple. Nada que dé miedo: si algo inquieta, resulta ser amable o gracioso.`,
  "5-6": `Edad 5-6 años: 2-4 frases cortas por página (30-${WORD_LIMITS["5-6"]} palabras, NUNCA más de ${WORD_LIMITS["5-6"]}). Vocabulario sencillo con alguna palabra nueva fácil de entender por el contexto. Algún diálogo breve. Tensión suave que se resuelve bien.`,
  "7-8": `Edad 7-8 años: 3-6 frases por página (50-${WORD_LIMITS["7-8"]} palabras, NUNCA más de ${WORD_LIMITS["7-8"]}). Diálogos, algo de humor, un reto con varios intentos y una resolución ingeniosa del protagonista. Vocabulario rico pero claro.`,
};

/** Estructura narrativa por edad (Q10) */
const AGE_STRUCTURE: Record<AgeRange, { beats: string; rules: string }> = {
  "3-4": {
    beats:
      "planteamiento (1-2), aparece el problema (3), búsqueda con repetición en la que cada página suma algo (4-9), el protagonista lo resuelve (10-11), cierre cálido y tranquilo (12)",
    rules:
      "ESTRIBILLO ACUMULATIVO: inventa un estribillo de 6 a 10 palabras, rítmico y fácil de repetir en voz alta, que aparece en las páginas de historia 3, 5, 7, 9 y 12 (pageNumber 4, 6, 8, 10 y 13). Cada vez puede sumar un elemento nuevo; en la 12 cierra la historia.",
  },
  "5-6": {
    beats:
      "planteamiento (1-2), aparece el problema (3), primer intento que falla (4-5), segundo intento que casi sale (6-7), momento difícil (8-9), tercer intento y resolución gracias al protagonista (10-11), cierre cálido y tranquilo (12)",
    rules:
      "REGLA DE TRES: el protagonista intenta resolver el problema TRES veces; el primer intento falla, el segundo casi sale y el tercero funciona gracias a su cualidad (no por magia ni porque lo arregle un adulto).",
  },
  "7-8": {
    beats:
      "planteamiento (1-2), aparece el problema (3), primer intento que falla (4-5), segundo intento que se complica (6-7), momento difícil (8-9), tercer intento ingenioso y resolución gracias al protagonista (10-11), cierre cálido con un detalle de humor (12)",
    rules:
      "REGLA DE TRES: el protagonista intenta resolver el problema TRES veces; el primer intento falla, el segundo se complica y el tercero funciona por su ingenio (no por magia ni porque lo arregle un adulto).",
  },
};

/** Edad aparente y proporciones explícitas para el dibujo (Q8) */
const AGE_LOOK: Record<AgeRange, { years: number; proportions: string }> = {
  "3-4": { years: 4, proportions: "head about 1/4 of body height, short rounded limbs" },
  "5-6": { years: 6, proportions: "head about 1/4 of body height" },
  "7-8": { years: 8, proportions: "head about 1/5 of body height, slimmer limbs" },
};

const SHOT_TEXT: Record<SceneSpec["shot"], string> = {
  wide: "Wide establishing shot showing the full setting",
  medium: "Medium shot, characters from the knees up",
  "close-up": "Close-up on the characters' faces and emotions",
};

const TIME_TEXT: Record<TimeOfDay, string> = {
  morning: "morning, fresh soft light and long gentle shadows",
  midday: "midday, bright even daylight",
  afternoon: "afternoon, warm golden light",
  sunset: "sunset, orange and pink sky with long warm shadows",
  night: "night, deep blue sky, moonlight and warm cozy lamp glow (calm, never scary)",
};

const NO_TEXT_RULE =
  "Absolutely no text anywhere in the image: no letters, words, numbers, signs, labels, captions, speech balloons, writing on books, maps or screens, no signature, no watermark. Any book, map, sign or screen is blank or shows only simple pictures.";

const ANATOMY_RULE =
  "Correct anatomy: every person has two arms, two legs and five fingers on each hand; children keep child proportions.";

// ============================================
// Esquemas JSON (structured outputs, strict)
// ============================================

const sceneSchema = {
  type: "object",
  additionalProperties: false,
  required: ["characters", "location", "shot", "timeOfDay", "action"],
  properties: {
    characters: { type: "array", items: { type: "string" } },
    location: { type: "string" },
    shot: { type: "string", enum: ["wide", "medium", "close-up"] },
    timeOfDay: { type: "string", enum: [...TIMES_OF_DAY] },
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

const textFixSchema = {
  type: "object",
  additionalProperties: false,
  required: ["pages"],
  properties: {
    pages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pageNumber", "text"],
        properties: {
          pageNumber: { type: "integer" },
          text: { type: "string" },
        },
      },
    },
  },
} as const;

const singlePageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text", "scene"],
  properties: {
    text: { type: "string" },
    scene: sceneSchema,
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
  // Con clave de Anthropic, el texto lo escribe Claude (sin temperature: los
  // modelos actuales no la aceptan; la variedad viene del propio modelo)
  if (isClaudeEnabled()) {
    return claudeJSON<T>({ name, schema, system, content: user, effort: CLAUDE_STORY_EFFORT });
  }
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
- Nada de violencia, miedo intenso, marcas comerciales, personajes con derechos de autor ni estereotipos. Si el tema roza un personaje conocido, crea uno original.
- Español de España natural; nada de anglicismos innecesarios.`;

/** Reglas literarias comunes (Q10) */
const LITERARY_RULES = `ESTILO LITERARIO (obligatorio):
- Frases cortas y con ritmo para leer en voz alta; verbos concretos; nada de adjetivos en cadena.
- Diálogos SIEMPRE con raya de diálogo (—¿Vienes? —preguntó Leo.), NUNCA con comillas.
- Algunas onomatopeyas (¡Plof!, ¡Fiuuu!) repartidas por el libro. Preguntas directas al lector: COMO MÁXIMO 3 en todo el libro y nunca en dos páginas seguidas; la mayoría de páginas NO terminan en pregunta.
- Cada página termina con un pequeño gancho que invita a pasar la página (una acción a medias, un sonido, una sorpresa), salvo la última, que cierra en calma.
- El problema queda claro en la página 3 y lo resuelve el protagonista con una idea o una cualidad suya (no por casualidad ni porque aparezca algo de la nada). Lo que resuelve el final tiene que estar sembrado antes en la historia.
- La última página cierra con una imagen concreta, tierna y cotidiana (abrazo, cama, merienda, mirada al cielo), sin moraleja y sin frases abstractas como "huele a aventura".
- Muestra, no expliques: el valor se ve en lo que hace el protagonista. Prohibidas las moralejas explícitas.
- CLICHÉS PROHIBIDOS: "érase una vez", "había una vez", "de repente", "colorín colorado", "aprendió que", "comprendió que", "de oreja a oreja", "vivieron felices", "la lección", y la palabra "mágico/mágica" más de una vez en todo el libro.
- Nombres de personajes secundarios inventados: españoles, cortos y poco trillados (como Olmo, Brezo, Telmo, Vera, Ciro, Lola, Nilo). Prohibidos Luna, Chispa, Sparkle, Estrella, Brillo, Max y similares. Si la familia da un nombre, se respeta tal cual.`;

const IMAGE_SAFE_ACTION = `- scene.action: NUNCA incluyas objetos con letras o números: carteles, letreros, libros abiertos con texto, cuadernos escritos, pizarras, marcadores, relojes con números, mapas con letras, etiquetas o pantallas. Si hace falta un mapa, es un mapa solo de dibujos; los libros, cerrados.`;

function genderGuide(name: string, gender: Gender | null | undefined): string {
  if (gender === "nina") {
    return `${name} es una NIÑA: usa concordancia femenina en todo el texto (contenta, cansada, la primera) y dale aspecto de niña.`;
  }
  if (gender === "nino") {
    return `${name} es un NIÑO: usa concordancia masculina en todo el texto (contento, cansado, el primero) y dale aspecto de niño.`;
  }
  return `No sabemos si ${name} es niño o niña: escribe SIN marcar el género de ${name} (evita adjetivos y participios con -o/-a referidos a ${name}: "con mucho sueño" en vez de "cansado/a", "dio un salto de alegría" en vez de "contento/a"; nada de "el niño"/"la niña"). Su aspecto visual debe encajar con cualquiera, salvo que los rasgos de la foto digan otra cosa.`;
}

function protagonistKind(gender: Gender | null | undefined): string {
  if (gender === "nina") return "niña";
  if (gender === "nino") return "niño";
  return "peque";
}

async function generateBible(input: StoryInput): Promise<StoryBible> {
  const style = ART_STYLES[input.style] || ART_STYLES.cartoon;
  const structure = AGE_STRUCTURE[input.ageRange];
  const look = AGE_LOOK[input.ageRange];
  const protagonistBase = input.characterDescription
    ? `Rasgos REALES del protagonista sacados de su foto (respétalos fielmente en "visual", incluidas gafas, audífonos, silla de ruedas u otros apoyos si los menciona): ${input.characterDescription}`
    : `Inventa un aspecto entrañable y concreto para el protagonista.`;
  const companion = input.companion?.trim()
    ? `Debe aparecer este compañero de aventura pedido por la familia: "${input.companion.trim()}". Crea su ficha como personaje con role "companion" y respeta el nombre que dan.`
    : `Puedes añadir como mucho un compañero (mascota o amigo) si mejora la historia.`;

  const system = `${WRITER_RULES}

${LITERARY_RULES}

Ahora preparas la BIBLIA del libro antes de escribirlo. Responde en JSON.
- characters: 1 a 3 personajes. El primero, id "prota", role "protagonist", con el nombre exacto que te dan y kind "${protagonistKind(input.gender)}". Ids cortos en minúsculas sin espacios.
- "visual" de cada personaje: EN INGLÉS, 40-70 palabras, ficha visual FIJA y muy concreta para un ilustrador: especie/edad aparente, complexión, cara, ojos, pelo (color, largo, peinado), tono de piel o pelaje, y UN atuendo fijo con colores exactos y un accesorio característico. Nada que dependa de la escena. Sin letras, números ni logotipos en la ropa. El protagonista aparenta unos ${look.years} años.
- locations: 2 a 4 escenarios. "visual" EN INGLÉS, 30-50 palabras, fijo: elementos clave, materiales y colores. NO indiques hora del día ni iluminación (eso va en cada escena). Sin carteles ni rótulos.
- palette: EN INGLÉS, paleta de color común a todo el libro (5-7 colores).
- beats: exactamente ${STORY_PAGES} frases en español con el arco: ${structure.beats}.
- ${structure.rules} Anota el estribillo o los tres intentos en los beats correspondientes.
- cover: escena de portada (ids de characters y location existentes; timeOfDay; action EN INGLÉS describiendo pose y emoción, sin repetir el aspecto y sin objetos con letras).
- title: MÁXIMO 6 palabras, con el nombre del protagonista y un elemento concreto e insólito (como "Leo y la nube con hipo" o "El calcetín volador de Noa"). Nada genérico como "La gran aventura de..." ni "El mundo mágico de...".
- value: el valor que trabaja la historia. summary: 2 frases.`;

  const user = `Protagonista: "${input.kidName}".
${genderGuide(input.kidName, input.gender)}
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
  if (countWords(bible.title) > 6) {
    log.warn({ title: bible.title }, "Título de más de 6 palabras");
  }
  return normalizeBible(
    {
      ...bible,
      version: 3,
      ageRange: input.ageRange,
      gender: input.gender ?? null,
    },
    input.kidName,
    input.gender,
  );
}

function pageWriterRules(input: { ageRange: AgeRange; kidName: string; gender?: Gender | null }): string {
  return `- text: el texto de la página en español. ${AGE_GUIDE[input.ageRange]}
- ${AGE_STRUCTURE[input.ageRange].rules}
- ${genderGuide(input.kidName, input.gender)}
- scene.characters: ids de los personajes que SE VEN en la ilustración (solo ids de la biblia).
- scene.location: id de un escenario de la biblia.
- scene.shot: varía los planos a lo largo del libro (wide/medium/close-up).
- scene.timeOfDay: morning | midday | afternoon | sunset | night. Avanza con lógica a lo largo del libro y coincide con lo que dice el texto (no vuelvas atrás salvo que en el texto pase un día).
- scene.action: EN INGLÉS, 20-40 palabras: qué hacen, pose, expresión y elementos de la escena. NO describas el aspecto de los personajes ni del lugar (ya está en la biblia).
${IMAGE_SAFE_ACTION}`;
}

async function writePages(
  input: StoryInput,
  bible: StoryBible,
): Promise<StoryPage[]> {
  const system = `${WRITER_RULES}

${LITERARY_RULES}

Escribe el libro página a página siguiendo la biblia. Responde en JSON con "pages" (exactamente ${STORY_PAGES}, pageNumber de 2 a ${STORY_PAGES + 1}, una por beat en orden) e "issues" vacío.
${pageWriterRules(input)}
- Mantén la continuidad: objetos que aparecen siguen existiendo, nadie cambia de ropa.`;

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
1. Continuidad: nombres, objetos, momento del día (scene.timeOfDay coherente con el texto y con lógica de avance), quién aparece en cada escena (scene.characters debe incluir a quien actúa en el texto).
2. Longitud y vocabulario según la edad: ${AGE_GUIDE[input.ageRange]} Cuenta las palabras: ninguna página puede pasar de ${WORD_LIMITS[input.ageRange]}.
3. Estructura: ${AGE_STRUCTURE[input.ageRange].rules}
4. Que el protagonista resuelva el problema y que el final sea cálido.
5. ${genderGuide(input.kidName, input.gender)}
6. Estilo: diálogos con raya (—), nunca comillas; ningún cliché prohibido; ganchos al final de página; como máximo 3 preguntas al lector en todo el libro y nunca seguidas (reescribe las que sobren como afirmaciones o acciones); nada de moralejas explícitas.
7. Lógica: el problema planteado en la página 3 se resuelve en las páginas 10-11 por una acción o idea del protagonista que ya estaba sembrada antes; si no es así, reescribe esas páginas para que lo sea. La última página cierra con una imagen concreta y tierna.
8. Ortografía y naturalidad del español de España; sin repeticiones torpes.
9. Que solo se usen ids de personajes y escenarios de la biblia, y que ninguna scene.action incluya objetos con letras o números.

${LITERARY_RULES}

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
// Pulido del texto en código (Q9 + Q10)
// ============================================

/** Palabras de un texto (la raya o los signos sueltos no cuentan) */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

const CLICHES: { label: string; pattern: string }[] = [
  { label: "érase una vez", pattern: "erase una vez" },
  { label: "había una vez", pattern: "habia una vez" },
  { label: "de repente", pattern: "de repente" },
  { label: "colorín colorado", pattern: "colorin colorado" },
  { label: "aprendió que", pattern: "aprendio que" },
  { label: "aprendieron que", pattern: "aprendieron que" },
  { label: "comprendió que", pattern: "comprendio que" },
  { label: "de oreja a oreja", pattern: "de oreja a oreja" },
  { label: "vivieron felices", pattern: "vivieron felices" },
  { label: "la lección", pattern: "la leccion" },
  { label: "moraleja", pattern: "moraleja" },
  { label: "lo más importante es", pattern: "lo mas importante es" },
];

const MAGIC_WORD = /\bm[aá]gic[oa]s?\b/gi;

/** Clichés prohibidos presentes en un texto (sin contar "mágico") */
export function detectCliches(text: string): string[] {
  const normalized = ` ${normalizeForMatch(text)} `;
  return CLICHES.filter((c) => normalized.includes(` ${c.pattern} `)).map(
    (c) => c.label,
  );
}

/** true si el texto usa comillas (inglesas o rectas) en vez de raya */
export function usesQuotes(text: string): boolean {
  return /["“”]/.test(text);
}

export interface PageTextReport {
  words: number;
  limit: number;
  overLimit: boolean;
  cliches: string[];
  quotes: boolean;
  dialogueDash: boolean;
}

/** Métricas de una página (para el pulido y para el banco de pruebas) */
export function analyzePageText(text: string, ageRange: AgeRange): PageTextReport {
  const words = countWords(text);
  const limit = WORD_LIMITS[ageRange];
  return {
    words,
    limit,
    overLimit: words > limit,
    cliches: detectCliches(text),
    quotes: usesQuotes(text),
    dialogueDash: text.includes("—"),
  };
}

/** Problemas por página (pageNumber → descripciones) */
function findTextProblems(
  pages: StoryPage[],
  ageRange: AgeRange,
  lengthOnly: boolean,
): Map<number, string[]> {
  const problems = new Map<number, string[]>();
  const add = (pageNumber: number, problem: string) =>
    problems.set(pageNumber, [...(problems.get(pageNumber) ?? []), problem]);

  let magicSeen = 0;
  for (const page of pages) {
    const report = analyzePageText(page.text, ageRange);
    if (report.overLimit) {
      add(
        page.pageNumber,
        `tiene ${report.words} palabras y el máximo es ${report.limit}: acórtala sin perder lo que pasa ni el gancho final`,
      );
    }
    if (lengthOnly) continue;
    if (report.cliches.length) {
      add(page.pageNumber, `quita estos clichés: ${report.cliches.join(", ")}`);
    }
    if (report.quotes) {
      add(page.pageNumber, "los diálogos van con raya (—), no con comillas");
    }
    const magic = page.text.match(MAGIC_WORD)?.length ?? 0;
    if (magic && magicSeen + magic > 1) {
      add(page.pageNumber, `no uses "mágico/a" (ya aparece antes en el libro)`);
    }
    magicSeen += magic;
  }
  return problems;
}

async function fixPageTexts(
  input: { ageRange: AgeRange; kidName: string; gender?: Gender | null },
  bible: StoryBible,
  pages: StoryPage[],
  problems: Map<number, string[]>,
): Promise<StoryPage[]> {
  const targets = pages.filter((p) => problems.has(p.pageNumber));
  const system = `Eres el editor de una editorial de álbumes ilustrados. Reescribe SOLO las páginas que te paso corrigiendo los problemas indicados.
- Conserva lo que pasa, los nombres, el estribillo (si lo hay) y el gancho final.
- ${AGE_GUIDE[input.ageRange]}
- Máximo ${WORD_LIMITS[input.ageRange]} palabras por página (cuenta las palabras separadas por espacios).
- ${genderGuide(input.kidName, input.gender)}

${LITERARY_RULES}

Devuelve en "pages" exactamente las páginas pedidas, con su mismo pageNumber.`;

  const user = `TÍTULO: ${bible.title}
BEATS: ${JSON.stringify(bible.beats)}

TODO EL LIBRO (contexto, no lo reescribas):
${pages.map((p) => `${p.pageNumber}: ${p.text}`).join("\n")}

PÁGINAS A CORREGIR:
${targets
  .map((p) => `pageNumber ${p.pageNumber}: ${p.text}\nProblemas: ${problems.get(p.pageNumber)!.join("; ")}`)
  .join("\n\n")}`;

  const result = await callJSON<{ pages: { pageNumber: number; text: string }[] }>(
    "story_fix",
    textFixSchema,
    system,
    user,
    0.4,
  );
  const fixed = new Map(
    result.pages
      .filter((p) => problems.has(p.pageNumber) && p.text.trim())
      .map((p) => [p.pageNumber, cleanText(p.text)]),
  );
  return pages.map((p) =>
    fixed.has(p.pageNumber) ? { ...p, text: fixed.get(p.pageNumber)! } : p,
  );
}

/**
 * Último recurso si el editor no consigue acortar: quedarse con las primeras
 * frases que caben en el límite (y, si ni una cabe, cortar por palabras).
 */
export function trimToWordLimit(text: string, limit: number): string {
  if (countWords(text) <= limit) return text;
  const sentences = text.match(/[^.!?…]+[.!?…]+[»"”)]*\s*|[^.!?…]+$/g) ?? [text];
  let result = "";
  for (const sentence of sentences) {
    if (countWords(result + sentence) > limit) break;
    result += sentence;
  }
  if (result.trim()) return result.trim();
  const words = text.split(/\s+/);
  let kept = 0;
  const out: string[] = [];
  for (const word of words) {
    if (/[\p{L}\p{N}]/u.test(word)) kept++;
    if (kept > limit) break;
    out.push(word);
  }
  return `${out.join(" ").replace(/[,;:]$/, "")}…`;
}

/**
 * Pasada de control del texto: hasta 2 rondas con el editor sobre las páginas
 * que fallan; la segunda solo por longitud. Lo que siga fuera de límite se
 * recorta por frases (nunca se guarda una página fuera de límite sin intentarlo).
 */
async function polishPages(
  input: { ageRange: AgeRange; kidName: string; gender?: Gender | null },
  bible: StoryBible,
  pages: StoryPage[],
): Promise<StoryPage[]> {
  let current = pages;
  for (let pass = 1; pass <= 2; pass++) {
    const problems = findTextProblems(current, input.ageRange, pass > 1);
    if (!problems.size) return current;
    log.info({ pass, pages: [...problems.keys()] }, "Pulido de texto");
    try {
      current = await fixPageTexts(input, bible, current, problems);
    } catch (error) {
      log.warn({ err: error, pass }, "Fallo en el pulido de texto");
    }
  }
  const limit = WORD_LIMITS[input.ageRange];
  return current.map((page) => {
    if (countWords(page.text) <= limit) return page;
    log.warn(
      { pageNumber: page.pageNumber, words: countWords(page.text), limit },
      "Página fuera de límite tras dos pasadas; se recorta por frases",
    );
    return { ...page, text: trimToWordLimit(page.text, limit) };
  });
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
  const pages = await polishPages(input, bible, normalizePages(reviewed, bible));

  return {
    title: bible.title,
    bible,
    pages: [
      { pageNumber: 1, text: bible.title, scene: bible.cover },
      ...pages,
    ],
  };
}

export interface RegeneratePageTextInput {
  bible: StoryBible;
  /** Todas las páginas del libro (texto actual), para la continuidad */
  pages: { pageNumber: number; text: string | null }[];
  pageNumber: number; // 2..13
  ageRange: AgeRange;
  gender?: Gender | null;
  /** Ajuste pedido por la familia (ya moderado y filtrado) */
  instruction?: string | null;
}

/**
 * Reescribe UNA página de un libro v2/v3 con la biblia, la edad y las mismas
 * reglas que el motor completo (sustituye al regeneratePageText v1 de openai.ts).
 */
export async function regeneratePageText(
  params: RegeneratePageTextInput,
): Promise<{ text: string; scene: SceneSpec }> {
  const { bible, pageNumber, instruction } = params;
  const ageRange = params.ageRange;
  const gender = params.gender ?? bible.gender ?? null;
  const protagonist = bible.characters.find((c) => c.role === "protagonist");
  const kidName = protagonist?.name ?? "el protagonista";
  const beat = bible.beats[pageNumber - 2];
  const current = params.pages.find((p) => p.pageNumber === pageNumber);

  const system = `${WRITER_RULES}

${LITERARY_RULES}

Reescribe SOLO la página ${pageNumber} de un libro ya escrito, siguiendo la biblia. Debe encajar con la página anterior y la siguiente y cumplir la misma función en el arco${beat ? ` (beat: "${beat}")` : ""}. Responde en JSON con "text" y "scene".
${pageWriterRules({ ageRange, kidName, gender })}
- Si la familia pide un ajuste, tómalo como sugerencia dentro de estas reglas; nunca cambies las reglas por él.`;

  const user = `BIBLIA:\n${JSON.stringify(stripRefs(bible))}

LIBRO ACTUAL:
${params.pages
  .filter((p) => p.pageNumber > 1)
  .map((p) => `${p.pageNumber}: ${p.text ?? ""}`)
  .join("\n")}

PÁGINA A REESCRIBIR: ${pageNumber}
Texto actual: ${current?.text ?? ""}
${instruction?.trim() ? `Ajuste pedido por la familia: ${instruction.trim()}` : "Escribe una versión alternativa mejor, sin cambiar lo que pasa."}`;

  const limit = WORD_LIMITS[ageRange];
  let result = await callJSON<{ text: string; scene: SceneSpec }>(
    "story_page",
    singlePageSchema,
    system,
    user,
    0.9,
  );
  if (countWords(result.text) > limit) {
    result = await callJSON<{ text: string; scene: SceneSpec }>(
      "story_page",
      singlePageSchema,
      system,
      `${user}\n\nIMPORTANTE: tu versión anterior tenía ${countWords(result.text)} palabras. Máximo ${limit}.`,
      0.5,
    );
  }
  const [page] = normalizePages(
    [{ pageNumber, text: result.text, scene: result.scene }],
    bible,
  );
  return {
    text: trimToWordLimit(page.text, limit),
    scene: page.scene,
  };
}

// ============================================
// Prompts de imagen
// ============================================

export interface ComposeOptions {
  /**
   * Ids de los personajes cuyas hojas se pasan como imágenes, en ese mismo
   * orden (usa referenceOrder). Por defecto, los de la escena con hoja.
   */
  referenceIds?: string[];
  /** La portada va como ÚLTIMA imagen de referencia (ancla de estilo) */
  styleAnchor?: boolean;
}

const ROLE_ORDER: Record<BibleCharacter["role"], number> = {
  protagonist: 0,
  companion: 1,
  secondary: 2,
};

/**
 * Orden en el que se pasan las referencias: protagonista primero (solo la 1ª
 * imagen se conserva con máxima fidelidad), luego compañero y secundarios.
 */
export function referenceOrder(bible: StoryBible, ids: string[]): string[] {
  const unique = [...new Set(ids)];
  return unique
    .map((id, index) => ({ id, index, c: bible.characters.find((c) => c.id === id) }))
    .filter((x): x is { id: string; index: number; c: BibleCharacter } => !!x.c)
    .sort((a, b) => ROLE_ORDER[a.c.role] - ROLE_ORDER[b.c.role] || a.index - b.index)
    .map((x) => x.id);
}

function childLook(bible: StoryBible): string | null {
  if (!bible.ageRange) return null;
  const look = AGE_LOOK[bible.ageRange];
  const who =
    bible.gender === "nina" ? "a girl" : bible.gender === "nino" ? "a boy" : "a child";
  return `${who} about ${look.years} years old, ${look.proportions}, five fingers on each hand`;
}

function describeCharacter(bible: StoryBible, c: BibleCharacter): string {
  const look = c.role === "protagonist" ? childLook(bible) : null;
  return `${c.name} (${c.kind}${look ? `; ${look}` : ""}): ${c.visual}`;
}

function referenceMap(
  bible: StoryBible,
  referenceIds: string[],
  styleAnchor: boolean,
): string {
  if (!referenceIds.length && !styleAnchor) return "";
  const lines = referenceIds.map((id, i) => {
    const c = bible.characters.find((ch) => ch.id === id);
    if (!c) return "";
    return c.role === "protagonist"
      ? `Reference image ${i + 1} is ${c.name}, the main character.`
      : `Reference image ${i + 1} is ${c.name} (${c.kind}).`;
  });
  if (styleAnchor) {
    lines.push(
      `Reference image ${referenceIds.length + 1} is the book cover: use it ONLY as the style reference (line work, colors, rendering, character proportions); do not copy its composition, pose or background.`,
    );
  }
  if (referenceIds.length) {
    lines.push(
      "Each character must look exactly like their own reference image: same face, hair, skin tone, outfit, colors and proportions. Never mix features between characters.",
    );
  }
  return lines.filter(Boolean).join(" ");
}

function composePrompt(
  bible: StoryBible,
  scene: SceneSpec,
  style: string,
  options: ComposeOptions,
  composition: string,
): string {
  const styleText = ART_STYLES[style] || ART_STYLES.cartoon;
  const location =
    bible.locations.find((l) => l.id === scene.location) ?? bible.locations[0];
  const characters = referenceOrder(bible, scene.characters)
    .map((id) => bible.characters.find((c) => c.id === id))
    .filter((c): c is BibleCharacter => !!c);
  const referenceIds =
    options.referenceIds ?? characters.filter((c) => c.refUrl).map((c) => c.id);
  const time = scene.timeOfDay && TIME_TEXT[scene.timeOfDay];

  return [
    `Children's picture book illustration. Art style: ${styleText}.`,
    referenceMap(bible, referenceIds, !!options.styleAnchor),
    `${SHOT_TEXT[scene.shot] ?? SHOT_TEXT.medium}.`,
    time ? `Time of day: ${time}.` : "",
    `Scene: ${scene.action}`,
    location ? `Setting (${location.name}): ${location.visual}` : "",
    characters.length
      ? `Characters in this scene (only these as main characters): ${characters
          .map((c) => describeCharacter(bible, c))
          .join(" | ")}`
      : "",
    `Color palette for the whole book: ${bible.palette}.`,
    ANATOMY_RULE,
    composition,
    NO_TEXT_RULE,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Prompt de imagen de una página, compuesto a partir de la biblia */
export function composeScenePrompt(
  bible: StoryBible,
  scene: SceneSpec,
  style: string,
  options: ComposeOptions = {},
): string {
  return composePrompt(
    bible,
    scene,
    style,
    options,
    "Square composition with a calm, less detailed area in the lower third. One clear focal point, simple uncluttered background, no extra characters or creatures beyond those listed, no floating or duplicated objects.",
  );
}

/** Prompt de la portada: protagonista destacado y hueco arriba para el título */
export function composeCoverPrompt(
  bible: StoryBible,
  style: string,
  options: ComposeOptions = {},
): string {
  return composePrompt(
    bible,
    bible.cover,
    style,
    { ...options, styleAnchor: false },
    "Book cover composition: the protagonist is the clear focal point, inviting and joyful, placed in the lower two thirds. The top 35% of the image must be calm, plain sky or soft background with no objects, branches or characters, reserved for a title that will be added later.",
  );
}

export interface ReferencePromptOptions {
  bible?: StoryBible;
  /** Rasgos reales del niño (de la foto, ES) cuando no se puede usar la foto */
  traits?: string | null;
  /** Se pasa la hoja del protagonista como imagen solo para heredar el estilo */
  styleFromSheet?: boolean;
}

/** Prompt de la hoja de referencia de un personaje */
export function composeReferencePrompt(
  character: BibleCharacter,
  style: string,
  fromPhoto: boolean,
  options: ReferencePromptOptions = {},
): string {
  const styleText = ART_STYLES[style] || ART_STYLES.cartoon;
  const look =
    character.role === "protagonist" && options.bible ? childLook(options.bible) : null;
  return [
    fromPhoto
      ? `Turn the child in the photo into a children's picture book character. Keep them clearly recognizable: face shape, eyes, hair color and style, skin tone, glasses or other visible aids. Do not copy the photo's clothes or background.`
      : options.styleFromSheet
        ? `Character design reference for a children's picture book. The input image shows ANOTHER character of this same book: use it ONLY for the art style (line work, colors, rendering, proportions). Draw a completely different character, described below, and do not include the character from the input image.`
        : `Character design reference for a children's picture book.`,
    `Character: ${character.name} (${character.kind}). ${character.visual}`,
    look ? `${character.name} is ${look}.` : "",
    !fromPhoto && options.traits
      ? `Real traits of the child (from a family photo; respect them): ${options.traits}`
      : "",
    `Single full-body view, three-quarter front angle, friendly neutral expression, standing on a plain off-white background. Only this character.`,
    `Art style: ${styleText}.`,
    ANATOMY_RULE,
    `No text, no letters, no numbers, no logos on clothes, no watermark.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ============================================
// Normalización (el modelo puede devolver ids o páginas imperfectas)
// ============================================

function isTimeOfDay(value: unknown): value is TimeOfDay {
  return (TIMES_OF_DAY as readonly unknown[]).includes(value);
}

/** Diálogos con raya: "- Hola" o "-- Hola" al inicio de línea → "—Hola" */
function cleanText(text: string): string {
  return text
    .trim()
    .replace(/(^|\n)\s*(?:--|-|–)\s*/g, "$1—")
    .replace(/\s--\s/g, " —");
}

function normalizeBible(
  bible: StoryBible,
  kidName: string,
  gender?: Gender | null,
): StoryBible {
  const characters = bible.characters.slice(0, 3);
  if (!characters.some((c) => c.role === "protagonist")) {
    characters[0] = { ...characters[0], role: "protagonist" };
  }
  const protagonist = characters.find((c) => c.role === "protagonist")!;
  protagonist.id = "prota";
  protagonist.name = kidName;
  if (gender) protagonist.kind = protagonistKind(gender);

  const locations = bible.locations.slice(0, 4);
  const charIds = new Set(characters.map((c) => c.id));
  const locIds = new Set(locations.map((l) => l.id));
  const cover: SceneSpec = {
    ...bible.cover,
    characters: bible.cover.characters.filter((id) => charIds.has(id)),
    location: locIds.has(bible.cover.location)
      ? bible.cover.location
      : locations[0].id,
    timeOfDay: isTimeOfDay(bible.cover.timeOfDay) ? bible.cover.timeOfDay : undefined,
  };
  if (!cover.characters.includes("prota")) cover.characters.unshift("prota");

  return { ...bible, characters, locations, cover };
}

function normalizePages(pages: StoryPage[], bible: StoryBible): StoryPage[] {
  const charIds = new Set(bible.characters.map((c) => c.id));
  const locIds = new Set(bible.locations.map((l) => l.id));
  return pages.slice(0, STORY_PAGES).map((page, index) => ({
    pageNumber: pages.length === 1 ? page.pageNumber : index + 2,
    text: cleanText(page.text),
    scene: {
      ...page.scene,
      characters: page.scene.characters.filter((id) => charIds.has(id)),
      location: locIds.has(page.scene.location)
        ? page.scene.location
        : bible.locations[0].id,
      timeOfDay: isTimeOfDay(page.scene.timeOfDay) ? page.scene.timeOfDay : undefined,
    },
  }));
}

function stripRefs(bible: StoryBible) {
  return {
    ...bible,
    // Solo la ficha: ni URLs ni marcas internas llegan al modelo de texto
    characters: bible.characters.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      kind: c.kind,
      visual: c.visual,
      personality: c.personality,
    })),
  };
}

/** Lee la biblia guardada en Book.bible (null si es un libro del motor v1) */
export function parseBible(value: unknown): StoryBible | null {
  if (
    value &&
    typeof value === "object" &&
    ((value as StoryBible).version === 2 || (value as StoryBible).version === 3) &&
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

/** Normaliza el género guardado en Book.gender */
export function parseGender(value: unknown): Gender | null {
  return value === "nino" || value === "nina" ? value : null;
}
