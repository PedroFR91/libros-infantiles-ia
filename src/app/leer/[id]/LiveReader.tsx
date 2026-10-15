"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Music, Pause, Play, RotateCcw, Share2, VolumeX } from "lucide-react";

// Lector del cuento narrado: una diapositiva por página (portada, dedicatoria,
// páginas y "fin"), la voz lee cada página y pasa sola a la siguiente, con una
// música suave de fondo. Pensado para el móvil y para compartir con la familia.

export interface ReaderPage {
  pageNumber: number;
  imageUrl: string | null;
  text: string;
  audioUrl: string | null;
  /** Cuento animado: la ilustración en movimiento (bucle sin sonido) */
  videoUrl?: string | null;
}

interface Props {
  title: string;
  kidName: string;
  dedication: string | null;
  pages: ReaderPage[];
  musicUrl: string;
  shareUrl: string;
  /** La narración aún se está generando (alguna página sin voz) */
  narrating: boolean;
}

type Slide =
  | { kind: "cover"; page: ReaderPage }
  | { kind: "dedication"; text: string; image: string | null }
  | { kind: "page"; page: ReaderPage }
  | { kind: "end"; image: string | null };

const MUSIC_VOLUME = 0.14;
/** Sin voz en una página: tiempo de lectura aproximado antes de pasar */
const readingMs = (text: string) => Math.min(14000, Math.max(4000, text.split(/\s+/).length * 380));

export default function LiveReader({ title, kidName, dedication, pages, musicUrl, shareUrl, narrating }: Props) {
  // Estable entre renders: la reproducción depende de la diapositiva actual
  const slides = useMemo<Slide[]>(() => {
    const [cover, ...story] = pages;
    return [
      { kind: "cover", page: cover },
      ...(dedication?.trim() ? [{ kind: "dedication" as const, text: dedication.trim(), image: cover?.imageUrl ?? null }] : []),
      ...story.map((page) => ({ kind: "page" as const, page })),
      { kind: "end", image: cover?.imageUrl ?? null },
    ];
  }, [pages, dedication]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const voice = useRef<HTMLAudioElement | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX = useRef<number | null>(null);

  const slide = slides[index];
  const last = slides.length - 1;

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const go = useCallback(
    (next: number) => {
      clearTimer();
      voice.current?.pause();
      setIndex(Math.max(0, Math.min(last, next)));
    },
    [last],
  );

  // Reproduce la diapositiva actual y encadena la siguiente al terminar
  useEffect(() => {
    if (!playing) return;
    const advance = (delay: number) => {
      timer.current = setTimeout(() => {
        if (index < last) setIndex(index + 1);
        else setPlaying(false);
      }, delay);
    };
    const audioUrl = slide.kind === "cover" || slide.kind === "page" ? slide.page.audioUrl : null;
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      voice.current = audio;
      audio.onended = () => advance(1400);
      audio.play().catch(() => advance(readingMs(slide.kind === "page" ? slide.page.text : title)));
    } else if (slide.kind === "end") {
      // Final: la música se apaga despacio
      timer.current = setTimeout(() => setPlaying(false), 2500);
    } else {
      const text = slide.kind === "page" ? slide.page.text : slide.kind === "dedication" ? slide.text : title;
      advance(readingMs(text));
    }
    return () => {
      clearTimer();
      voice.current?.pause();
    };
  }, [playing, index, last, slide, title]);

  // Música de fondo
  useEffect(() => {
    if (!music.current) {
      music.current = new Audio(musicUrl);
      music.current.loop = true;
      music.current.volume = MUSIC_VOLUME;
    }
    if (playing && musicOn) music.current.play().catch(() => undefined);
    else music.current.pause();
  }, [playing, musicOn, musicUrl]);

  useEffect(() => () => music.current?.pause(), []);

  // Teclado: flechas y espacio
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [go, index]);

  // Precarga de la siguiente ilustración y su voz
  useEffect(() => {
    const next = slides[index + 1];
    if (next && (next.kind === "page" || next.kind === "cover")) {
      if (next.page.imageUrl) new Image().src = next.page.imageUrl;
      if (next.page.audioUrl) new Audio(next.page.audioUrl).preload = "auto";
    }
  }, [index, slides]);

  const share = async () => {
    const data = { title, text: `Escucha «${title}», el cuento de ${kidName}`, url: shareUrl };
    if (navigator.share) {
      await navigator.share(data).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const image =
    slide.kind === "cover" || slide.kind === "page" ? slide.page.imageUrl : slide.image;
  const video = slide.kind === "cover" || slide.kind === "page" ? slide.page.videoUrl : null;
  // Ilustración (o su vídeo animado: el centro del vídeo panorámico es la original)
  const art = (cls: string) =>
    video ? (
      <video
        key={video}
        src={video}
        poster={image ?? undefined}
        autoPlay
        muted
        loop
        playsInline
        className={`${cls} object-cover`}
      />
    ) : image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt='' className={`${cls} object-cover`} />
    ) : null;

  return (
    <main
      className='fixed inset-0 overflow-hidden bg-[#1b1420] text-white select-none'
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}>
      {/* Fondo: la ilustración desenfocada */}
      {image && (
        <div
          key={`bg-${index}`}
          aria-hidden
          className='absolute inset-0 scale-110 bg-cover bg-center blur-2xl opacity-60 animate-[fadein_.9s_ease]'
          style={{ backgroundImage: `url(${image})` }}
        />
      )}
      <div aria-hidden className='absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70' />

      <div className='relative h-full flex flex-col items-center justify-center gap-4 px-4 pt-14 pb-28'>
        {slide.kind === "cover" && (
          <div key={index} className='flex flex-col items-center text-center animate-[pagein_.8s_ease]'>
            {art("w-[min(78vw,52vh)] aspect-square rounded-2xl shadow-2xl ring-1 ring-white/20")}
            <h1 className='mt-6 font-display text-3xl sm:text-5xl font-semibold leading-tight max-w-2xl drop-shadow'>{title}</h1>
            <p className='mt-2 text-white/80 text-lg'>Un cuento para {kidName}</p>
            {!playing && (
              <button
                onClick={() => setPlaying(true)}
                className='mt-6 inline-flex items-center gap-2 rounded-full bg-white text-[#1b1420] px-7 py-4 text-lg font-bold shadow-xl hover:scale-105 transition-transform'>
                <Play className='w-6 h-6 fill-current' /> Empezar el cuento
              </button>
            )}
            {narrating && (
              <p className='mt-3 text-sm text-white/70'>Estamos terminando de grabar la narración: algunas páginas aún se leen sin voz.</p>
            )}
          </div>
        )}

        {slide.kind === "dedication" && (
          <div key={index} className='max-w-xl text-center animate-[pagein_.8s_ease]'>
            <p className='font-display text-2xl sm:text-4xl leading-snug italic drop-shadow'>«{slide.text}»</p>
          </div>
        )}

        {slide.kind === "page" && (
          <div key={index} className='w-full max-w-5xl flex flex-col md:flex-row items-center gap-5 md:gap-10 animate-[pagein_.8s_ease]'>
            {art("w-[min(86vw,48vh)] md:w-[min(46vw,70vh)] aspect-square rounded-2xl shadow-2xl ring-1 ring-white/20")}
            <p className='max-w-xl text-lg sm:text-2xl leading-relaxed text-center md:text-left drop-shadow-[0_2px_8px_rgba(0,0,0,.6)]'>
              {slide.page.text}
            </p>
          </div>
        )}

        {slide.kind === "end" && (
          <div key={index} className='text-center max-w-lg animate-[pagein_.8s_ease]'>
            <p className='font-display text-5xl sm:text-7xl font-semibold drop-shadow'>Fin</p>
            <p className='mt-3 text-white/80 text-lg'>«{title}»</p>
            <div className='mt-8 flex flex-col sm:flex-row gap-3 justify-center'>
              <button
                onClick={() => {
                  go(0);
                  setPlaying(true);
                }}
                className='inline-flex items-center justify-center gap-2 rounded-full bg-white/15 backdrop-blur px-6 py-3 font-bold hover:bg-white/25'>
                <RotateCcw className='w-5 h-5' /> Volver a escucharlo
              </button>
              <Link href='/' className='inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#1b1420] px-6 py-3 font-bold hover:scale-105 transition-transform'>
                Crea un cuento para otro niño
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Barra superior: marca y compartir */}
      <div className='absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3'>
        <Link href='/' className='font-display text-lg font-semibold text-white/90'>
          LibrosIA
        </Link>
        <button onClick={share} className='inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-2 text-sm font-bold hover:bg-white/25'>
          <Share2 className='w-4 h-4' /> {copied ? "Enlace copiado" : "Compartir"}
        </button>
      </div>

      {/* Controles */}
      <div className='absolute bottom-0 inset-x-0 pb-5 pt-3 flex flex-col items-center gap-3'>
        <div className='flex gap-1.5' aria-hidden>
          {slides.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
          ))}
        </div>
        <div className='flex items-center gap-3'>
          <button aria-label='Página anterior' onClick={() => go(index - 1)} disabled={index === 0} className='w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center disabled:opacity-30'>
            <ChevronLeft className='w-6 h-6' />
          </button>
          <button
            aria-label={playing ? "Pausa" : "Reproducir"}
            onClick={() => setPlaying((p) => !p)}
            className='w-16 h-16 rounded-full bg-white text-[#1b1420] flex items-center justify-center shadow-xl hover:scale-105 transition-transform'>
            {playing ? <Pause className='w-7 h-7 fill-current' /> : <Play className='w-7 h-7 fill-current ml-1' />}
          </button>
          <button aria-label='Página siguiente' onClick={() => go(index + 1)} disabled={index === last} className='w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center disabled:opacity-30'>
            <ChevronRight className='w-6 h-6' />
          </button>
          <button
            aria-label={musicOn ? "Quitar la música" : "Poner la música"}
            onClick={() => setMusicOn((m) => !m)}
            className='w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center'>
            {musicOn ? <Music className='w-5 h-5' /> : <VolumeX className='w-5 h-5' />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadein { from { opacity: 0 } to { opacity: .6 } }
        @keyframes pagein { from { opacity: 0; transform: perspective(1200px) rotateY(-12deg) translateX(24px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important } }
      `}</style>
    </main>
  );
}
