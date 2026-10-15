"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import { createBookScene, type BookPage } from "./book3d/bookScene";

// Libro en 3D para hojear (la escena está en book3d/bookScene.ts).
// - Con portada e ilustración de un cuento concreto se dibuja su cubierta como
//   en el PDF de imprenta (ilustración + recuadro con el título).
// - Con `pages` se puede hojear entero como el libro impreso: texto a la
//   izquierda e ilustración a la derecha; cada hoja se curva al pasarla.
// three.js se carga solo cuando el libro entra en pantalla.

export type Book3DPage = BookPage;

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

const TURN_MS = 900;

type Controls = {
  open: () => void;
  close: () => void;
  next: () => void;
  prev: () => void;
};

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
      const book3d = await createBookScene(el, { coverUrl, title, kidName, pageUrl, pages }, () => disposed);
      if (!book3d) return;
      const { THREE, renderer, scene, camera, pivot, cover, leaves, shapeLeaf } = book3d;

      // Vista de tres cuartos (cerrado) y vista frontal (leyendo)
      const viewClosed = { pos: new THREE.Vector3(0.26, 0.22, 0.56), look: new THREE.Vector3(0.0, 0.095, 0) };
      const viewOpen = { pos: new THREE.Vector3(0, 0.12, 0.66), look: new THREE.Vector3(0, 0.095, 0) };
      const lookNow = viewClosed.look.clone();
      camera.position.copy(viewClosed.pos);
      camera.lookAt(lookNow);

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
          shapeLeaf(i);
        });
        renderer.render(scene, camera);
      };
      tick();
      setReady(true);

      const ro = new ResizeObserver(book3d.resize);
      ro.observe(el);

      cleanup = () => {
        cancelAnimationFrame(frame);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("keydown", onKey);
        book3d.dispose();
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
