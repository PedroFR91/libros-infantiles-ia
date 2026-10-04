import sharp from "sharp";
import { createLogger } from "@/lib/logger";

const log = createLogger("gemini");

// ============================================
// Ilustraciones con Gemini (Nano Banana). Se activa con IMAGE_PROVIDER=gemini
// y GEMINI_API_KEY. Acepta varias imágenes de referencia en una sola llamada
// (protagonista primero, portada al final como ancla de estilo), igual que el
// camino de OpenAI, así que los prompts del motor sirven tal cual.
// ============================================

/** gemini-3.1-flash-image (Nano Banana 2) | gemini-3-pro-image (Nano Banana Pro) */
export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
/** 1K (1024 px) | 2K (2048 px, mejor para imprenta) */
const GEMINI_IMAGE_SIZE = process.env.GEMINI_IMAGE_SIZE || "1K";

export function isGeminiImages(): boolean {
  return process.env.IMAGE_PROVIDER === "gemini" && Boolean(process.env.GEMINI_API_KEY);
}

export interface ImageInput {
  buffer: Buffer;
  mimeType: string;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/** Error con `status` para que withRetry distinga el límite por minuto */
class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function geminiImage(prompt: string, inputs: ImageInput[] = []): Promise<Buffer> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              ...inputs.map((img) => ({
                inline_data: { mime_type: img.mimeType, data: img.buffer.toString("base64") },
              })),
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "1:1", imageSize: GEMINI_IMAGE_SIZE },
        },
      }),
      signal: AbortSignal.timeout(180_000),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) {
      // Límite por minuto: el mensaje lleva "try again in Ns" para withRetry
      // (no se menciona "quota" para que no se tome por falta de saldo)
      const delay = body.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)?.[1] ?? "20";
      throw new GeminiError(`Gemini rate limit, try again in ${delay}s`, 429);
    }
    throw new GeminiError(`Gemini ${response.status}: ${body.slice(0, 300)}`, response.status);
  }

  const data = (await response.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: GeminiPart[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  const candidate = data.candidates?.[0];
  const image = candidate?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!image) {
    const reason = data.promptFeedback?.blockReason ?? candidate?.finishReason ?? "sin imagen";
    log.warn({ reason }, "Gemini no devolvió imagen");
    throw new GeminiError(`Gemini no devolvió imagen (${reason})`, 500);
  }

  const bytes = Buffer.from(image.data, "base64");
  // El resto del sistema guarda las ilustraciones como PNG
  return image.mimeType === "image/png" ? bytes : sharp(bytes).png().toBuffer();
}
