// Dibujo de las texturas del libro 3D (cubierta, páginas de texto e
// ilustraciones) en un <canvas>, igual que el PDF de imprenta. Solo navegador.

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadFonts() {
  const faces = [
    new FontFace("Sniglet", "url(/fonts/Sniglet-ExtraBold.ttf)"),
    new FontFace("Andika", "url(/fonts/Andika-Regular.ttf)"),
  ];
  for (const f of faces) {
    try {
      document.fonts.add(await f.load());
    } catch {
      // se usa la fuente de reserva
    }
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    const probe = line ? `${line} ${w}` : w;
    if (ctx.measureText(probe).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = probe;
  }
  if (line) lines.push(line);
  return lines;
}

/** Cubierta como la del PDF: ilustración a sangre + recuadro blanco con el título */
export async function drawCover(coverUrl: string, title?: string, kidName?: string): Promise<HTMLCanvasElement> {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = await loadImage(coverUrl);
  const scale = Math.max(size / img.width, size / img.height);
  ctx.drawImage(img, (size - img.width * scale) / 2, (size - img.height * scale) / 2, img.width * scale, img.height * scale);
  if (!title) return canvas;
  ctx.font = "800 64px Sniglet, 'Arial Rounded MT Bold', sans-serif";
  const lines = wrap(ctx, title, size * 0.84).slice(0, 3);
  const boxH = 70 + lines.length * 74 + (kidName ? 40 : 0);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.beginPath();
  ctx.roundRect(size * 0.05, size * 0.05, size * 0.9, boxH, 18);
  ctx.fill();
  ctx.fillStyle = "#7c3aed";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, size / 2, size * 0.05 + 34 + i * 74));
  if (kidName) {
    ctx.font = "600 28px Nunito, sans-serif";
    ctx.fillStyle = "#3b3048";
    ctx.fillText(`Una aventura de ${kidName}`, size / 2, size * 0.05 + 40 + lines.length * 74);
  }
  return canvas;
}

/** Página de texto como en el libro impreso (crema, texto centrado, número) */
export function drawTextPage(text: string, pageNumber: number | null): HTMLCanvasElement {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fdf8ee";
  ctx.fillRect(0, 0, size, size);
  // Sombra suave hacia el lomo (lado derecho en la página de la izquierda)
  const g = ctx.createLinearGradient(size * 0.82, 0, size, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(60,40,20,0.12)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#33293f";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  let fontSize = 46;
  let lines: string[] = [];
  do {
    ctx.font = `${fontSize}px Andika, Nunito, sans-serif`;
    lines = wrap(ctx, text, size * 0.74);
    if (lines.length * fontSize * 1.5 < size * 0.72) break;
    fontSize -= 2;
  } while (fontSize > 24);
  const lineH = fontSize * 1.5;
  let y = (size - lines.length * lineH) / 2;
  for (const l of lines) {
    ctx.fillText(l, size / 2, y);
    y += lineH;
  }
  if (pageNumber !== null) {
    ctx.font = "26px Andika, sans-serif";
    ctx.fillStyle = "#9a8f9f";
    ctx.fillText(String(pageNumber), size / 2, size - 70);
  }
  return canvas;
}

/** Ilustración a sangre con una sombra suave hacia el lomo (lado izquierdo) */
export async function drawIllustration(url: string | null): Promise<HTMLCanvasElement> {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fdf8ee";
  ctx.fillRect(0, 0, size, size);
  if (url) {
    try {
      const img = await loadImage(url);
      const scale = Math.max(size / img.width, size / img.height);
      ctx.drawImage(img, (size - img.width * scale) / 2, (size - img.height * scale) / 2, img.width * scale, img.height * scale);
    } catch {
      // página sin imagen: queda crema
    }
  }
  const g = ctx.createLinearGradient(0, 0, size * 0.14, 0);
  g.addColorStop(0, "rgba(60,40,20,0.18)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}
