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

const ANALYSIS_PROMPT = `Analiza esta imagen y extrae las características físicas de la persona para crear ilustraciones de un personaje de cuento infantil.

Describe de forma detallada:
1. Color de pelo (rubio, castaño, negro, pelirrojo, etc.)
2. Estilo de pelo (largo, corto, rizado, liso, con flequillo, etc.)
3. Color de ojos aproximado
4. Tono de piel (claro, medio, moreno, etc.)
5. Rasgos distintivos visibles (gafas, pecas, etc.)
6. Género aparente

IMPORTANTE: Responde SIEMPRE con un JSON válido, incluso si no puedes ver bien la imagen.

{
  "description": "Descripción completa en español para usar en prompts de ilustración",
  "details": {
    "hairColor": "color del pelo",
    "hairStyle": "estilo del pelo", 
    "eyeColor": "color de ojos",
    "skinTone": "tono de piel",
    "distinctiveFeatures": ["rasgo1"],
    "gender": "niño o niña"
  }
}`;

export async function POST(request: NextRequest) {
  console.log("[analyze-photo] Iniciando análisis de foto...");

  try {
    const formData = await request.formData();
    const photo = formData.get("photo") as File | null;

    if (!photo) {
      console.log("[analyze-photo] Error: No se proporcionó foto");
      return NextResponse.json(
        { error: "No se ha proporcionado ninguna foto" },
        { status: 400 }
      );
    }

    console.log(
      `[analyze-photo] Foto recibida: ${photo.name}, tipo: ${photo.type}, tamaño: ${photo.size} bytes`
    );

    // Validar tipo de archivo
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(photo.type)) {
      console.log(`[analyze-photo] Error: Tipo no válido: ${photo.type}`);
      return NextResponse.json(
        { error: "Tipo de archivo no válido. Usa JPG, PNG, WebP o GIF" },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 10MB)
    if (photo.size > 10 * 1024 * 1024) {
      console.log(
        `[analyze-photo] Error: Imagen muy grande: ${photo.size} bytes`
      );
      return NextResponse.json(
        { error: "La imagen es demasiado grande. Máximo 10MB" },
        { status: 400 }
      );
    }

    // Convertir a base64
    const bytes = await photo.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = photo.type;

    console.log(
      `[analyze-photo] Imagen convertida a base64, longitud: ${base64.length}`
    );

    // Analizar con GPT-4 Vision
    const openai = getOpenAI();
    console.log("[analyze-photo] Enviando a OpenAI GPT-4o...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    console.log("[analyze-photo] Respuesta de OpenAI recibida");
    console.log(
      "[analyze-photo] Finish reason:",
      response.choices[0]?.finish_reason
    );

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.log("[analyze-photo] Error: Sin contenido en la respuesta");
      console.log(
        "[analyze-photo] Response completa:",
        JSON.stringify(response.choices[0], null, 2)
      );
      return NextResponse.json(
        {
          error:
            "No se pudo analizar la imagen. El modelo no generó una respuesta.",
        },
        { status: 500 }
      );
    }

    console.log("[analyze-photo] Contenido recibido:", content);

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.log("[analyze-photo] Error parseando JSON:", parseError);
      console.log("[analyze-photo] Contenido raw:", content);
      return NextResponse.json(
        { error: "Error procesando la respuesta del análisis." },
        { status: 500 }
      );
    }

    if (!analysis.description) {
      console.log(
        "[analyze-photo] Advertencia: Sin descripción, usando detalles"
      );
      // Construir descripción desde detalles si no hay una
      const d = analysis.details || {};
      analysis.description = `${d.gender || "Niño/a"} con pelo ${
        d.hairColor || "castaño"
      } ${d.hairStyle || ""}, ojos ${
        d.eyeColor || "expresivos"
      }, tono de piel ${d.skinTone || "claro"}`;
    }

    console.log("[analyze-photo] Descripción final:", analysis.description);

    return NextResponse.json({
      success: true,
      characterDescription: analysis.description,
      details: analysis.details || {},
    });
  } catch (error: unknown) {
    console.error("[analyze-photo] Error:", error);

    // Manejar errores específicos de OpenAI
    if (error instanceof Error) {
      if (error.message.includes("content_policy")) {
        return NextResponse.json(
          {
            error:
              "La imagen no pudo ser procesada por políticas de contenido. Intenta con otra foto.",
          },
          { status: 400 }
        );
      }
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          {
            error:
              "Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Error al analizar la foto. Por favor, intenta con otra imagen.",
      },
      { status: 500 }
    );
  }
}
