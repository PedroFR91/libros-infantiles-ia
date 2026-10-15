"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { createBookScene, RIGHT_PAGE, W, type BookScene } from "./book3d/bookScene";

// Cuento inmersivo: el libro 3D a pantalla completa y el scroll (o los botones)
// mueven la cámara por él. En cada página la cámara se zambulle en la
// ilustración hasta llenar la pantalla y ahí cobra vida: el vídeo animado se
// abre en panorámica, aparece el texto y suena la narración. Al seguir, la
// cámara sale, se pasa la hoja y se entra en la siguiente.
//
// Línea de tiempo (s): 0–1 se abre la portada; página k en [1+k, 2+k):
//   0–0,3 entrar · 0,3–0,6 dentro (vídeo, texto, voz) · 0,6–0,8 salir · 0,8–1 pasar la hoja;
// al final, "Fin".

export interface DivePage {
  imageUrl: string | null;
  text: string;
  audioUrl?: string | null;
  videoUrl?: string | null;
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

/** Alto de scroll de cada tramo, en alturas de pantalla */
const SEG_SVH = 130;
const DIVE_END = 0.3;
const HOLD_END = 0.6;
const OUT_END = 0.8;
/** Punto de cada página donde se para (botones, reproducción y ajuste del scroll) */
const STOP = 0.45;
/** La ilustración llena la pantalla con un poco de margen para no ver el borde */
const FILL = 1.03;
const AUTO_MS_PER_UNIT = 4200;
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

export default function BookDive({ title, kidName, coverUrl, coverVideoUrl, pages, musicUrl, readUrl }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const overlayBg = useRef<HTMLDivElement>(null);
  const overlayImg = useRef<HTMLImageElement>(null);
  const overlayVideo = useRef<HTMLVideoElement>(null);
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
  const S = n + 1.6;

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

      // ── Vídeo de la página activa: en la hoja (recortado al cuadrado) y en panorámica
      const video = overlayVideo.current!;
      const videoTex = new THREE.VideoTexture(video);
      videoTex.colorSpace = THREE.SRGBColorSpace;
      videoTex.repeat.x = 9 / 16; // el centro del vídeo 16:9 es la ilustración original
      videoTex.offset.x = (1 - 9 / 16) / 2;
      let active = -1;
      const onVideoReady = () => {
        if (active < 0 || !pages[active]?.videoUrl) return;
        leaves[active].front.map = videoTex;
        leaves[active].front.needsUpdate = true;
        video.style.opacity = "1";
      };
      video.addEventListener("loadeddata", onVideoReady);
      const setActive = (k: number) => {
        if (k === active) return;
        const old = leaves[active];
        if (old?.still) {
          old.front.map = old.still;
          old.front.needsUpdate = true;
        }
        active = k;
        const page = pages[k];
        video.style.opacity = "0";
        if (page?.videoUrl) {
          video.src = page.videoUrl;
          video.play().catch(() => undefined);
        } else {
          video.removeAttribute("src");
          video.load();
        }
        if (page?.imageUrl) {
          overlayImg.current!.src = page.imageUrl;
          overlayBg.current!.style.backgroundImage = `url("${page.imageUrl}")`;
        }
        captionText.current!.textContent = page?.text ?? "";
      };

      // ── Sonido: narración de la página en la que se está dentro + música
      const voice = new Audio();
      const music = musicUrl ? new Audio(musicUrl) : null;
      if (music) {
        music.loop = true;
        music.volume = MUSIC_VOLUME;
      }
      let sound = false;
      let visited: number | null = null;
      let doneAt = 0;
      voice.onended = () => (doneAt = performance.now() + 900);
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
      let auto = false;
      const segPx = () => (document.documentElement.scrollHeight - el.clientHeight) / S;
      let sScroll = Math.min(S, window.scrollY / segPx());
      let sView = sScroll;
      const scrollToS = (s: number) => {
        sScroll = Math.max(0, Math.min(S, s));
        window.scrollTo({ top: sScroll * segPx(), behavior: "instant" });
      };
      const onScroll = () => {
        if (!tween && !auto) sScroll = Math.max(0, Math.min(S, window.scrollY / segPx()));
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      const stops = [0, ...pages.map((_, k) => 1 + k + STOP), S];
      let hold: number | null = null;
      let holdSince = 0;
      const snap = (on: boolean) => (html.style.scrollSnapType = on ? "y proximity" : "none");
      const goTo = (s: number) => {
        const dist = Math.abs(s - sScroll);
        tween = { from: sScroll, to: s, t0: performance.now(), ms: Math.min(2600, 700 + 1100 * dist) };
        snap(false);
      };
      const setAuto = (on: boolean) => {
        auto = on;
        hold = null;
        setPlaying(on);
        if (on) {
          tween = null;
          snap(false);
          if (!sound) setSound(true);
          if (sScroll >= S - 0.01) scrollToS(0);
        } else if (!tween) snap(true);
      };
      api.current = {
        next: () => goTo(stops.find((x) => x > sScroll + 0.02) ?? S),
        prev: () => goTo([...stops].reverse().find((x) => x < sScroll - 0.02) ?? 0),
        goTo,
        togglePlay: () => setAuto(!auto),
        toggleSound: () => setSound(!sound),
      };
      // Si el usuario mueve el scroll a mano, manda él
      const takeOver = () => {
        if (auto) setAuto(false);
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
          return;
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "PageDown" || e.key === "PageUp") takeOver();
      };
      window.addEventListener("keydown", onKey);

      // ── Cámara
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

      const ro = new ResizeObserver(book3d.resize);
      ro.observe(el);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

        // Movimiento programado: botones o reproducción automática
        if (tween) {
          const t = clamp01((now - tween.t0) / tween.ms);
          scrollToS(tween.from + (tween.to - tween.from) * ease(t));
          if (t >= 1) {
            tween = null;
            if (!auto) snap(true);
          }
        } else if (auto) {
          if (hold !== null) {
            const read = visited === hold && now >= doneAt;
            // Con tope por si la voz no llega a terminar (red, bloqueo del navegador)
            if ((read && now - holdSince > 3000) || now - holdSince > 60000) hold = null;
          } else {
            let next = sScroll + autoDt / AUTO_MS_PER_UNIT;
            const stop = stops.find((x) => x > sScroll + 1e-4 && x <= next && x < S);
            if (stop !== undefined) {
              next = stop;
              hold = stops.indexOf(stop) - 1;
              holdSince = now;
            }
            if (next >= S) {
              next = S;
              setAuto(false);
            }
            scrollToS(next);
          }
        }

        sView += (sScroll - sView) * (1 - Math.exp(-dt / (tween || auto ? 40 : 110)));
        const s = sView;

        // Portada
        const opening = ease(smooth(0.12, 1, s));
        if (cover) cover.rotation.y = -Math.PI * opening;
        pivot.rotation.y = reduced ? 0 : Math.sin(now / 1700) * 0.1 * (1 - opening);

        // Hojas
        leaves.forEach((leaf, i) => {
          const t = clamp01((s - (1 + i + OUT_END)) / (1 - OUT_END));
          if (Math.abs(t - leaf.t) < 1e-4) return;
          leaf.t = t;
          shapeLeaf(i);
        });

        // Cámara, página activa e inmersión
        let k = -1;
        let u = 0;
        if (s < 1) place(view("closed"), view("spread"), opening);
        else if (s < n + 1) {
          k = Math.min(n - 1, Math.floor(s - 1));
          u = s - 1 - k;
          if (u < DIVE_END) place(view("spread"), view("dive"), ease(u / DIVE_END));
          else if (u < HOLD_END) place(view("dive"), view("dive"), 0);
          else if (u < OUT_END) place(view("dive"), view("spread"), ease((u - HOLD_END) / (OUT_END - HOLD_END)));
          else place(view("spread"), view("spread"), 0);
        } else place(view("spread"), view("end"), ease(clamp01((s - n - 1) / 0.5)));
        setActive(k);

        const inside = k >= 0 ? smooth(0.24, 0.32, u) * (1 - smooth(0.58, 0.66, u)) : 0;
        overlay.current!.style.opacity = String(inside);
        overlay.current!.style.setProperty("--z", String(1 + 0.06 * clamp01((u - DIVE_END) / (HOLD_END - DIVE_END))));
        caption.current!.style.opacity = String(k >= 0 ? smooth(0.32, 0.4, u) * (1 - smooth(0.52, 0.6, u)) : 0);
        intro.current!.style.opacity = String(1 - smooth(0.04, 0.3, s));
        const end = smooth(n + 1.15, n + 1.5, s);
        ending.current!.style.opacity = String(end);
        ending.current!.style.pointerEvents = end > 0.5 ? "auto" : "none";
        const endVideo = endingVideo.current;
        if (endVideo && end > 0.01 && endVideo.paused) endVideo.play().catch(() => undefined);
        else if (endVideo && end <= 0.01 && !endVideo.paused) endVideo.pause();

        // Voz: al estar dentro de la página
        if (k >= 0 && inside > 0.85 && visited !== k) visit(k);
        else if (visited !== null && (k !== visited || inside < 0.2)) leave();

        const nextLabel = s < 0.5 ? "Portada" : s < n + 1 ? `${Math.max(0, k) + 1} / ${n}` : "Fin";
        if (nextLabel !== lastLabel) setLabel((lastLabel = nextLabel));

        renderer.render(scene, camera);
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
        video.removeEventListener("loadeddata", onVideoReady);
        video.pause();
        voice.pause();
        music?.pause();
        videoTex.dispose();
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
  }, [coverUrl, title, kidName, pages, musicUrl, n, S]);

  const round = "rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition-colors";

  if (!n || failed) {
    return (
      <main className='min-h-[100svh] bg-[#1b1420] text-white flex flex-col items-center justify-center gap-4 px-6 text-center'>
        <p className='text-lg'>Este dispositivo no puede mostrar el libro en 3D.</p>
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
      {/* Puntos donde se asienta el scroll: el inicio, dentro de cada página y el final */}
      {[0, ...pages.map((_, k) => 1 + k + STOP), S].map((s) => (
        <div key={s} aria-hidden className='absolute inset-x-0 h-px' style={{ top: `calc(${s} * ${SEG_SVH}svh)`, scrollSnapAlign: "start" }} />
      ))}

      {/* El lienzo 3D se inserta al principio del escenario */}
      <div ref={stage} className='sticky top-0 h-[100svh] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,#4a3657_0%,#2a1f31_45%,#1b1420_80%)]'>

        {/* Dentro de la ilustración */}
        <div ref={overlay} className='absolute inset-0 opacity-0 pointer-events-none overflow-hidden' style={{ "--z": 1 } as React.CSSProperties}>
          <div ref={overlayBg} className='absolute inset-0 scale-110 bg-cover bg-center blur-2xl brightness-75' />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={overlayImg}
            alt=''
            className='absolute left-1/2 top-1/2 aspect-square max-w-none object-cover'
            style={{ height: `${FILL * 100}%`, transform: "translate(-50%,-50%) scale(var(--z))" }}
          />
          <video
            ref={overlayVideo}
            muted
            loop
            playsInline
            crossOrigin='anonymous'
            preload='auto'
            className='absolute left-1/2 top-1/2 max-w-none opacity-0 transition-opacity duration-500'
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
