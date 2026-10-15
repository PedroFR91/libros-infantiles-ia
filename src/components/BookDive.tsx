"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { createBookScene, RIGHT_PAGE, W, type BookScene } from "./book3d/bookScene";

// Viaje por el cuento: se entra en el libro y se recorre por dentro.
// 1. Entrada: el libro 3D se abre y la cámara se zambulle en la primera
//    ilustración, que se abre en panorámica y cobra vida.
// 2. Dentro ya no hay libro: en cada parada la escena viva (bucle animado), el
//    texto y la voz. Al hacer scroll la cámara viaja hasta la escena siguiente
//    con un plano continuo (vídeo de transición de Veo, primer fotograma = esta
//    página y último = la siguiente) que avanza y retrocede con el scroll. Si
//    aún no hay transición, la cámara atraviesa la escena hacia la siguiente.
// 3. Salida: la cámara sale de la última ilustración y se ve el libro abierto.

export interface DivePage {
  imageUrl: string | null;
  text: string;
  audioUrl?: string | null;
  /** Bucle animado de la página (panorámica 16:9) */
  videoUrl?: string | null;
  /** Plano de cámara de esta página a la siguiente (16:9) */
  transitionUrl?: string | null;
}

interface Props {
  title: string;
  kidName: string;
  coverUrl: string | null;
  /** Portada animada (fondo del "Fin") */
  coverVideoUrl?: string | null;
  /** Páginas del cuento, sin la portada */
  pages: DivePage[];
  musicUrl?: string;
  /** Lector clásico (leer y escuchar en plano) */
  readUrl?: string;
}

/** Alto de scroll de cada unidad de la línea de tiempo, en alturas de pantalla */
const SEG_SVH = 120;
/** Entrada: abrir (0–0,8), zambullirse (0,8–1,35) y aparecer dentro (1,2–1,45) */
const INTRO = 1.5;
/** Cada página: parada y viaje hasta la siguiente */
const HOLD = 0.7;
const TRAVEL = 1.0;
const EXIT = 1.2;
/** La ilustración llena la pantalla con un poco de margen para no ver el borde */
const FILL = 1.03;
/** Reproducción automática: unidades de línea de tiempo por segundo fuera de los viajes */
const AUTO_MS_PER_UNIT = 2600;
const MUSIC_VOLUME = 0.14;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Sin voz: tiempo de lectura aproximado */
const readingMs = (text: string) => Math.min(12000, Math.max(4000, text.split(/\s+/).length * 360));

type Api = { next: () => void; prev: () => void; goTo: (s: number) => void; togglePlay: () => void; toggleSound: () => void };

/** Una escena a pantalla completa: bucle de vídeo o, si no hay, la ilustración */
function Scene({ slot }: { slot: (el: HTMLDivElement | null) => void }) {
  return (
    <div ref={slot} className='absolute inset-0 opacity-0 overflow-hidden' style={{ "--z": 1, "--blur": "0px" } as React.CSSProperties}>
      <div data-bg className='absolute inset-0 scale-110 bg-cover bg-center blur-2xl brightness-75' />
      <div className='absolute inset-0' style={{ transform: "scale(var(--z))", filter: "blur(var(--blur))" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-img alt='' className='absolute left-1/2 top-1/2 aspect-square max-w-none -translate-x-1/2 -translate-y-1/2 object-cover' style={{ height: `${FILL * 100}%` }} />
        <video
          data-video
          muted
          loop
          playsInline
          crossOrigin='anonymous'
          preload='auto'
          className='absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2'
          style={{ height: `max(${FILL * 100}%, calc(100vw * 9 / 16))`, aspectRatio: "16 / 9" }}
        />
      </div>
    </div>
  );
}

export default function BookDive({ title, kidName, coverUrl, coverVideoUrl, pages, musicUrl, readUrl }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([null, null]);
  const travel = useRef<HTMLVideoElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const captionText = useRef<HTMLParagraphElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const ending = useRef<HTMLDivElement>(null);
  const endingVideo = useRef<HTMLVideoElement>(null);
  const api = useRef<Api | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [label, setLabel] = useState("Portada");

  const n = pages.length;
  /** Comienzo de la parada de la página k */
  const at = (k: number) => INTRO + k * (HOLD + TRAVEL);
  const exitStart = at(n - 1) + HOLD;
  const S = exitStart + EXIT;
  const stops = [0, ...pages.map((_, k) => at(k) + HOLD / 2), S];

  useEffect(() => {
    const el = stage.current;
    if (!el || !n) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      let book3d: BookScene | null;
      try {
        book3d = await createBookScene(el, { coverUrl, title, kidName, pages, shadows: true }, () => disposed);
      } catch {
        setFailed(true);
        return;
      }
      if (!book3d) return;
      const { THREE, renderer, scene, camera, pivot, cover, leaves, shapeLeaf } = book3d;
      const html = document.documentElement;
      html.style.scrollSnapType = "y proximity";

      // ── Escenas: dos huecos que se alternan (página k en el hueco k % 2) ──
      type Slot = { el: HTMLDivElement; video: HTMLVideoElement; img: HTMLImageElement; bg: HTMLDivElement; page: number; tex: InstanceType<typeof THREE.VideoTexture> };
      const slotList: Slot[] = slots.current.map((s) => {
        const video = s!.querySelector("video")!;
        const tex = new THREE.VideoTexture(video);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.repeat.x = 9 / 16; // el centro del vídeo 16:9 es la ilustración original
        tex.offset.x = (1 - 9 / 16) / 2;
        return { el: s!, video, img: s!.querySelector("img")!, bg: s!.querySelector("[data-bg]") as HTMLDivElement, page: -1, tex };
      });
      const slotOf = (k: number) => slotList[k % 2];
      /** Carga la página k en su hueco (si no estaba ya) */
      const load = (k: number) => {
        if (k < 0 || k >= n) return;
        const slot = slotOf(k);
        if (slot.page === k) return;
        slot.page = k;
        const page = pages[k];
        slot.video.style.display = page.videoUrl ? "" : "none";
        slot.img.style.display = page.videoUrl ? "none" : "";
        slot.bg.style.backgroundImage = page.imageUrl ? `url("${page.imageUrl}")` : "";
        if (page.imageUrl) slot.img.src = page.imageUrl;
        if (page.videoUrl) {
          slot.video.src = page.videoUrl;
          slot.video.load();
        } else slot.video.removeAttribute("src");
      };
      const playSlot = (k: number, playIt: boolean, rewind = false) => {
        const slot = slotOf(k);
        if (slot.page !== k || !pages[k].videoUrl) return;
        if (rewind && slot.video.currentTime > 0.05) slot.video.currentTime = 0;
        if (playIt && slot.video.paused) slot.video.play().catch(() => undefined);
        if (!playIt && !slot.video.paused) slot.video.pause();
      };

      // Vídeo del viaje entre páginas (se mueve con el scroll)
      const tv = travel.current!;
      let travelFor = -1;
      const loadTravel = (k: number) => {
        if (travelFor === k) return;
        travelFor = k;
        const url = k >= 0 ? pages[k]?.transitionUrl : null;
        if (url) {
          tv.src = url;
          tv.load();
        } else tv.removeAttribute("src");
      };
      const travelReady = () => travelFor >= 0 && Boolean(pages[travelFor]?.transitionUrl) && tv.readyState >= 1 && tv.duration > 0;

      // ── Sonido: narración de la página en la que se está + música ───────
      const voice = new Audio();
      const music = musicUrl ? new Audio(musicUrl) : null;
      if (music) {
        music.loop = true;
        music.volume = MUSIC_VOLUME;
      }
      let sound = false;
      let visited: number | null = null;
      let doneAt = 0;
      voice.onended = () => (doneAt = performance.now() + 700);
      voice.onerror = () => (doneAt = performance.now());
      const visit = (k: number) => {
        visited = k;
        const page = pages[k];
        if (sound && page.audioUrl) {
          doneAt = Infinity;
          voice.src = page.audioUrl;
          voice.play().catch(() => (doneAt = performance.now() + readingMs(page.text)));
        } else doneAt = performance.now() + readingMs(page.text);
      };
      const leave = () => {
        visited = null;
        voice.pause();
      };
      const setSound = (on: boolean) => {
        sound = on;
        setSoundOn(on);
        if (on) {
          // Dentro del gesto del usuario, para que el móvil deje sonar el audio después
          music?.play().catch(() => undefined);
          if (!voice.src && pages[0]?.audioUrl) {
            voice.src = pages[0].audioUrl;
            // Solo se pausa si aún no está leyendo una página (la promesa puede llegar tarde)
            voice.play().then(() => visited === null && voice.pause()).catch(() => undefined);
          }
          if (visited !== null) visit(visited);
        } else {
          music?.pause();
          voice.pause();
        }
      };

      // ── Scroll ↔ línea de tiempo (los botones y la reproducción mueven el scroll)
      let tween: { from: number; to: number; t0: number; ms: number } | null = null;
      /** Reproducción: "auto" recorre el cuento; "step" va hasta la siguiente parada */
      let drive: { mode: "auto" | "step"; rate: number; target: number } | null = null;
      let hold: number | null = null;
      let holdSince = 0;
      const segPx = () => (document.documentElement.scrollHeight - el.clientHeight) / S;
      let sScroll = Math.min(S, window.scrollY / segPx());
      let sView = sScroll;
      const scrollToS = (s: number) => {
        sScroll = Math.max(0, Math.min(S, s));
        window.scrollTo({ top: sScroll * segPx(), behavior: "instant" });
      };
      const onScroll = () => {
        if (!tween && !drive) sScroll = Math.max(0, Math.min(S, window.scrollY / segPx()));
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      const snap = (on: boolean) => (html.style.scrollSnapType = on ? "y proximity" : "none");
      const stopDrive = () => {
        if (drive?.mode === "auto") setPlaying(false);
        drive = null;
        hold = null;
        if (!tv.paused) tv.pause();
        if (!tween) snap(true);
      };
      const goTo = (s: number) => {
        stopDrive();
        const dist = Math.abs(s - sScroll);
        tween = { from: sScroll, to: s, t0: performance.now(), ms: Math.min(2600, 700 + 900 * dist) };
        snap(false);
      };
      const step = () => {
        const target = stops.find((x) => x > sScroll + 0.02) ?? S;
        if (drive?.mode === "auto") setPlaying(false);
        tween = null;
        drive = { mode: "step", rate: 1.7, target };
        hold = null;
        snap(false);
      };
      const setAuto = (on: boolean) => {
        if (!on) return stopDrive();
        tween = null;
        drive = { mode: "auto", rate: 1, target: S };
        hold = null;
        setPlaying(true);
        snap(false);
        if (!sound) setSound(true);
        if (sScroll >= S - 0.01) scrollToS(0);
      };
      api.current = {
        next: step,
        prev: () => goTo([...stops].reverse().find((x) => x < sScroll - 0.02) ?? 0),
        goTo,
        togglePlay: () => setAuto(drive?.mode !== "auto"),
        toggleSound: () => setSound(!sound),
      };
      // Si el usuario mueve el scroll a mano, manda él
      const takeOver = () => {
        if (drive) stopDrive();
        if (tween) {
          tween = null;
          snap(true);
        }
      };
      window.addEventListener("wheel", takeOver, { passive: true });
      window.addEventListener("touchstart", takeOver, { passive: true });
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") api.current?.next();
        else if (e.key === "ArrowLeft") api.current?.prev();
        else if (e.key === " ") {
          e.preventDefault();
          api.current?.togglePlay();
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "PageDown" || e.key === "PageUp") takeOver();
      };
      window.addEventListener("keydown", onKey);

      /** Dónde está s: entrada, parada k, viaje k → k+1 o salida */
      const locate = (s: number) => {
        if (s < INTRO) return { phase: "intro" as const, k: 0, p: s / INTRO };
        if (s >= exitStart) return { phase: "exit" as const, k: n - 1, p: (s - exitStart) / EXIT };
        const k = Math.min(n - 1, Math.floor((s - INTRO) / (HOLD + TRAVEL)));
        const u = s - at(k);
        return u < HOLD ? { phase: "hold" as const, k, p: u / HOLD } : { phase: "travel" as const, k, p: (u - HOLD) / TRAVEL };
      };

      // ── Cámara del libro (entrada y salida) ──────────────────────────
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const fit = (halfW: number, halfH: number) => Math.max(halfH / tan, halfW / (tan * camera.aspect));
      const V = THREE.Vector3;
      const view = (name: "closed" | "spread" | "dive" | "end") => {
        if (name === "closed") {
          const look = new V(W / 2, 0.095, 0);
          const dir = new V(0.42, 0.3, 1).normalize();
          return { look, pos: look.clone().addScaledVector(dir, fit(0.12, 0.125) * 1.2) };
        }
        if (name === "dive") {
          const look = new V(RIGHT_PAGE.x, RIGHT_PAGE.y, RIGHT_PAGE.z);
          return { look, pos: look.clone().add(new V(0, 0, RIGHT_PAGE.height / 2 / tan / FILL)) };
        }
        const look = new V(0, 0.095, 0);
        const d = fit(0.2, 0.11) * (name === "end" ? 1.35 : 1.06);
        return { look, pos: new V(0, 0.095 + d * 0.05, d) };
      };
      const lookNow = new V();
      const place = (a: ReturnType<typeof view>, b: ReturnType<typeof view>, t: number) => {
        camera.position.lerpVectors(a.pos, b.pos, t);
        lookNow.lerpVectors(a.look, b.look, t);
        camera.lookAt(lookNow);
      };
      /** Hojas: en la entrada se ve la primera página; en la salida, la última */
      let leafState: "intro" | "exit" | null = null;
      const setLeaves = (state: "intro" | "exit") => {
        if (leafState === state) return;
        leafState = state;
        const pageOnRight = state === "intro" ? 0 : n - 1;
        leaves.forEach((leaf, i) => {
          leaf.t = i < pageOnRight ? 1 : 0;
          shapeLeaf(i);
          leaf.front.map = leaf.still;
          leaf.front.needsUpdate = true;
        });
      };
      /** La ilustración de la derecha se mueve con su bucle cuando lo hay */
      const liveLeaf = (k: number) => {
        const slot = slotOf(k);
        const leaf = leaves[k];
        if (!leaf || slot.page !== k || !pages[k].videoUrl || slot.video.readyState < 2) return;
        if (leaf.front.map !== slot.tex) {
          leaf.front.map = slot.tex;
          leaf.front.needsUpdate = true;
        }
      };

      const ro = new ResizeObserver(book3d.resize);
      ro.observe(el);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const setOpacity = (node: HTMLElement | null, o: number) => node && (node.style.opacity = String(o));

      let last = performance.now();
      let lastLabel = "";
      let frame = 0;
      const tick = () => {
        frame = requestAnimationFrame(tick);
        const now = performance.now();
        const dt = Math.min(64, now - last);
        // La reproducción va a ritmo de reloj aunque el dispositivo dé pocos fotogramas
        const autoDt = Math.min(250, now - last);
        last = now;

        // ── Movimiento programado ────────────────────────────────────
        if (tween) {
          const t = clamp01((now - tween.t0) / tween.ms);
          scrollToS(tween.from + (tween.to - tween.from) * ease(t));
          if (t >= 1) {
            tween = null;
            snap(true);
          }
        } else if (drive) {
          const here = locate(sScroll);
          if (hold !== null) {
            const read = visited === hold && now >= doneAt;
            // Con tope por si la voz no llega a terminar (red, bloqueo del navegador)
            if ((read && now - holdSince > 2500) || now - holdSince > 60000) hold = null;
          } else if (here.phase === "travel" && pages[here.k].transitionUrl && travelFor === here.k && travelReady()) {
            // Viaje con vídeo: se reproduce (más fluido que mover el scroll fotograma a fotograma)
            tv.playbackRate = drive.rate;
            if (tv.paused) {
              tv.currentTime = here.p * tv.duration;
              tv.play().catch(() => undefined);
            }
            const p = tv.ended ? 1 : clamp01(tv.currentTime / tv.duration);
            const s = at(here.k) + HOLD + p * TRAVEL;
            scrollToS(p >= 0.999 ? at(here.k + 1) : Math.max(sScroll, s));
          } else {
            let next = sScroll + (autoDt * drive.rate) / AUTO_MS_PER_UNIT;
            const stop = stops.find((x) => x > sScroll + 1e-4 && x <= next);
            if (stop !== undefined) {
              next = stop;
              if (drive.mode === "step" || stop >= S) {
                scrollToS(stop);
                stopDrive();
              } else {
                hold = stops.indexOf(stop) - 1;
                holdSince = now;
              }
            }
            if (drive) scrollToS(next);
          }
        }

        sView += (sScroll - sView) * (1 - Math.exp(-dt / (tween || drive ? 30 : 90)));
        const s = sView;
        const where = locate(s);

        // ── Escenas del interior ─────────────────────────────────────
        const k = where.k;
        load(k);
        load(where.phase === "travel" || (where.phase === "hold" && where.p > 0.4) ? k + 1 : k - 1);
        loadTravel(where.phase === "intro" || where.phase === "exit" ? -1 : where.phase === "hold" && where.p < 0.3 ? k - 1 : k);

        const worldOn = where.phase === "intro" ? smooth(1.2, 1.42, s) : where.phase === "exit" ? 1 - smooth(0, 0.14, where.p) : 1;
        setOpacity(world.current, worldOn);
        world.current!.style.pointerEvents = "none";
        const cur = slotOf(k).el;
        const nxt = slotOf(k + 1).el;
        let curO = 1;
        let nxtO = 0;
        let travelO = 0;
        let curZ = 1;
        let nxtZ = 1;
        let curBlur = 0;
        if (where.phase === "hold" || where.phase === "intro" || where.phase === "exit") {
          // Parada: la escena viva, con un acercamiento muy lento
          curZ = 1 + 0.04 * (where.phase === "hold" ? where.p : 0);
          playSlot(k, where.phase === "intro" ? s > 0.5 : true);
          const other = slotOf(k + 1);
          if (other.page !== k && !other.video.paused) other.video.pause();
        } else {
          const p = where.p;
          const hasVideo = Boolean(pages[k].transitionUrl) && travelFor === k && travelReady();
          if (hasVideo) {
            // Plano de cámara: sale de esta escena y llega a la siguiente
            travelO = smooth(0, 0.05, p) * (1 - smooth(0.95, 1, p));
            nxtO = smooth(0.93, 1, p);
            curO = 1 - smooth(0.04, 0.06, p);
            curZ = 1.04;
            // El plano empieza a la escala con la que acaba la parada y llega a la de la siguiente
            tv.style.setProperty("--z", String(1.04 - 0.04 * p));
            if (!drive) {
              const target = p * tv.duration;
              if (!tv.paused) tv.pause();
              if (!tv.seeking && Math.abs(tv.currentTime - target) > 0.04) tv.currentTime = target;
            }
            playSlot(k + 1, false, true);
          } else {
            // Sin vídeo: la cámara atraviesa la escena y aparece en la siguiente
            const e = ease(p);
            curZ = 1.04 + 0.6 * e;
            curBlur = 8 * smooth(0.3, 0.8, p);
            curO = 1 - smooth(0.4, 0.75, p);
            nxtO = smooth(0.35, 0.7, p);
            nxtZ = 1.3 - 0.3 * e;
            playSlot(k + 1, nxtO > 0, nxtO < 0.05);
          }
          playSlot(k, curO > 0);
        }
        setOpacity(cur, curO);
        cur.style.setProperty("--z", String(curZ));
        cur.style.setProperty("--blur", `${curBlur}px`);
        if (nxt !== cur) {
          setOpacity(nxt, k + 1 < n ? nxtO : 0);
          nxt.style.setProperty("--z", String(nxtZ));
          nxt.style.setProperty("--blur", "0px");
        }
        setOpacity(tv, travelO);

        // Texto de la página en la parada
        const capO = where.phase === "hold" ? smooth(0.08, 0.25, where.p) * (1 - smooth(0.82, 0.98, where.p)) : 0;
        if (captionText.current!.dataset.page !== String(k)) {
          captionText.current!.dataset.page = String(k);
          captionText.current!.textContent = pages[k].text;
        }
        setOpacity(caption.current, capO);
        if (where.phase === "hold" && capO > 0.85 && visited !== k) visit(k);
        else if (visited !== null && (where.phase !== "hold" || where.k !== visited || capO < 0.2)) leave();

        // ── El libro 3D (solo se dibuja cuando se ve) ────────────────
        if (worldOn < 1) {
          const opening = ease(smooth(0.1, 0.8, s));
          if (cover) cover.rotation.y = -Math.PI * opening;
          pivot.rotation.y = reduced ? 0 : Math.sin(now / 1700) * 0.1 * (1 - opening);
          if (where.phase === "intro") {
            setLeaves("intro");
            liveLeaf(0);
            if (s < 0.8) place(view("closed"), view("spread"), ease(s / 0.8));
            else place(view("spread"), view("dive"), ease(clamp01((s - 0.8) / 0.55)));
          } else {
            setLeaves("exit");
            liveLeaf(n - 1);
            const p = where.p;
            if (p < 0.5) place(view("dive"), view("spread"), ease(clamp01((p - 0.04) / 0.46)));
            else place(view("spread"), view("end"), ease((p - 0.5) / 0.5));
          }
          renderer.render(scene, camera);
        }

        // ── Portada y fin ───────────────────────────────────────────
        setOpacity(intro.current, 1 - smooth(0.04, 0.3, s));
        const end = where.phase === "exit" ? smooth(0.55, 0.85, where.p) : 0;
        setOpacity(ending.current, end);
        ending.current!.style.pointerEvents = end > 0.5 ? "auto" : "none";
        const endVideo = endingVideo.current;
        if (endVideo && end > 0.01 && endVideo.paused) endVideo.play().catch(() => undefined);
        else if (endVideo && end <= 0.01 && !endVideo.paused) endVideo.pause();

        const nextLabel = s < 0.5 ? "Portada" : where.phase === "exit" && where.p > 0.4 ? "Fin" : `${k + 1} / ${n}`;
        if (nextLabel !== lastLabel) setLabel((lastLabel = nextLabel));
      };
      tick();
      setReady(true);

      cleanup = () => {
        cancelAnimationFrame(frame);
        ro.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("wheel", takeOver);
        window.removeEventListener("touchstart", takeOver);
        window.removeEventListener("keydown", onKey);
        slotList.forEach((slot) => {
          slot.video.pause();
          slot.tex.dispose();
        });
        tv.pause();
        voice.pause();
        music?.pause();
        html.style.scrollSnapType = "";
        book3d.dispose();
        api.current = null;
      };
    };
    void start();

    return () => {
      disposed = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la línea de tiempo se deriva de `pages`
  }, [coverUrl, title, kidName, pages, musicUrl]);

  const round = "rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition-colors";

  if (!n || failed) {
    return (
      <main className='min-h-[100svh] bg-[#1b1420] text-white flex flex-col items-center justify-center gap-4 px-6 text-center'>
        <p className='text-lg'>Este dispositivo no puede mostrar el cuento en 3D.</p>
        {readUrl && (
          <Link href={readUrl} className='rounded-full bg-white text-[#1b1420] px-6 py-3 font-bold'>
            Leer y escuchar el cuento
          </Link>
        )}
      </main>
    );
  }

  return (
    <main className='relative bg-[#1b1420] text-white select-none' style={{ height: `calc(${S} * ${SEG_SVH}svh + 100svh)` }}>
      {/* Puntos donde se asienta el scroll: el inicio, cada parada y el final */}
      {stops.map((s) => (
        <div key={s} aria-hidden className='absolute inset-x-0 h-px' style={{ top: `calc(${s} * ${SEG_SVH}svh)`, scrollSnapAlign: "start" }} />
      ))}

      {/* El lienzo 3D se inserta al principio del escenario */}
      <div ref={stage} className='sticky top-0 h-[100svh] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,#4a3657_0%,#2a1f31_45%,#1b1420_80%)]'>
        {/* Dentro del cuento */}
        <div ref={world} className='absolute inset-0 opacity-0 bg-[#1b1420]'>
          <Scene
            slot={(node) => {
              slots.current[0] = node;
            }}
          />
          <Scene
            slot={(node) => {
              slots.current[1] = node;
            }}
          />
          <video
            ref={travel}
            muted
            playsInline
            crossOrigin='anonymous'
            preload='auto'
            className='absolute left-1/2 top-1/2 max-w-none opacity-0'
            style={{ height: `max(${FILL * 100}%, calc(100vw * 9 / 16))`, aspectRatio: "16 / 9", transform: "translate(-50%,-50%) scale(var(--z))" }}
          />
        </div>
        <div ref={caption} className='absolute inset-x-0 bottom-0 opacity-0 pointer-events-none bg-gradient-to-t from-black/75 via-black/35 to-transparent px-5 pt-24 pb-32'>
          <p
            ref={captionText}
            className='mx-auto max-w-2xl text-center text-lg sm:text-2xl leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,.7)]'
            style={{ fontFamily: "Andika, Nunito, sans-serif" }}
          />
        </div>

        {/* Portada: título y cómo seguir */}
        <div ref={intro} className='absolute inset-0 pointer-events-none flex flex-col items-center justify-between pt-16 pb-32 px-6 text-center'>
          <div>
            <h1 className='font-display text-3xl sm:text-5xl font-semibold leading-tight drop-shadow'>{title}</h1>
            <p className='mt-2 text-white/80 text-lg'>Un cuento para {kidName}</p>
          </div>
          {ready && (
            <p className='flex flex-col items-center gap-1 text-white/85 font-bold'>
              Desliza para entrar en el cuento
              <ChevronDown className='w-6 h-6 animate-bounce' />
            </p>
          )}
        </div>

        {/* Fin */}
        <div ref={ending} className='absolute inset-0 opacity-0 pointer-events-none flex flex-col items-center justify-center gap-3 px-6 text-center bg-[#1b1420]'>
          {coverVideoUrl ? (
            <video
              ref={endingVideo}
              src={coverVideoUrl}
              poster={coverUrl ?? undefined}
              muted
              loop
              playsInline
              preload='none'
              className='absolute inset-0 h-full w-full object-cover brightness-[.45]'
            />
          ) : coverUrl ? (
            <div className='absolute inset-0 scale-110 bg-cover bg-center blur-xl brightness-[.45]' style={{ backgroundImage: `url("${coverUrl}")` }} />
          ) : null}
          <p className='relative font-display text-6xl sm:text-7xl font-semibold drop-shadow'>Fin</p>
          <p className='relative text-white/85 text-lg'>«{title}»</p>
          <div className='relative mt-6 flex flex-col sm:flex-row gap-3 justify-center'>
            <button onClick={() => api.current?.goTo(0)} className='inline-flex items-center justify-center gap-2 rounded-full bg-white/15 backdrop-blur px-6 py-3 font-bold hover:bg-white/25'>
              <RotateCcw className='w-5 h-5' /> Volver a empezar
            </button>
            <Link href='/' className='inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#1b1420] px-6 py-3 font-bold hover:scale-105 transition-transform'>
              Crea un cuento para otro niño
            </Link>
          </div>
        </div>

        {!ready && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <p className='rounded-full bg-white/10 px-5 py-2.5 font-bold animate-pulse'>Abriendo el libro…</p>
          </div>
        )}

        {/* Barra superior */}
        <div className='absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-3 pb-6 bg-gradient-to-b from-black/45 to-transparent'>
          <Link href='/' className='font-display text-lg font-semibold text-white/90'>
            LibrosIA
          </Link>
          {readUrl && (
            <Link href={readUrl} className='inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-2 text-sm font-bold hover:bg-white/25'>
              <BookOpen className='w-4 h-4' /> Modo lectura
            </Link>
          )}
        </div>

        {/* Controles */}
        {ready && (
          <div className='absolute bottom-0 inset-x-0 pb-5 flex flex-col items-center gap-2'>
            <span className='rounded-full bg-black/30 px-3 py-1 text-xs font-bold tracking-wide'>{label}</span>
            <div className='flex items-center gap-3'>
              <button aria-label='Anterior' onClick={() => api.current?.prev()} className={`${round} w-12 h-12`}>
                <ChevronLeft className='w-6 h-6' />
              </button>
              <button
                aria-label={playing ? "Pausa" : "Reproducir el cuento"}
                onClick={() => api.current?.togglePlay()}
                className='w-16 h-16 rounded-full bg-white text-[#1b1420] flex items-center justify-center shadow-xl hover:scale-105 transition-transform'>
                {playing ? <Pause className='w-7 h-7 fill-current' /> : <Play className='w-7 h-7 fill-current ml-1' />}
              </button>
              <button aria-label='Siguiente' onClick={() => api.current?.next()} className={`${round} w-12 h-12`}>
                <ChevronRight className='w-6 h-6' />
              </button>
              <button aria-label={soundOn ? "Quitar el sonido" : "Poner el sonido"} onClick={() => api.current?.toggleSound()} className={`${round} w-12 h-12`}>
                {soundOn ? <Volume2 className='w-5 h-5' /> : <VolumeX className='w-5 h-5' />}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
