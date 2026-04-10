import { z } from "zod";

/**
 * Esquemas de validación centralizados para todas las APIs.
 * Previene prompt injection y asegura datos válidos.
 */

// Longitudes máximas para prevenir abuso
const MAX_NAME_LENGTH = 50;
const MAX_THEME_LENGTH = 200;
const MAX_CUSTOM_PROMPT_LENGTH = 500;
const MAX_TEXT_LENGTH = 1000;

// Caracteres peligrosos para prompt injection
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+instructions/i,
  /disregard\s+(previous|above|all)/i,
  /system\s*prompt/i,
  /\bDAN\b/,
  /jailbreak/i,
  /bypass\s+(filter|safety|content)/i,
];

function containsPromptInjection(value: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

// Refinamiento reutilizable: no permite prompt injection
const safeString = (maxLength: number) =>
  z
    .string()
    .min(1, "Campo requerido")
    .max(maxLength, `Máximo ${maxLength} caracteres`)
    .refine((val) => !containsPromptInjection(val), {
      message: "Contenido no permitido",
    });

// ============================================
// ESQUEMAS DE VALIDACIÓN
// ============================================

/** POST /api/books - Crear nuevo libro */
export const createBookSchema = z.object({
  kidName: safeString(MAX_NAME_LENGTH).describe("Nombre del protagonista"),
  theme: safeString(MAX_THEME_LENGTH).describe("Tema de la historia"),
  categories: z
    .array(z.string().max(50))
    .max(10)
    .default([])
    .describe("Categorías temáticas"),
  style: z
    .enum([
      "classic",
      "comic",
      "watercolor",
      "cartoon",
      "realistic",
      "minimalist",
    ])
    .default("cartoon")
    .describe("Estilo artístico"),
  characterDescription: z
    .string()
    .max(1000)
    .nullable()
    .optional()
    .describe("Descripción del personaje desde foto"),
});

/** PATCH /api/books/[id] - Actualizar libro */
export const updateBookSchema = z.object({
  title: z.string().max(200).optional(),
  pageNumber: z.number().int().min(1).max(20).optional(),
  text: z.string().max(MAX_TEXT_LENGTH).optional(),
  pages: z
    .array(
      z.object({
        pageNumber: z.number().int().min(1).max(20),
        text: z.string().max(MAX_TEXT_LENGTH),
      }),
    )
    .optional(),
});

/** POST /api/books/[id]/pages/[pageNumber]/regenerate */
export const regeneratePageSchema = z.object({
  customPrompt: z.string().max(MAX_CUSTOM_PROMPT_LENGTH).optional().default(""),
  regenerateImage: z.boolean().optional().default(true),
  regenerateText: z.boolean().optional().default(true),
});

/** POST /api/stripe/checkout */
export const checkoutSchema = z.object({
  packId: z.enum(["small", "medium", "large"]),
});

/** POST /api/admin/credits */
export const adminCreditsSchema = z.object({
  userId: z.string().cuid(),
  amount: z.number().int().min(-1000).max(1000),
});

/** POST /api/admin/role */
export const adminRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["USER", "ADMIN"]),
});

// ============================================
// HELPER DE VALIDACIÓN
// ============================================

/**
 * Valida un body de request contra un esquema Zod.
 * Retorna los datos validados o un objeto de error para responder con 400.
 */
export function validateBody<T extends z.ZodType>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessages = result.error.issues
    .map((e) => `${String(e.path.join("."))}: ${e.message}`)
    .join(", ");

  return { success: false, error: errorMessages };
}
