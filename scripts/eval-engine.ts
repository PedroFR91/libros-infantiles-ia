/**
 * Banco de pruebas del motor de historias (AUDITORIA-2026-10.md §4 y
 * REVISION-PRODUCTO-2026-10.md §5).
 *
 * Genera casos fijos y una hoja HTML con métricas automáticas (palabras por
 * página frente al límite, clichés, raya en los diálogos, nota del QA por
 * visión de cada página y coste aproximado) y casillas para puntuar a mano
 * (1-5): parecido del protagonista, secundarios/escenarios y texto.
 * Usa el mismo pipeline que producción (src/lib/story/illustrate.ts).
 *
 * Uso (necesita OPENAI_API_KEY en el entorno o en .env.local):
 *   npx tsx --tsconfig tsconfig.json scripts/eval-engine.ts             # solo texto (~0,15 $/caso)
 *   ... --images                 # + referencias, portada y páginas 2, 7 y 12 (~0,9 $/caso)
 *   ... --full                   # libro completo: portada + 12 páginas (~2,4 $/caso)
 *   ... --photo ruta/foto.jpg    # camino con foto (casos marcados con foto, o el de --only)
 *   ... --only 13                # un solo caso (número de la lista)
 *   STORY_MODEL=gpt-5.1 IMAGE_MODEL=gpt-image-2 npx tsx ... --full   # comparar modelos
 *   QA_ENABLED=false ...         # sin control de calidad por visión
 */
import * as fs from "fs/promises";
import * as path from "path";
import { config as loadEnv } from "dotenv";
import {
  analyzePageText,
  countWords,
  createStory,
  WORD_LIMITS,
  type CreatedStory,
  type Gender,
  type StoryPage,
} from "@/lib/story/engine";
import { checkIntellectualProperty, ipErrorMessage } from "@/lib/story/contentSafety";
import {
  ensureReferenceSheets,
  estimateImageCostUsd,
  renderScene,
  type PhotoLike,
} from "@/lib/story/illustrate";
import { isQaEnabled, type QaResult } from "@/lib/story/qualityCheck";
import type { AgeRange } from "@/lib/validation";

loadEnv({ path: ".env.local", override: false });

interface Case {
  kidName: string;
  theme: string;
  ageRange: AgeRange;
  style: string;
  gender: Gender | null;
  companion?: string;
  characterDescription?: string;
  /** Usar la foto de --photo en este caso */
  photo?: boolean;
  /** El filtro de propiedad intelectual debe rechazarlo */
  expectReject?: boolean;
}

const CASES: Case[] = [
  { kidName: "Sofía", theme: "un dragón que no sabe volar", ageRange: "5-6", style: "watercolor", gender: "nina" },
  { kidName: "Leo", theme: "su primer día de cole", ageRange: "3-4", style: "cartoon", gender: "nino", companion: "su peluche, un elefante azul llamado Trompi" },
  { kidName: "Martina", theme: "astronauta que busca una estrella perdida", ageRange: "7-8", style: "classic", gender: "nina" },
  { kidName: "Hugo", theme: "dinosaurios en el jardín de casa", ageRange: "5-6", style: "cartoon", gender: "nino", companion: "su perro Toby, un labrador marrón" },
  { kidName: "Lucía", theme: "va a tener un hermanito", ageRange: "3-4", style: "watercolor", gender: "nina", photo: true, characterDescription: "niña de 4 años, pelo castaño rizado por los hombros, ojos marrones, piel morena clara, flequillo" },
  { kidName: "Mateo", theme: "piratas que buscan un tesoro en la playa", ageRange: "7-8", style: "comic", gender: "nino", companion: "su amiga Vega" },
  { kidName: "Valeria", theme: "un bosque donde los árboles hablan", ageRange: "5-6", style: "classic", gender: "nina" },
  { kidName: "Daniel", theme: "fútbol: quiere marcar su primer gol", ageRange: "7-8", style: "cartoon", gender: "nino" },
  { kidName: "Alba", theme: "sirenas y un faro en el fondo del mar", ageRange: "5-6", style: "watercolor", gender: "nina", photo: true, characterDescription: "niña de 6 años, pelo rubio liso largo, ojos azules, piel clara con pecas" },
  { kidName: "Pablo", theme: "superhéroe que ayuda a su abuela", ageRange: "3-4", style: "cartoon", gender: "nino", companion: "su gata Mora, gris con manchas blancas" },
  // Casos nuevos (REVISION-PRODUCTO-2026-10 §5)
  { kidName: "Noa", theme: "un caracol que quiere ver el mar", ageRange: "5-6", style: "watercolor", gender: null },
  { kidName: "Izan", theme: "construyen una cabaña en el árbol", ageRange: "5-6", style: "cartoon", gender: "nino", companion: "su mejor amigo Bruno, un niño de 6 años con pelo negro rizado, piel morena y camiseta amarilla" },
  { kidName: "Aisha", theme: "una biblioteca donde se escapan los dibujos", ageRange: "7-8", style: "classic", gender: "nina", photo: true, characterDescription: "niña de 7 años, piel oscura, pelo negro muy rizado recogido en dos moños, gafas redondas rojas, ojos marrones oscuros" },
  { kidName: "Gael", theme: "la gran carrera del parque", ageRange: "7-8", style: "cartoon", gender: "nino", characterDescription: "niño de 8 años en silla de ruedas deportiva azul, pelo castaño corto, ojos verdes, piel clara, pecas" },
  { kidName: "Carla", theme: "Elsa de Frozen y la Patrulla Canina salvan la Navidad", ageRange: "5-6", style: "cartoon", gender: "nina", expectReject: true },
  { kidName: "Martín", theme: "el monstruo que vive debajo de la cama", ageRange: "3-4", style: "watercolor", gender: "nino" },
];

const TEXT_COST_USD = 0.12; // biblia + páginas + revisión + pulido con gpt-4.1 (aprox.)
const QA_COST_USD = 0.003; // por comprobación con gpt-4.1-mini (aprox.)

const args = process.argv.slice(2);
const full = args.includes("--full");
const withImages = full || args.includes("--images");
const argValue = (flag: string) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const onlyIndex = argValue("--only") ? parseInt(argValue("--only")!, 10) : null;
const photoPath = argValue("--photo");

interface PageResult {
  pageNumber: number;
  image?: string;
  qa?: QaResult | null;
  attempts?: number;
}

interface CaseResult {
  index: number;
  input: Case;
  story?: CreatedStory;
  images: Record<string, string>;
  pages: PageResult[];
  rejected?: string;
  error?: string;
  costUsd: number;
  ms: number;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("Falta OPENAI_API_KEY");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join("storage", "eval", stamp);
  await fs.mkdir(outDir, { recursive: true });

  const photo: PhotoLike | null = photoPath
    ? {
        buffer: await fs.readFile(photoPath),
        mimeType: /\.png$/i.test(photoPath)
          ? "image/png"
          : /\.webp$/i.test(photoPath)
            ? "image/webp"
            : "image/jpeg",
      }
    : null;

  const selected = onlyIndex
    ? [{ input: CASES[onlyIndex - 1], index: onlyIndex }]
    : CASES.map((input, i) => ({ input, index: i + 1 }));
  const results: CaseResult[] = [];

  for (const { input, index } of selected) {
    const started = Date.now();
    const result: CaseResult = { index, input, images: {}, pages: [], costUsd: 0, ms: 0 };
    console.log(`[${index}/${CASES.length}] ${input.kidName}: ${input.theme}`);

    // Mismo filtro que /api/books/[id]/generate-story
    const ip = checkIntellectualProperty({ theme: input.theme, companion: input.companion });
    if (ip) {
      result.rejected = ipErrorMessage(ip);
      result.ms = Date.now() - started;
      results.push(result);
      console.log(`  rechazado por IP: ${result.rejected}`);
      continue;
    }

    try {
      const story = await createStory(input);
      result.story = story;
      result.costUsd += TEXT_COST_USD;

      if (withImages) {
        const usePhoto = photo && (input.photo || onlyIndex) ? photo : null;
        const refs = await ensureReferenceSheets({
          bible: story.bible,
          style: input.style,
          photo: usePhoto,
          traits: input.characterDescription,
          load: (file) => fs.readFile(path.join(outDir, file)),
          store: async (character, image) =>
            save(outDir, `${index}-ref-${character.id}.png`, image),
        });
        for (const character of story.bible.characters) {
          if (character.refUrl) result.images[`ref ${character.name}${character.fromPhoto ? " (foto)" : ""}`] = character.refUrl;
        }
        result.costUsd += story.bible.characters.length * estimateImageCostUsd("medium", 1);

        const cover = await renderScene({
          bible: story.bible,
          style: input.style,
          cover: true,
          refs,
          quality: "high",
          context: { eval: index, page: 1 },
        });
        result.images.portada = await save(outDir, `${index}-cover.png`, cover.image);
        result.pages.push({ pageNumber: 1, image: result.images.portada, qa: cover.qa, attempts: cover.attempts });
        result.costUsd += cover.costUsd + qaCost(cover.attempts);

        const pageNumbers = full
          ? story.pages.filter((p) => p.pageNumber > 1).map((p) => p.pageNumber)
          : [2, 7, 12];
        for (const pageNumber of pageNumbers) {
          const page = story.pages.find((p) => p.pageNumber === pageNumber);
          if (!page) continue;
          const rendered = await renderScene({
            bible: story.bible,
            style: input.style,
            scene: page.scene,
            refs,
            styleAnchor: cover.image,
            quality: "medium",
            context: { eval: index, page: pageNumber },
          });
          const file = await save(outDir, `${index}-p${pageNumber}.png`, rendered.image);
          result.images[`p${pageNumber}`] = file;
          result.pages.push({ pageNumber, image: file, qa: rendered.qa, attempts: rendered.attempts });
          result.costUsd += rendered.costUsd + qaCost(rendered.attempts);
          console.log(`  p${pageNumber}: QA ${rendered.qa ? `${rendered.qa.identity}/5${rendered.passed ? "" : " (no pasa)"}` : "—"}`);
        }
      }
    } catch (error) {
      console.error(error);
      result.error = String(error);
    }
    result.ms = Date.now() - started;
    results.push(result);
  }

  await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
  await fs.writeFile(path.join(outDir, "index.html"), renderHtml(results));
  console.log(`\nHoja de evaluación: ${path.resolve(outDir, "index.html")}`);
}

function qaCost(attempts: number): number {
  return isQaEnabled() ? attempts * QA_COST_USD : 0;
}

async function save(dir: string, name: string, buffer: Buffer): Promise<string> {
  await fs.writeFile(path.join(dir, name), buffer);
  return name;
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ============================================
// Métricas
// ============================================

interface TextMetrics {
  overLimit: number;
  cliches: string[];
  dialoguePages: number;
  dashPages: number;
  magicCount: number;
  titleWords: number;
}

function hasDialogue(text: string): boolean {
  return /["“”—]/.test(text);
}

function textMetrics(story: CreatedStory, ageRange: AgeRange): TextMetrics {
  const pages = story.pages.filter((p) => p.pageNumber > 1);
  const reports = pages.map((p) => analyzePageText(p.text, ageRange));
  const dialogue = pages.filter((p) => hasDialogue(p.text));
  return {
    overLimit: reports.filter((r) => r.overLimit).length,
    cliches: reports.flatMap((r) => r.cliches),
    dialoguePages: dialogue.length,
    dashPages: dialogue.filter((p) => p.text.includes("—") && !/["“”]/.test(p.text)).length,
    magicCount: pages.reduce((n, p) => n + (p.text.match(/\bm[aá]gic[oa]s?\b/gi)?.length ?? 0), 0),
    titleWords: countWords(story.title),
  };
}

function qaCell(qa: QaResult | null | undefined, attempts?: number): string {
  if (qa === undefined) return "";
  if (!qa) return `<td class="muted">QA —</td>`;
  const flags = [
    qa.textOrLetters ? "letras" : "",
    qa.anatomyIssue ? "anatomía" : "",
    qa.unsafe ? "inseguro" : "",
    qa.outfitMatch ? "" : "ropa",
    qa.styleMatch ? "" : "estilo",
  ].filter(Boolean);
  const bad = qa.identity < 4 || qa.textOrLetters || qa.anatomyIssue || qa.unsafe;
  return `<td class="${bad ? "bad" : "ok"}">id ${qa.identity}/5${flags.length ? ` · ${flags.join(", ")}` : ""}${attempts && attempts > 1 ? ` · ${attempts} intentos` : ""}<br><small>${esc(qa.notes)}</small></td>`;
}

function pageRow(page: StoryPage, ageRange: AgeRange, pageResult?: PageResult): string {
  if (page.pageNumber === 1) {
    return `<tr><td>1</td><td><b>${esc(page.text)}</b> <small>(${countWords(page.text)} palabras)</small></td><td></td><td></td>${qaCell(pageResult?.qa, pageResult?.attempts) || "<td></td>"}</tr>`;
  }
  const r = analyzePageText(page.text, ageRange);
  const style = [
    r.cliches.length ? `clichés: ${r.cliches.join(", ")}` : "",
    r.quotes ? "comillas" : "",
    r.dialogueDash ? "raya ✓" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `<tr><td>${page.pageNumber}</td><td>${esc(page.text)}<br><small>[${page.scene.characters.join(", ")} · ${page.scene.location} · ${page.scene.shot} · ${page.scene.timeOfDay ?? "?"}]</small></td><td class="${r.overLimit ? "bad" : "ok"}">${r.words}/${r.limit}</td><td class="${r.cliches.length || r.quotes ? "bad" : ""}">${esc(style)}</td>${qaCell(pageResult?.qa, pageResult?.attempts) || "<td></td>"}</tr>`;
}

function renderHtml(results: CaseResult[]): string {
  const model = `${process.env.STORY_MODEL || "gpt-4.1"} / ${process.env.IMAGE_MODEL || "gpt-image-1"} / QA ${isQaEnabled() ? process.env.QA_MODEL || "gpt-4.1-mini" : "off"}`;

  // Resumen global
  const stories = results.filter((r) => r.story);
  const metrics = stories.map((r) => textMetrics(r.story!, r.input.ageRange));
  const qas = results.flatMap((r) => r.pages.map((p) => p.qa).filter((q): q is QaResult => !!q));
  const ipCases = results.filter((r) => r.input.expectReject !== undefined || r.rejected);
  const ipOk = ipCases.filter((r) => !!r.rejected === !!r.input.expectReject).length;
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const totalPages = stories.length * 12;
  const dialoguePages = sum(metrics.map((m) => m.dialoguePages));
  const summary = `<table class="summary">
<tr><th>Páginas fuera de límite</th><td>${sum(metrics.map((m) => m.overLimit))} / ${totalPages}</td></tr>
<tr><th>Clichés detectados</th><td>${sum(metrics.map((m) => m.cliches.length))}</td></tr>
<tr><th>Diálogos con raya</th><td>${dialoguePages ? Math.round((100 * sum(metrics.map((m) => m.dashPages))) / dialoguePages) : 100} % (${dialoguePages} páginas con diálogo)</td></tr>
<tr><th>Títulos de más de 6 palabras</th><td>${metrics.filter((m) => m.titleWords > 6).length}</td></tr>
<tr><th>QA: identidad media</th><td>${qas.length ? (sum(qas.map((q) => q.identity)) / qas.length).toFixed(2) : "—"} (mín. ${qas.length ? Math.min(...qas.map((q) => q.identity)) : "—"}) · objetivo ≥ 4 y ninguna &lt; 3</td></tr>
<tr><th>QA: páginas sin letras</th><td>${qas.length ? Math.round((100 * qas.filter((q) => !q.textOrLetters).length) / qas.length) : "—"} % · objetivo ≥ 95 %</td></tr>
<tr><th>QA: anatomía / inseguro</th><td>${qas.filter((q) => q.anatomyIssue).length} / ${qas.filter((q) => q.unsafe).length}</td></tr>
<tr><th>Filtro de IP</th><td>${ipOk} / ${ipCases.length} correctos</td></tr>
<tr><th>Coste aproximado</th><td>${sum(results.map((r) => r.costUsd)).toFixed(2)} $ (${stories.length ? (sum(results.map((r) => r.costUsd)) / stories.length).toFixed(2) : "0"} $ por caso)</td></tr>
</table>`;

  const cards = results
    .map((r) => {
      const imgs = Object.entries(r.images)
        .map(([label, file]) => `<figure><img src="${file}" alt="${esc(label)}"><figcaption>${esc(label)}</figcaption></figure>`)
        .join("");
      const byPage = new Map(r.pages.map((p) => [p.pageNumber, p]));
      const rows = r.story?.pages.map((p) => pageRow(p, r.input.ageRange, byPage.get(p.pageNumber))).join("") ?? "";
      const characters = r.story?.bible.characters
        .map((c) => `<li><b>${esc(c.name)}</b> (${esc(c.kind)}, ${c.role}): ${esc(c.visual)}</li>`)
        .join("") ?? "";
      const m = r.story ? textMetrics(r.story, r.input.ageRange) : null;
      const ipLine = r.input.expectReject
        ? `<p class="${r.rejected ? "ok" : "bad"}">Cebo de IP: ${r.rejected ? `rechazado ✓ — ${esc(r.rejected)}` : "NO se rechazó ✗"}</p>`
        : r.rejected
          ? `<p class="bad">Rechazado por IP sin esperarlo: ${esc(r.rejected)}</p>`
          : "";
      return `<section>
<h2>${r.index}. ${esc(r.input.kidName)} · ${esc(r.input.theme)} <small>${r.input.ageRange} · ${r.input.style} · género ${r.input.gender ?? "sin indicar"}${r.input.companion ? ` · ${esc(r.input.companion)}` : ""}${r.input.characterDescription ? ` · ${esc(r.input.characterDescription)}` : ""} · ${(r.ms / 1000).toFixed(0)} s · ≈${r.costUsd.toFixed(2)} $</small></h2>
${ipLine}
${r.error ? `<p class="bad">${esc(r.error)}</p>` : ""}
${r.story ? `<h3>${esc(r.story.title)}</h3><p><i>${esc(r.story.bible.value)}</i> — ${esc(r.story.bible.summary)}</p>` : ""}
${m ? `<p class="metrics">Límite ${WORD_LIMITS[r.input.ageRange]} palabras · fuera de límite: <b>${m.overLimit}</b> · clichés: <b>${m.cliches.length}</b>${m.cliches.length ? ` (${esc(m.cliches.join(", "))})` : ""} · diálogos con raya: <b>${m.dashPages}/${m.dialoguePages}</b> · "mágico": <b>${m.magicCount}</b> · título: <b>${m.titleWords}</b> palabras</p>` : ""}
<div class="imgs">${imgs}</div>
${characters ? `<details><summary>Personajes</summary><ul>${characters}</ul></details>` : ""}
${rows ? `<table class="pages"><tr><th>#</th><th>Texto y escena</th><th>Palabras</th><th>Estilo</th><th>QA</th></tr>${rows}</table>` : ""}
${r.story ? `<table><tr><th>Parecido del protagonista</th><th>Secundarios y escenarios</th><th>Texto</th><th>¿Lo regalaría?</th><th>Notas</th></tr>
<tr><td contenteditable>_/5</td><td contenteditable>_/5</td><td contenteditable>_/5</td><td contenteditable>sí/no</td><td contenteditable></td></tr></table>` : ""}
</section>`;
    })
    .join("\n");

  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Evaluación del motor · ${esc(model)}</title>
<style>body{font-family:system-ui;max-width:1100px;margin:24px auto;padding:0 16px;color:#222}section{border-top:2px solid #eee;padding:16px 0}
.imgs{display:flex;gap:8px;flex-wrap:wrap}figure{margin:0}img{width:180px;height:180px;object-fit:cover;border-radius:8px}figcaption{font-size:12px;color:#666}
small{color:#888}table{border-collapse:collapse;margin-top:8px}td,th{border:1px solid #ddd;padding:6px 10px;font-size:13px;vertical-align:top;text-align:left}
.pages td:nth-child(2){max-width:560px}.bad{color:#b00020;background:#fff3f3}.ok{color:#11603a}.muted{color:#999}.metrics{font-size:14px}.summary th{background:#fafafa}</style>
<h1>Evaluación del motor de historias</h1><p>Modelos: <b>${esc(model)}</b> · ${new Date().toLocaleString("es-ES")} · modo ${full ? "libro completo" : withImages ? "muestra de imágenes" : "solo texto"}${photoPath ? " · con foto" : ""}</p>
<p>Umbral de "listo para vender": identidad media ≥ 4 y ninguna página &lt; 3; ≥ 95 % sin letras; ≤ 1 regeneración manual por libro; 0 fallos de seguridad o IP; texto ≥ 4/5; ≥ 70 % "sí lo regalaría".</p>
${summary}${cards}</html>`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
