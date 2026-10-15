"use client";

import { useEffect, useRef } from "react";

// Libro en 3D (modelo de Blender: public/models/libro.glb, ver blender/build_book.py).
// Con portada e ilustración de un cuento concreto se dibuja su cubierta como en
// el PDF de imprenta (ilustración + recuadro con el título). Se abre al pasar
// el ratón o al tocarlo y se puede girar arrastrando. three.js se carga solo
// cuando el libro entra en pantalla.

interface Book3DProps {
  /** Ilustración de portada (sin texto); sin ella, la del modelo */
  coverUrl?: string | null;
  title?: string;
  kidName?: string;
  /** Primera ilustración (se ve al abrir la portada) */
  pageUrl?: string | null;
  className?: string;
  /** Abierto desde el principio (p. ej. para enseñar el interior) */
  startOpen?: boolean;
}

const OPEN_DEG = 150;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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

  try {
    const font = new FontFace("Sniglet", "url(/fonts/Sniglet-ExtraBold.ttf)");
    document.fonts.add(await font.load());
  } catch {
    // sin la fuente se usa la de reserva
  }
  // Partir el título en dos líneas como mucho
  ctx.font = "800 64px Sniglet, 'Arial Rounded MT Bold', sans-serif";
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (ctx.measureText(probe).width > size * 0.84 && line) {
      lines.push(line);
      line = w;
    } else line = probe;
  }
  lines.push(line);
  const shown = lines.slice(0, 3);
  const boxH = 70 + shown.length * 74 + (kidName ? 40 : 0);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.beginPath();
  ctx.roundRect(size * 0.05, size * 0.05, size * 0.9, boxH, 18);
  ctx.fill();
  ctx.fillStyle = "#7c3aed";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  shown.forEach((l, i) => ctx.fillText(l, size / 2, size * 0.05 + 34 + i * 74));
  if (kidName) {
    ctx.font = "600 28px Nunito, sans-serif";
    ctx.fillStyle = "#3b3048";
    ctx.fillText(`Una aventura de ${kidName}`, size / 2, size * 0.05 + 40 + shown.length * 74);
  }
  return canvas;
}

export default function Book3D({ coverUrl, title, kidName, pageUrl, className, startOpen = false }: Book3DProps) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed) return;

      const width = el.clientWidth;
      const height = el.clientHeight;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, width / height, 0.01, 10);
      camera.position.set(0.24, 0.2, 0.62);
      camera.lookAt(0.06, 0.095, 0);

      scene.add(new THREE.HemisphereLight(0xfff8ee, 0xe9dccb, 2.2));
      const sun = new THREE.DirectionalLight(0xffffff, 2.4);
      sun.position.set(-0.4, 0.8, 0.6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = sun.shadow.camera.bottom = -0.4;
      sun.shadow.camera.right = sun.shadow.camera.top = 0.4;
      sun.shadow.radius = 6;
      scene.add(sun);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShadowMaterial({ opacity: 0.16 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      const gltf = await new GLTFLoader().loadAsync("/models/libro.glb");
      if (disposed) {
        renderer.dispose();
        return;
      }
      const book = gltf.scene;
      // Pivote en el centro del libro para girarlo sobre sí mismo
      const pivot = new THREE.Group();
      book.position.set(-0.095, 0, 0);
      pivot.position.set(0.095, 0, 0);
      pivot.add(book);
      scene.add(pivot);
      book.traverse((o) => {
        const mesh = o as InstanceType<typeof THREE.Mesh>;
        if (mesh.isMesh) mesh.castShadow = true;
      });
      const cover = book.getObjectByName("portada");

      // Texturas del cuento concreto
      const setMap = (materialName: string, source: HTMLCanvasElement | HTMLImageElement) => {
        book.traverse((o) => {
          const mesh = o as InstanceType<typeof THREE.Mesh>;
          if (!mesh.isMesh) return;
          for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            const mat = m as InstanceType<typeof THREE.MeshStandardMaterial>;
            if (mat.name !== materialName) continue;
            const tex = new THREE.Texture(source);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false; // convención glTF
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            tex.needsUpdate = true;
            mat.map = tex;
            mat.needsUpdate = true;
          }
        });
      };
      if (coverUrl) drawCover(coverUrl, title, kidName).then((c) => !disposed && setMap("portada", c)).catch(() => undefined);
      if (pageUrl) loadImage(pageUrl).then((img) => !disposed && setMap("pagina", img)).catch(() => undefined);

      // Interacción: abrir al pasar el ratón / tocar; girar arrastrando
      let wantOpen = startOpen;
      let open = startOpen ? 1 : 0;
      let drag = 0;
      let dragTarget = 0;
      let dragFrom: number | null = null;
      let moved = false;
      const canvas = renderer.domElement;
      canvas.style.touchAction = "pan-y";
      canvas.style.cursor = "grab";
      const onEnter = () => (wantOpen = true);
      const onLeave = () => {
        wantOpen = startOpen;
        dragFrom = null;
      };
      const onDown = (e: PointerEvent) => {
        dragFrom = e.clientX;
        moved = false;
      };
      const onMove = (e: PointerEvent) => {
        if (dragFrom === null) return;
        const dx = e.clientX - dragFrom;
        if (Math.abs(dx) > 4) moved = true;
        dragTarget = Math.max(-1.1, Math.min(1.1, dragTarget + dx * 0.006));
        dragFrom = e.clientX;
      };
      const onUp = (e: PointerEvent) => {
        if (!moved && e.pointerType !== "mouse") wantOpen = !wantOpen; // tocar abre y cierra
        dragFrom = null;
      };
      canvas.addEventListener("pointerenter", onEnter);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      // Solo se anima mientras se ve
      let visible = true;
      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      io.observe(el);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const clock = new THREE.Clock();
      let frame = 0;
      const tick = () => {
        frame = requestAnimationFrame(tick);
        if (!visible) return;
        const t = clock.getElapsedTime();
        open += ((wantOpen ? 1 : 0) - open) * 0.08;
        drag += (dragTarget - drag) * 0.12;
        if (cover) cover.rotation.y = -THREE.MathUtils.degToRad(OPEN_DEG) * open;
        pivot.rotation.y = drag + (reduced ? 0 : Math.sin(t * 0.6) * 0.12) - 0.15 * open;
        pivot.position.y = reduced ? 0 : Math.sin(t * 1.2) * 0.002;
        renderer.render(scene, camera);
      };
      tick();

      const onResize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(el);

      cleanup = () => {
        cancelAnimationFrame(frame);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        renderer.dispose();
        canvas.remove();
      };
    };

    // three.js (~150 KB) solo cuando el libro está a punto de verse
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
  }, [coverUrl, title, kidName, pageUrl, startOpen]);

  return <div ref={host} className={className} aria-label={title ? `Libro «${title}» en 3D` : "Libro en 3D"} role='img' />;
}
