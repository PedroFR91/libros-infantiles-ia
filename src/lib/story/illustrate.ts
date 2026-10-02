import { generateIllustration, generateReferenceSheet } from "@/lib/openai";
import {
  composeCoverPrompt,
  composeReferencePrompt,
  composeScenePrompt,
  referenceOrder,
  type BibleCharacter,
  type SceneSpec,
  type StoryBible,
} from "@/lib/story/engine";
import {
  checkPageQuality,
  isQaEnabled,
  qaNeedsRedo,
  qaScore,
  QA_MAX_RETRIES,
  type QaResult,
} from "@/lib/story/qualityCheck";
import { createLogger } from "@/lib/logger";

const log = createLogger("illustrate");

// ============================================
// Ilustración de un libro v2/v3 (compartido por generation.ts, la ruta de
// rehacer página y el banco de pruebas, para que los tres hagan lo mismo)
// ============================================

export type PhotoLike = { buffer: Buffer; mimeType: string };
export type ImageQuality = "low" | "medium" | "high";

/** Precio aproximado (USD) de la imagen de salida 1024×1024 de gpt-image-1 */
export const IMAGE_PRICE_USD: Record<ImageQuality, number> = {
  low: 0.011,
  medium: 0.042,
  high: 0.167,
};
/** Aproximación del coste de cada imagen de entrada (input_fidelity high) */
export const INPUT_IMAGE_USD = 0.03;

export function estimateImageCostUsd(quality: ImageQuality, inputImages: number): number {
  return IMAGE_PRICE_USD[quality] + inputImages * INPUT_IMAGE_USD;
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  throw lastError;
}

// --------------------------------------------
// Hojas de referencia
// --------------------------------------------

export interface ReferenceSheetsOptions {
  /** Se modifica en el sitio: refUrl, fromPhoto y photoRefLost */
  bible: StoryBible;
  style: string;
  /** Foto del niño (solo en memoria; nunca se guarda) */
  photo?: PhotoLike | null;
  /** Rasgos de la foto en texto (Book.characterDescription) */
  traits?: string | null;
  /** Limitar a estos personajes (p. ej. solo el protagonista) */
  onlyIds?: string[];
  load: (url: string) => Promise<Buffer>;
  store: (character: BibleCharacter, image: Buffer) => Promise<string>;
  context?: Record<string, unknown>;
}

/**
 * Carga o genera las hojas de referencia. El protagonista va primero; los
 * demás se generan por edición a partir de su hoja para heredar el estilo
 * (Q6). Una hoja hecha con foto nunca se rehace sin ella si sigue
 * disponible; si se ha perdido, se avisa y se rehace con los rasgos en
 * texto (Q4).
 */
export async function ensureReferenceSheets(
  opts: ReferenceSheetsOptions,
): Promise<Map<string, Buffer>> {
  const { bible, style, context } = opts;
  const refs = new Map<string, Buffer>();
  const ordered = referenceOrder(
    bible,
    bible.characters.map((c) => c.id),
  )
    .map((id) => bible.characters.find((c) => c.id === id)!)
    .filter((c) => !opts.onlyIds || opts.onlyIds.includes(c.id));

  const loadExisting = async (character: BibleCharacter) => {
    if (!character.refUrl) return null;
    try {
      return await opts.load(character.refUrl);
    } catch (error) {
      log.warn({ ...context, err: error, character: character.id }, "Referencia perdida, se regenera");
      return null;
    }
  };

  const protagonist = ordered.find((c) => c.role === "protagonist");
  if (protagonist) {
    let image = await loadExisting(protagonist);
    if (!image) {
      const photo = opts.photo ?? null;
      if (!photo && protagonist.fromPhoto) {
        log.warn(
          { ...context, character: protagonist.id },
          "La hoja del protagonista hecha con FOTO no está disponible y la foto no se guarda (privacidad): se rehace SIN foto con los rasgos descritos. Revisar el parecido de este libro.",
        );
        protagonist.photoRefLost = true;
      }
      const prompt = composeReferencePrompt(protagonist, style, !!photo, {
        bible,
        traits: photo ? null : opts.traits,
      });
      image = await withRetry(() => generateReferenceSheet(prompt, photo));
      protagonist.refUrl = await opts.store(protagonist, image);
      protagonist.fromPhoto = !!photo;
    }
    refs.set(protagonist.id, image);
  }

  const base = protagonist ? refs.get(protagonist.id) ?? null : null;
  await Promise.all(
    ordered
      .filter((c) => c !== protagonist)
      .map(async (character) => {
        let image = await loadExisting(character);
        if (!image) {
          const prompt = composeReferencePrompt(character, style, false, {
            bible,
            styleFromSheet: !!base,
          });
          image = await withRetry(() => generateReferenceSheet(prompt, null, base));
          character.refUrl = await opts.store(character, image);
        }
        refs.set(character.id, image);
      }),
  );
  return refs;
}

// --------------------------------------------
// Escenas
// --------------------------------------------

export interface RenderSceneOptions {
  bible: StoryBible;
  style: string;
  /** Escena de la página; si es la portada se usa bible.cover */
  scene?: SceneSpec | null;
  cover?: boolean;
  refs: Map<string, Buffer>;
  /** Portada ya generada: va como ÚLTIMA referencia (ancla de estilo) */
  styleAnchor?: Buffer | null;
  quality?: ImageQuality;
  /** Ajuste libre de la familia (ya moderado y filtrado) */
  adjustment?: string | null;
  /** Reintentos por QA (por defecto QA_MAX_RETRIES) */
  maxRetries?: number;
  /** Se llama antes de cada reintento (heartbeat; puede lanzar para abortar) */
  beforeRetry?: () => Promise<void>;
  context?: Record<string, unknown>;
}

export interface RenderedScene {
  image: Buffer;
  prompt: string;
  qa: QaResult | null;
  attempts: number;
  passed: boolean;
  /** Coste aproximado de imagen (USD) de todos los intentos */
  costUsd: number;
}

function retryHint(qa: QaResult | null): string {
  if (!qa) return "";
  const hints: string[] = [];
  if (qa.identity < 4) hints.push("match each character's reference image much more closely (face, hair, skin tone, outfit)");
  if (qa.textOrLetters) hints.push("remove every letter, word, number or sign");
  if (qa.anatomyIssue) hints.push("fix anatomy: correct number of arms, legs and five fingers per hand, natural faces");
  if (qa.unsafe) hints.push("keep it gentle, cozy and suitable for small children");
  return hints.length ? `\nIMPORTANT (previous attempt was rejected): ${hints.join("; ")}.` : "";
}

/**
 * Genera la ilustración de una página (o de la portada) con las referencias
 * ordenadas (protagonista primero), la portada como ancla de estilo y el
 * control de calidad por visión: si no pasa, se rehace solo esta página.
 */
export async function renderScene(opts: RenderSceneOptions): Promise<RenderedScene> {
  const { bible, style, refs, context } = opts;
  const spec = opts.cover ? bible.cover : opts.scene;
  if (!spec) throw new Error("Escena no disponible");
  const quality = opts.quality ?? "medium";

  const ids = referenceOrder(bible, spec.characters).filter((id) => refs.has(id));
  const anchor = !opts.cover && opts.styleAnchor ? opts.styleAnchor : null;
  const composeOptions = { referenceIds: ids, styleAnchor: !!anchor };
  const basePrompt =
    (opts.cover
      ? composeCoverPrompt(bible, style, composeOptions)
      : composeScenePrompt(bible, spec, style, composeOptions)) +
    (opts.adjustment?.trim()
      ? `\nAdjustment requested by the family (keep everything else): ${opts.adjustment.trim()}`
      : "");
  const inputs = [...ids.map((id) => refs.get(id)!), ...(anchor ? [anchor] : [])];
  const qaRefs = ids.map((id) => {
    const c = bible.characters.find((ch) => ch.id === id)!;
    return {
      label: c.role === "protagonist" ? `${c.name}, the main character` : `${c.name} (${c.kind})`,
      image: refs.get(id)!,
    };
  });

  const maxAttempts = 1 + (isQaEnabled() ? Math.max(0, opts.maxRetries ?? QA_MAX_RETRIES) : 0);
  const unitCost = estimateImageCostUsd(quality, inputs.length);
  let best: RenderedScene | null = null;
  let previousQa: QaResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) await opts.beforeRetry?.();
    const prompt = basePrompt + (attempt > 1 ? retryHint(previousQa) : "");
    const image = await withRetry(() => generateIllustration(prompt, inputs, quality));
    const qa = await checkPageQuality({
      references: qaRefs,
      cover: anchor,
      page: image,
      expected: spec.action,
    });
    const candidate: RenderedScene = {
      image,
      prompt: basePrompt,
      qa,
      attempts: attempt,
      passed: !qaNeedsRedo(qa),
      costUsd: unitCost * attempt,
    };
    if (candidate.passed) return candidate;
    if (!best || qaScore(qa) > qaScore(best.qa)) best = candidate;
    previousQa = qa;
    if (attempt < maxAttempts) {
      log.info({ ...context, attempt, qa }, "La ilustración no pasa el control de calidad; se rehace");
    }
  }

  log.warn(
    { ...context, attempts: maxAttempts, qa: best!.qa },
    "La ilustración no pasa el control de calidad tras los reintentos; se deja la mejor para revisión manual",
  );
  return { ...best!, attempts: maxAttempts, costUsd: unitCost * maxAttempts };
}
