import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Lazy initialization
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

const ANALYSIS_PROMPT = `Analiza esta foto de un niño/niña y extrae sus características físicas principales para crear ilustraciones de un personaje de cuento infantil que se parezca.

Describe de forma detallada y específica:
1. Color de pelo (rubio claro, castaño oscuro, negro, pelirrojo, etc.)
2. Estilo de pelo (largo, corto, rizado, liso, con flequillo, coletas, etc.)
3. Color de ojos (azules, marrones, verdes, etc.)
4. Tono de piel (muy claro, claro, medio, moreno, etc.)
5. Rasgos distintivos visibles (pecas, gafas, hoyuelos, etc.)
6. Género aparente (niño/niña)

IMPORTANTE:
- Solo describe características físicas visibles
- Usa descripciones neutras y positivas
- Sé específico para que las ilustraciones sean consistentes
- No hagas suposiciones sobre edad, nacionalidad o etnia

Responde SOLO con JSON:
{
  "description": "Descripción completa en una frase para usar en prompts de DALL-E",
  "details": {
    "hairColor": "color específico del pelo",
    "hairStyle": "estilo del pelo",
    "eyeColor": "color de ojos",
    "skinTone": "tono de piel",
    "distinctiveFeatures": ["rasgo1", "rasgo2"],
    "gender": "niño o niña"
  }
}`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get("photo") as File | null;

    if (!photo) {
      return NextResponse.json(
        { error: "No se ha proporcionado ninguna foto" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(photo.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no válido. Usa JPG, PNG, WebP o GIF" },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 10MB)
    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "La imagen es demasiado grande. Máximo 10MB" },
        { status: 400 }
      );
    }

    // Convertir a base64
    const bytes = await photo.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = photo.type;

    // Analizar con GPT-4 Vision
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // GPT-4o tiene capacidad de visión
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: ANALYSIS_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "low", // Suficiente para análisis de características
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No se pudo analizar la foto");
    }

    const analysis = JSON.parse(content);

    return NextResponse.json({
      success: true,
      characterDescription: analysis.description,
      details: analysis.details,
    });
  } catch (error) {
    console.error("Error analizando foto:", error);
    return NextResponse.json(
      {
        error: "Error al analizar la foto. Por favor, intenta con otra imagen.",
      },
      { status: 500 }
    );
  }
}
