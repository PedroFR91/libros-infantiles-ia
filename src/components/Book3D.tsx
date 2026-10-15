"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";

// Libro en 3D (modelo de Blender: public/models/libro.glb, ver blender/build_book.py).
// - Con portada e ilustración de un cuento concreto se dibuja su cubierta como
//   en el PDF de imprenta (ilustración + recuadro con el título).
// - Con `pages` se puede hojear entero como el libro impreso: texto a la
//   izquierda e ilustración a la derecha; cada hoja se curva al pasarla.
// three.js se carga solo cuando el libro entra en pantalla.

export interface Book3DPage {
  imageUrl: string | null;
  text: string;
}

interface Book3DProps {
  /** Ilustración de portada (sin texto); sin ella, la del modelo */
  coverUrl?: string | null;
  title?: string;
  kidName?: string;
  /** Primera ilustración (se ve al abrir la portada si no hay `pages`) */
  pageUrl?: string | null;
  /** Páginas del cuento (sin la portada): activa el modo hojear */
  pages?: Book3DPage[];
  className?: string;
}

const W = 0.19;
const LEAF_W = 0.1875;
const LEAF_H = 0.1878;
const SEGMENTS = 24;
const TURN_MS = 900;

type Controls = {
  open: () => void;
  close: () => void;
  next: () => void;
  prev: () => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadFonts() {
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
async function drawCover(coverUrl: string, title?: string, kidName?: string): Promise<HTMLCanvasElement> {
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
function drawTextPage(text: string, pageNumber: number | null): HTMLCanvasElement {
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
async function drawIllustration(url: string | null): Promise<HTMLCanvasElement> {
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

export default function Book3D({ coverUrl, title, kidName, pageUrl, pages, className }: Book3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const reading = Boolean(pages?.length);
  const [isOpen, setIsOpen] = useState(false);
  const [spread, setSpread] = useState(0); // hojas ya pasadas
  const [ready, setReady] = useState(false);
  const total = pages?.length ?? 0;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      await loadFonts();
      if (disposed) return;

      const width = el.clientWidth;
      const height = el.clientHeight;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      el.prepend(renderer.domElement);
      const maxAniso = renderer.capabilities.getMaxAnisotropy();

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, width / height, 0.01, 10);
      // Vista de tres cuartos (cerrado) y vista frontal (leyendo)
      const viewClosed = { pos: new THREE.Vector3(0.26, 0.22, 0.56), look: new THREE.Vector3(0.0, 0.095, 0) };
      const viewOpen = { pos: new THREE.Vector3(0, 0.12, 0.66), look: new THREE.Vector3(0, 0.095, 0) };
      const lookNow = viewClosed.look.clone();
      camera.position.copy(viewClosed.pos);
      camera.lookAt(lookNow);

      scene.add(new THREE.HemisphereLight(0xfff8ee, 0xe9dccb, 2.3));
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(-0.4, 0.8, 0.7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = sun.shadow.camera.bottom = -0.4;
      sun.shadow.camera.right = sun.shadow.camera.top = 0.4;
      sun.shadow.radius = 6;
      scene.add(sun);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShadowMaterial({ opacity: 0.14 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      const gltf = await new GLTFLoader().loadAsync("/models/libro.glb");
      if (disposed) {
        renderer.dispose();
        return;
      }
      const book = gltf.scene;
      const pivot = new THREE.Group();
      book.position.set(-W / 2, 0, 0);
      pivot.position.set(W / 2, 0, 0);
      pivot.add(book);
      scene.add(pivot);
      book.traverse((o) => {
        const mesh = o as InstanceType<typeof THREE.Mesh>;
        if (mesh.isMesh) mesh.castShadow = true;
      });
      const cover = book.getObjectByName("portada");
      const firstPage = book.getObjectByName("primera_pagina");

      const toTexture = (source: HTMLCanvasElement | HTMLImageElement, mirror = false) => {
        const tex = new THREE.Texture(source);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false; // convención glTF
        tex.anisotropy = maxAniso;
        if (mirror) {
          tex.wrapS = THREE.RepeatWrapping;
          tex.repeat.x = -1;
          tex.offset.x = 1;
        }
        tex.needsUpdate = true;
        return tex;
      };
      const setMap = (materialName: string, source: HTMLCanvasElement | HTMLImageElement) => {
        book.traverse((o) => {
          const mesh = o as InstanceType<typeof THREE.Mesh>;
          if (!mesh.isMesh) return;
          for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            const mat = m as InstanceType<typeof THREE.MeshStandardMaterial>;
            if (mat.name !== materialName) continue;
            mat.map = toTexture(source);
            mat.color.set(0xffffff);
            mat.needsUpdate = true;
          }
        });
      };
      if (coverUrl) drawCover(coverUrl, title, kidName).then((c) => !disposed && setMap("portada", c)).catch(() => undefined);
      if (pageUrl && !reading) loadImage(pageUrl).then((img) => !disposed && setMap("pagina", img)).catch(() => undefined);

      // ── Hojas para hojear (modo lectura) ───────────────────────────
      // Hoja j: delante la ilustración de la página j; detrás el texto de la
      // página j+1 (o "Fin"). El interior de la portada lleva el texto de la 1.
      type Leaf = { hinge: InstanceType<typeof THREE.Group>; geom: InstanceType<typeof THREE.BufferGeometry>; t: number; target: number; from: number };
      const leaves: Leaf[] = [];
      const T_HALF = 0.0018; // mitad del bloque de páginas (como en el modelo)
      const EPS = 0.00009;
      const baseX: number[] = [];
      if (reading && pages) {
        if (firstPage) firstPage.visible = false;
        setMap("interior_cubierta", drawTextPage(pages[0]?.text ?? "", 1));
        const n = pages.length;
        for (let j = 0; j < n; j++) {
          const geom = new THREE.PlaneGeometry(LEAF_W, LEAF_H, SEGMENTS, 1);
          geom.translate(LEAF_W / 2 + 0.0004, LEAF_H / 2 + 0.0011, 0);
          if (!baseX.length) {
            const pos = geom.attributes.position as InstanceType<typeof THREE.BufferAttribute>;
            for (let i = 0; i < pos.count; i++) baseX.push(pos.getX(i));
          }
          const front = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.FrontSide });
          const back = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.BackSide });
          const hinge = new THREE.Group();
          hinge.position.set(0, 0, T_HALF + (n - j) * EPS);
          const meshF = new THREE.Mesh(geom, front);
          const meshB = new THREE.Mesh(geom, back);
          meshF.castShadow = meshB.castShadow = true;
          hinge.add(meshF, meshB);
          book.add(hinge);
          leaves.push({ hinge, geom, t: 0, target: 0, from: 0 });
          const nextText = j + 1 < n ? pages[j + 1].text : "";
          drawIllustration(pages[j].imageUrl).then((c) => {
            if (disposed) return;
            front.map = toTexture(c);
            front.needsUpdate = true;
          });
          const backCanvas = j + 1 < n ? drawTextPage(nextText, j + 2) : drawTextPage("Fin", null);
          back.map = toTexture(backCanvas, true);
          back.needsUpdate = true;
        }
      }

      /** Coloca una hoja según su avance (0 = a la derecha, 1 = pasada), con curva */
      const shapeLeaf = (leaf: Leaf, index: number) => {
        const t = leaf.t;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const base = -Math.PI * ease;
        const curl = 0.9 * Math.sin(Math.PI * t);
        const pos = leaf.geom.attributes.position as InstanceType<typeof THREE.BufferAttribute>;
        // Columnas de vértices: x creciente desde el lomo
        const xs = baseX.slice(0, SEGMENTS + 1).map((x) => x);
        const seg = LEAF_W / SEGMENTS;
        let px = 0.0004;
        let pz = 0;
        const colX: number[] = [px];
        const colZ: number[] = [pz];
        for (let k = 1; k <= SEGMENTS; k++) {
          const phi = base + curl * (k / SEGMENTS);
          px += seg * Math.cos(phi);
          pz += -seg * Math.sin(phi);
          colX.push(px);
          colZ.push(pz);
        }
        for (let i = 0; i < pos.count; i++) {
          const k = Math.round((baseX[i] - xs[0]) / seg);
          pos.setX(i, colX[k]);
          pos.setZ(i, colZ[k]);
        }
        pos.needsUpdate = true;
        leaf.geom.computeVertexNormals();
        // Altura de la hoja en el montón: a la derecha la primera arriba; a la izquierda, la última pasada arriba
        const n = leaves.length;
        const zRight = T_HALF + (n - index) * EPS;
        const zLeft = T_HALF + (index + 1) * EPS;
        leaf.hinge.position.z = zRight + (zLeft - zRight) * ease;
      };
      leaves.forEach((l, i) => shapeLeaf(l, i));

      // ── Estado e interacción ───────────────────────────────────────
      let wantOpen = false;
      let open = 0;
      let turned = 0;
      let drag = 0;
      let dragTarget = 0;
      let dragFrom: number | null = null;
      let moved = false;
      const canvas = renderer.domElement;
      canvas.style.touchAction = "pan-y";
      canvas.style.cursor = reading ? "pointer" : "grab";

      const turnTo = (count: number) => {
        turned = Math.max(0, Math.min(leaves.length, count));
        leaves.forEach((leaf, i) => (leaf.target = i < turned ? 1 : 0));
        setSpread(turned);
      };
      controls.current = {
        open: () => {
          wantOpen = true;
          setIsOpen(true);
        },
        close: () => {
          turnTo(0);
          wantOpen = false;
          setIsOpen(false);
        },
        next: () => turnTo(turned + 1),
        prev: () => turnTo(turned - 1),
      };

      const onEnter = () => {
        if (!reading) wantOpen = true;
      };
      const onLeave = () => {
        if (!reading) wantOpen = false;
        dragFrom = null;
      };
      const onDown = (e: PointerEvent) => {
        dragFrom = e.clientX;
        moved = false;
      };
      const onMove = (e: PointerEvent) => {
        if (dragFrom === null || (reading && wantOpen)) return;
        const dx = e.clientX - dragFrom;
        if (Math.abs(dx) > 4) moved = true;
        dragTarget = Math.max(-1.1, Math.min(1.1, dragTarget + dx * 0.006));
        dragFrom = e.clientX;
      };
      const onUp = (e: PointerEvent) => {
        if (dragFrom === null) return;
        const dx = e.clientX - dragFrom;
        dragFrom = null;
        if (reading) {
          if (!wantOpen) {
            if (!moved) controls.current?.open();
            return;
          }
          // Abierto: deslizar o tocar a un lado pasa página
          if (Math.abs(dx) > 30) return dx < 0 ? controls.current?.next() : controls.current?.prev();
          const rect = canvas.getBoundingClientRect();
          return e.clientX > rect.left + rect.width / 2 ? controls.current?.next() : controls.current?.prev();
        }
        if (!moved && e.pointerType !== "mouse") wantOpen = !wantOpen; // tocar abre y cierra
      };
      canvas.addEventListener("pointerenter", onEnter);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      const onKey = (e: KeyboardEvent) => {
        if (!reading || !wantOpen) return;
        if (e.key === "ArrowRight") controls.current?.next();
        if (e.key === "ArrowLeft") controls.current?.prev();
        if (e.key === "Escape") controls.current?.close();
      };
      window.addEventListener("keydown", onKey);

      let visible = true;
      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      io.observe(el);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const clock = new THREE.Clock();
      let last = performance.now();
      let frame = 0;
      const tick = () => {
        frame = requestAnimationFrame(tick);
        if (!visible) return;
        const now = performance.now();
        const dt = Math.min(64, now - last);
        last = now;
        const t = clock.getElapsedTime();
        open += ((wantOpen ? 1 : 0) - open) * 0.07;
        drag += ((reading && wantOpen ? 0 : dragTarget) - drag) * 0.1;
        if (cover) cover.rotation.y = -THREE.MathUtils.degToRad(reading ? 180 : 150) * open;
        const sway = reduced || (reading && wantOpen) ? 0 : Math.sin(t * 0.6) * 0.12;
        pivot.rotation.y = drag + sway * (1 - open) - (reading ? 0 : 0.15 * open);
        // Cámara: de tres cuartos a frontal al abrir para leer
        if (reading) {
          camera.position.lerpVectors(viewClosed.pos, viewOpen.pos, open);
          lookNow.lerpVectors(viewClosed.look, viewOpen.look, open);
          camera.lookAt(lookNow);
        }
        // Hojas en movimiento
        const step = dt / TURN_MS;
        leaves.forEach((leaf, i) => {
          if (leaf.t === leaf.target) return;
          leaf.t = leaf.target > leaf.t ? Math.min(leaf.target, leaf.t + step) : Math.max(leaf.target, leaf.t - step);
          shapeLeaf(leaf, i);
        });
        renderer.render(scene, camera);
      };
      tick();
      setReady(true);

      const ro = new ResizeObserver(() => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
      ro.observe(el);

      cleanup = () => {
        cancelAnimationFrame(frame);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("keydown", onKey);
        renderer.dispose();
        canvas.remove();
        controls.current = null;
      };
    };

    const lazy = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          lazy.disconnect();
          void start();
        }
      },
      { rootMargin: "200px" },
    );
    lazy.observe(el);

    return () => {
      disposed = true;
      lazy.disconnect();
      cleanup?.();
    };
  }, [coverUrl, title, kidName, pageUrl, pages, reading]);

  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-full bg-white/90 hover:bg-white text-text shadow-md border border-border font-bold text-sm disabled:opacity-30";

  return (
    <div ref={host} className={`relative ${className ?? ""}`} aria-label={title ? `Libro «${title}» en 3D` : "Libro en 3D"} role='img'>
      {reading && ready && (
        <div className='absolute inset-x-0 bottom-2 flex items-center justify-center gap-2 pointer-events-none'>
          {!isOpen ? (
            <button onClick={() => controls.current?.open()} className={`${btn} px-4 py-2 pointer-events-auto`}>
              <BookOpen className='w-4 h-4' /> Abrir y hojear
            </button>
          ) : (
            <>
              <button aria-label='Página anterior' onClick={() => controls.current?.prev()} disabled={spread === 0} className={`${btn} w-10 h-10 pointer-events-auto`}>
                <ChevronLeft className='w-5 h-5' />
              </button>
              <span className='rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold border border-border'>
                {spread === 0 ? "Página 1" : spread >= total ? "Fin" : `Página ${spread + 1} de ${total}`}
              </span>
              <button aria-label='Página siguiente' onClick={() => controls.current?.next()} disabled={spread >= total} className={`${btn} w-10 h-10 pointer-events-auto`}>
                <ChevronRight className='w-5 h-5' />
              </button>
              <button aria-label='Cerrar el libro' onClick={() => controls.current?.close()} className={`${btn} w-10 h-10 pointer-events-auto`}>
                <X className='w-4 h-4' />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
