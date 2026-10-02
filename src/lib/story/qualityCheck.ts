import sharp from "sharp";
import { getOpenAI } from "@/lib/openai";
import { createLogger } from "@/lib/logger";

const log = createLogger("quality-check");

// ============================================
// Control de calidad por visión (Q11)
// ============================================
// Tras generar cada ilustración, un modelo de visión barato la compara con
// las hojas de referencia y la portada. Si falla la identidad, aparecen
// letras, hay un problema anatómico grave o algo inapropiado, se rehace solo
// esa página (máx. QA_MAX_RETRIES veces) y, si persiste, se deja la mejor.
// Si la llamada de QA falla, NO bloquea: la página se acepta.
//
// Coste: ~4 imágenes reducidas a 768 px (~900 tokens cada una con
// gpt-4.1-mini) ≈ 0,002-0,004 $ por comprobación; ≈ 0,05 $ por libro sin
// reintentos. Lo caro son los reintentos de imagen (ver generation.ts).

const QA_MODEL = process.env.QA_MODEL || "gpt-4.1-mini";

export const QA_MAX_RETRIES = Math.max(
  0,
  parseInt(process.env.QA_MAX_RETRIES || "2", 10) || 0,
);

export function isQaEnabled(): boolean {
  return (process.env.QA_ENABLED ?? "true").toLowerCase() !== "false";
}

export interface QaResult {
  identity: number; // 1-5: parecido de los personajes con sus referencias
  outfitMatch: boolean;
  textOrLetters: boolean;
  anatomyIssue: boolean; // solo problemas graves y visibles
  styleMatch: boolean;
  sceneMatch: number; // 1-5: la imagen muestra la acción esperada
  strayElements: boolean; // personajes u objetos sobrantes, caras vacías, fragmentos
  cluttered: boolean; // escena saturada, sin un punto focal claro
  unsafe: boolean;
  notes: string;
}

export interface QaReference {
  /** "Sofía, the main character" / "Toby (perro)" */
  label: string;
  image: Buffer;
}

export interface QaInput {
  references: QaReference[];
  /** Portada del libro (referencia de estilo), si existe */
  cover?: Buffer | null;
  page: Buffer;
  /** Lo que debería verse (acción de la escena, EN) */
  expected?: string;
}

const qaSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "identity",
    "outfitMatch",
    "textOrLetters",
    "anatomyIssue",
    "styleMatch",
    "sceneMatch",
    "strayElements",
    "cluttered",
    "unsafe",
    "notes",
  ],
  properties: {
    identity: { type: "integer" },
    outfitMatch: { type: "boolean" },
    textOrLetters: { type: "boolean" },
    anatomyIssue: { type: "boolean" },
    styleMatch: { type: "boolean" },
    sceneMatch: { type: "integer" },
    strayElements: { type: "boolean" },
    cluttered: { type: "boolean" },
    unsafe: { type: "boolean" },
    notes: { type: "string" },
  },
} as const;

const SYSTEM = `You are the art director of a children's picture book publisher. You check one illustration against the character reference sheets and the book cover.
Return JSON:
- identity (1-5): do the characters in the LAST image look like their reference images (face, hair, skin tone, age, body proportions, species/colors for animals)? 5 = unmistakably the same, 4 = same with minor drift, 3 = noticeable drift, 2 = different character, 1 = missing or totally different. If no character references were given, rate overall consistency with the cover.
- outfitMatch: each character wears the same outfit and colors as in their reference.
- textOrLetters: true if ANY readable or pseudo letters, words, numbers, signs, speech balloons, labels or a signature appear anywhere.
- anatomyIssue: true ONLY for serious, clearly visible problems: extra or missing limbs, wrong number of fingers clearly visible, fused or melted bodies or faces, distorted face, two copies of the same character.
- styleMatch: same art style, rendering and palette as the cover / references.
- sceneMatch (1-5): does the illustration clearly show what it "should show" (who is there, what they are doing, where they look, the key objects)? 5 = exactly, 3 = partly, 1 = something else. If no expected scene was given, answer 5.
- strayElements: true if there are unexplained extra characters or creatures, duplicated or floating objects, faceless or half-formed figures, body parts or object fragments that do not belong to the scene.
- cluttered: true if the image is overloaded with small elements and has no clear focal point a young child could follow.
- unsafe: anything scary, violent, sexualized or inappropriate for a 3-8 year old.
- notes: one short sentence with the main problem (or "ok").`;

/** Reduce la imagen para abaratar la llamada (768 px, JPEG) */
async function toDataUrl(image: Buffer): Promise<string> {
  const small = await sharp(image)
    .resize(768, 768, { fit: "inside" })
    .jpeg({ quality: 85 })
    .toBuffer();
  return `data:image/jpeg;base64,${small.toString("base64")}`;
}

/**
 * Evalúa una ilustración. Devuelve null si el QA está desactivado o la
 * llamada falla (la página se acepta igualmente).
 */
export async function checkPageQuality(input: QaInput): Promise<QaResult | null> {
  if (!isQaEnabled()) return null;
  try {
    type Part =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: "auto" } };
    const parts: Part[] = [];
    let index = 1;
    for (const ref of input.references) {
      parts.push({ type: "text", text: `Image ${index++}: reference sheet of ${ref.label}.` });
      parts.push({ type: "image_url", image_url: { url: await toDataUrl(ref.image), detail: "auto" } });
    }
    if (input.cover) {
      parts.push({ type: "text", text: `Image ${index++}: the book cover (style reference only).` });
      parts.push({ type: "image_url", image_url: { url: await toDataUrl(input.cover), detail: "auto" } });
    }
    parts.push({
      type: "text",
      text: `Image ${index}: the PAGE ILLUSTRATION to check.${input.expected ? ` It should show: ${input.expected}` : ""}`,
    });
    parts.push({ type: "image_url", image_url: { url: await toDataUrl(input.page), detail: "auto" } });

    const openai = getOpenAI();
    const supportsTemperature = !/^(gpt-5|o\d)/.test(QA_MODEL);
    const response = await openai.chat.completions.create({
      model: QA_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: parts },
      ],
      ...(supportsTemperature && { temperature: 0 }),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "page_qa",
          schema: qaSchema as unknown as Record<string, unknown>,
          strict: true,
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Respuesta vacía del QA");
    const result = JSON.parse(content) as QaResult;
    result.identity = Math.min(5, Math.max(1, Math.round(Number(result.identity) || 1)));
    result.sceneMatch = Math.min(5, Math.max(1, Math.round(Number(result.sceneMatch) || 5)));
    return result;
  } catch (error) {
    log.warn({ err: error }, "Fallo en el control de calidad; se acepta la página");
    return null;
  }
}

/** true si la página debe rehacerse */
export function qaNeedsRedo(result: QaResult | null): boolean {
  if (!result) return false;
  return (
    result.identity < 4 ||
    result.sceneMatch < 3 ||
    result.textOrLetters ||
    result.anatomyIssue ||
    result.strayElements ||
    result.unsafe
  );
}

/** Puntuación para quedarse con la mejor versión si ninguna pasa */
export function qaScore(result: QaResult | null): number {
  if (!result) return 0;
  return (
    result.identity * 2 +
    result.sceneMatch +
    (result.outfitMatch ? 1 : 0) +
    (result.styleMatch ? 1 : 0) -
    (result.textOrLetters ? 3 : 0) -
    (result.anatomyIssue ? 3 : 0) -
    (result.strayElements ? 2 : 0) -
    (result.cluttered ? 1 : 0) -
    (result.unsafe ? 20 : 0)
  );
}
