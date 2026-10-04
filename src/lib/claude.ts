import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from "@/lib/logger";

const log = createLogger("claude");

// ============================================
// Claude para el texto y la visión (historia, revisión, control de calidad de
// las ilustraciones y análisis de la foto). Las ilustraciones siguen en
// OpenAI: Claude no genera imágenes.
// Se usa en cuanto hay ANTHROPIC_API_KEY; sin ella se vuelve a OpenAI.
// ============================================

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** Historia y revisión literaria */
export const CLAUDE_STORY_MODEL = process.env.CLAUDE_STORY_MODEL || "claude-opus-5-5";
/** Control de calidad de cada ilustración y análisis de la foto */
export const CLAUDE_VISION_MODEL = process.env.CLAUDE_VISION_MODEL || "claude-opus-5-5";

/** Esfuerzo de razonamiento de la historia: menos esfuerzo = portada gratis antes */
export const CLAUDE_STORY_EFFORT = (process.env.CLAUDE_STORY_EFFORT as Effort) || "low";

let client: Anthropic | null = null;

export function isClaudeEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClaude(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 3 });
  return client;
}

export type ClaudeContent = string | Anthropic.Beta.BetaContentBlockParam[];

export function imageBlock(data: Buffer, mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif") {
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: mediaType, data: data.toString("base64") },
  };
}

/**
 * Una llamada con salida JSON garantizada por el esquema (structured outputs).
 * En streaming para que una historia larga no choque con el timeout HTTP.
 * Si el modelo rechaza la petición, el servidor la repite con otro modelo
 * (fallbacks "default").
 */
export async function claudeJSON<T>(opts: {
  name: string;
  schema: object;
  system: string;
  content: ClaudeContent;
  model?: string;
  effort?: Effort;
  maxTokens?: number;
}): Promise<T> {
  const model = opts.model ?? CLAUDE_STORY_MODEL;
  const message = await getClaude()
    .beta.messages.stream({
      model,
      max_tokens: opts.maxTokens ?? 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
      output_config: {
        effort: opts.effort ?? "medium",
        format: { type: "json_schema", schema: opts.schema as Record<string, unknown> },
      },
    })
    .finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(`Claude rechazó la petición (${opts.name}): ${message.stop_details?.category ?? "sin categoría"}`);
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error(`Respuesta cortada por max_tokens (${opts.name})`);
  }
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text) throw new Error(`Respuesta vacía de Claude (${opts.name})`);

  log.debug(
    { name: opts.name, model: message.model, input: message.usage.input_tokens, output: message.usage.output_tokens },
    "Llamada a Claude",
  );
  return JSON.parse(text) as T;
}
