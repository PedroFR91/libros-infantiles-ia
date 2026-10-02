/**
 * Banco de pruebas del motor de historias (AUDITORIA-2026-10.md §4).
 *
 * Genera 10 casos fijos y una hoja HTML para puntuarlos a mano (1-5):
 * parecido del protagonista entre páginas, consistencia de secundarios y
 * escenarios, y calidad del texto. Sirve para comparar modelos o prompts
 * antes de cambiar producción.
 *
 * Uso (necesita OPENAI_API_KEY en el entorno o en .env.local):
 *   npx tsx --tsconfig tsconfig.json scripts/eval-engine.ts            # solo texto (~0,30 €)
 *   npx tsx --tsconfig tsconfig.json scripts/eval-engine.ts --images   # + referencias y 3 páginas por caso (~2,50 €)
 *   STORY_MODEL=gpt-5.1 IMAGE_MODEL=gpt-image-1.5 npx tsx ... --images # comparar modelos
 *   ... --only 3                                                       # un solo caso
 */
import * as fs from "fs/promises";
import * as path from "path";
import { config as loadEnv } from "dotenv";
import {
  createStory,
  composeCoverPrompt,
  composeReferencePrompt,
  composeScenePrompt,
  type CreatedStory,
} from "@/lib/story/engine";
import { generateIllustration, generateReferenceSheet } from "@/lib/openai";
import type { AgeRange } from "@/lib/validation";

loadEnv({ path: ".env.local", override: false });

interface Case {
  kidName: string;
  theme: string;
  ageRange: AgeRange;
  style: string;
  companion?: string;
  characterDescription?: string;
}

const CASES: Case[] = [
  { kidName: "Sofía", theme: "un dragón que no sabe volar", ageRange: "5-6", style: "watercolor" },
  { kidName: "Leo", theme: "su primer día de cole", ageRange: "3-4", style: "cartoon", companion: "su peluche, un elefante azul llamado Trompi" },
  { kidName: "Martina", theme: "astronauta que busca una estrella perdida", ageRange: "7-8", style: "classic" },
  { kidName: "Hugo", theme: "dinosaurios en el jardín de casa", ageRange: "5-6", style: "cartoon", companion: "su perro Toby, un labrador marrón" },
  { kidName: "Lucía", theme: "va a tener un hermanito", ageRange: "3-4", style: "watercolor", characterDescription: "niña de 4 años, pelo castaño rizado por los hombros, ojos marrones, piel morena clara, flequillo" },
  { kidName: "Mateo", theme: "piratas que buscan un tesoro en la playa", ageRange: "7-8", style: "comic", companion: "su amiga Vega" },
  { kidName: "Valeria", theme: "un bosque mágico donde los árboles hablan", ageRange: "5-6", style: "classic" },
  { kidName: "Daniel", theme: "fútbol: quiere marcar su primer gol", ageRange: "7-8", style: "cartoon" },
  { kidName: "Alba", theme: "sirenas y un faro en el fondo del mar", ageRange: "5-6", style: "watercolor", characterDescription: "niña de 6 años, pelo rubio liso largo, ojos azules, piel clara con pecas" },
  { kidName: "Pablo", theme: "superhéroe que ayuda a su abuela", ageRange: "3-4", style: "cartoon", companion: "su gata Mora, gris con manchas blancas" },
];

const withImages = process.argv.includes("--images");
const onlyIndex = process.argv.includes("--only")
  ? parseInt(process.argv[process.argv.indexOf("--only") + 1], 10)
  : null;

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("Falta OPENAI_API_KEY");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join("storage", "eval", stamp);
  await fs.mkdir(outDir, { recursive: true });

  const cases = onlyIndex ? [CASES[onlyIndex - 1]] : CASES;
  const results: { input: Case; story?: CreatedStory; images: Record<string, string>; error?: string; ms: number }[] = [];

  for (const [index, input] of cases.entries()) {
    const started = Date.now();
    const images: Record<string, string> = {};
    console.log(`[${index + 1}/${cases.length}] ${input.kidName}: ${input.theme}`);
    try {
      const story = await createStory(input);
      if (withImages) {
        // Referencias de todos los personajes + portada + páginas 2, 7 y 12
        const refs = new Map<string, Buffer>();
        for (const character of story.bible.characters) {
          const ref = await generateReferenceSheet(composeReferencePrompt(character, input.style, false));
          refs.set(character.id, ref);
          images[`ref-${character.id}`] = await save(outDir, `${index}-ref-${character.id}.png`, ref);
        }
        const coverRefs = story.bible.cover.characters.map((id) => refs.get(id)).filter((b): b is Buffer => !!b);
        images.cover = await save(outDir, `${index}-cover.png`, await generateIllustration(composeCoverPrompt(story.bible, input.style), coverRefs));
        for (const pageNumber of [2, 7, 12]) {
          const page = story.pages.find((p) => p.pageNumber === pageNumber);
          if (!page) continue;
          const pageRefs = page.scene.characters.map((id) => refs.get(id)).filter((b): b is Buffer => !!b);
          images[`p${pageNumber}`] = await save(
            outDir,
            `${index}-p${pageNumber}.png`,
            await generateIllustration(composeScenePrompt(story.bible, page.scene, input.style), pageRefs),
          );
        }
      }
      results.push({ input, story, images, ms: Date.now() - started });
    } catch (error) {
      console.error(error);
      results.push({ input, images, error: String(error), ms: Date.now() - started });
    }
  }

  await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
  await fs.writeFile(path.join(outDir, "index.html"), renderHtml(results));
  console.log(`\nHoja de evaluación: ${path.resolve(outDir, "index.html")}`);
}

async function save(dir: string, name: string, buffer: Buffer): Promise<string> {
  await fs.writeFile(path.join(dir, name), buffer);
  return name;
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderHtml(results: { input: Case; story?: CreatedStory; images: Record<string, string>; error?: string; ms: number }[]): string {
  const model = `${process.env.STORY_MODEL || "gpt-4.1"} / ${process.env.IMAGE_MODEL || "gpt-image-1"}`;
  const cards = results
    .map((r, i) => {
      const imgs = Object.entries(r.images)
        .map(([label, file]) => `<figure><img src="${file}" alt="${label}"><figcaption>${label}</figcaption></figure>`)
        .join("");
      const pages = r.story?.pages
        .map((p) => `<li><b>${p.pageNumber}</b> ${esc(p.text)} <small>[${p.scene.characters.join(", ")} · ${p.scene.location} · ${p.scene.shot}]</small></li>`)
        .join("") ?? "";
      const characters = r.story?.bible.characters
        .map((c) => `<li><b>${esc(c.name)}</b> (${esc(c.kind)}): ${esc(c.visual)}</li>`)
        .join("") ?? "";
      return `<section>
<h2>${i + 1}. ${esc(r.input.kidName)} · ${esc(r.input.theme)} <small>${r.input.ageRange} · ${r.input.style}${r.input.companion ? ` · ${esc(r.input.companion)}` : ""} · ${(r.ms / 1000).toFixed(0)} s</small></h2>
${r.error ? `<p class="err">${esc(r.error)}</p>` : ""}
${r.story ? `<h3>${esc(r.story.title)}</h3><p><i>${esc(r.story.bible.value)}</i> — ${esc(r.story.bible.summary)}</p>` : ""}
<div class="imgs">${imgs}</div>
<details><summary>Personajes</summary><ul>${characters}</ul></details>
<ol class="pages">${pages}</ol>
<table><tr><th>Parecido del protagonista</th><th>Secundarios y escenarios</th><th>Texto</th><th>Notas</th></tr>
<tr><td contenteditable>_/5</td><td contenteditable>_/5</td><td contenteditable>_/5</td><td contenteditable></td></tr></table>
</section>`;
    })
    .join("\n");
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Evaluación del motor · ${esc(model)}</title>
<style>body{font-family:system-ui;max-width:1100px;margin:24px auto;padding:0 16px;color:#222}section{border-top:2px solid #eee;padding:16px 0}
.imgs{display:flex;gap:8px;flex-wrap:wrap}figure{margin:0}img{width:200px;height:200px;object-fit:cover;border-radius:8px}figcaption{font-size:12px;color:#666}
.pages li{margin:4px 0}small{color:#888}table{border-collapse:collapse;margin-top:8px}td,th{border:1px solid #ddd;padding:6px 10px;font-size:13px}.err{color:#c00}</style>
<h1>Evaluación del motor de historias</h1><p>Modelos: <b>${esc(model)}</b> · ${new Date().toLocaleString("es-ES")}</p>${cards}</html>`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
