"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ChevronDown,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AGE_OPTIONS, BOOK_STYLES, BookStyle } from "./types";

// Asistente de creación (REVISION-PRODUCTO-2026-10.md §3): una pregunta por
// pantalla, lo opcional plegado y nada de registro.

const LIKES = [
  { id: "dinosaurios", label: "Dinosaurios", emoji: "🦕" },
  { id: "el espacio", label: "El espacio", emoji: "🚀" },
  { id: "princesas y castillos", label: "Princesas", emoji: "👑" },
  { id: "piratas", label: "Piratas", emoji: "🏴‍☠️" },
  { id: "superhéroes", label: "Superhéroes", emoji: "🦸" },
  { id: "los animales", label: "Animales", emoji: "🦁" },
  { id: "el fútbol", label: "Fútbol", emoji: "⚽" },
  { id: "sirenas y el mar", label: "Sirenas y mar", emoji: "🧜" },
  { id: "la magia", label: "Magia", emoji: "✨" },
  { id: "los coches", label: "Coches", emoji: "🚗" },
  { id: "los dragones", label: "Dragones", emoji: "🐉" },
  { id: "la naturaleza", label: "Bosque", emoji: "🌳" },
];

const STYLE_CHOICES: BookStyle[] = ["watercolor", "cartoon", "classic", "minimalist"];

export interface WizardData {
  kidName: string;
  theme: string;
  ageRange: string;
  gender: "nino" | "nina" | null;
  companion: string;
  dedication: string;
  style: BookStyle;
  photo: File | null;
  characterDescription: string | null;
}

interface WizardProps {
  initialName?: string;
  initialTheme?: string;
  onSubmit: (data: WizardData) => void;
  onAnalyzePhoto: (file: File) => Promise<string | null>;
}

export default function Wizard({
  initialName = "",
  initialTheme = "",
  onSubmit,
  onAnalyzePhoto,
}: WizardProps) {
  const [step, setStep] = useState(initialName ? 1 : 0);
  const [kidName, setKidName] = useState(initialName);
  const [likes, setLikes] = useState<string[]>([]);
  const [story, setStory] = useState(initialTheme);
  const [ageRange, setAgeRange] = useState("5-6");
  const [gender, setGender] = useState<"nino" | "nina" | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [companion, setCompanion] = useState("");
  const [dedication, setDedication] = useState("");
  const [style, setStyle] = useState<BookStyle>("watercolor");
  const fileRef = useRef<HTMLInputElement>(null);

  const name = kidName.trim();
  const canContinueLikes = likes.length > 0 || story.trim().length > 2;

  const toggleLike = (id: string) =>
    setLikes((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : prev.length < 3 ? [...prev, id] : prev,
    );

  const buildTheme = () => {
    const custom = story.trim();
    if (custom) return likes.length ? `${custom} (le encantan ${likes.join(", ")})` : custom;
    return `Una aventura con ${likes.join(", ")}`;
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setPhotoError("Usa una foto JPG, PNG o WebP de menos de 10 MB.");
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAnalyzing(true);
    const result = await onAnalyzePhoto(file);
    setAnalyzing(false);
    if (result) setDescription(result);
    else {
      setPhotoError("No pudimos leer bien la foto. Prueba con otra donde se le vea la cara de frente.");
      setPhoto(null);
      setPhotoPreview(null);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setDescription(null);
    setPhotoError(null);
  };

  const submit = () =>
    onSubmit({
      kidName: name,
      theme: buildTheme(),
      ageRange,
      gender,
      companion: companion.trim(),
      dedication: dedication.trim(),
      style,
      photo,
      characterDescription: description,
    });

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className='max-w-xl mx-auto px-4 py-6 sm:py-10'>
        {/* Progreso */}
        <div className='flex items-center gap-2 mb-6' aria-label={`Paso ${step + 1} de 3`}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        {step === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name) setStep(1);
            }}>
            <h1 className='font-display text-3xl sm:text-4xl font-semibold mb-2'>¿Cómo se llama?</h1>
            <p className='text-text-muted mb-6'>Será el protagonista de su propio cuento.</p>
            <label htmlFor='kid-name' className='sr-only'>
              Nombre del niño o la niña
            </label>
            <input
              id='kid-name'
              autoFocus
              value={kidName}
              onChange={(e) => setKidName(e.target.value)}
              maxLength={40}
              placeholder='Su nombre'
              autoComplete='off'
              className='w-full px-5 py-4 text-xl rounded-2xl bg-bg-light border-2 border-border-strong focus:border-primary outline-none'
            />
            <button
              type='submit'
              disabled={!name}
              className='mt-5 w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-lg font-bold flex items-center justify-center gap-2'>
              Continuar <ArrowRight className='w-5 h-5' />
            </button>
            <p className='mt-4 text-sm text-text-muted text-center'>
              Gratis · sin registro · en unos 2 minutos lees su historia
            </p>
          </form>
        )}

        {step === 1 && (
          <div>
            <BackButton onClick={() => setStep(0)} />
            <h1 className='font-display text-3xl sm:text-4xl font-semibold mb-2'>
              ¿Qué le encanta a {name}?
            </h1>
            <p className='text-text-muted mb-5'>Elige hasta 3 cosas o cuéntanos tú la aventura.</p>

            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5'>
              {LIKES.map((like) => {
                const active = likes.includes(like.id);
                return (
                  <button
                    key={like.id}
                    type='button'
                    aria-pressed={active}
                    onClick={() => toggleLike(like.id)}
                    className={`min-h-[52px] px-3 py-3 rounded-2xl border-2 text-left font-semibold flex items-center gap-2 transition-colors ${
                      active
                        ? "bg-primary-soft border-primary text-text"
                        : "bg-bg-light border-border hover:border-border-strong"
                    }`}>
                    <span aria-hidden className='text-xl'>
                      {like.emoji}
                    </span>
                    {like.label}
                  </button>
                );
              })}
            </div>

            <label htmlFor='story' className='block font-semibold mb-2'>
              ¿Alguna idea concreta? <span className='font-normal text-text-muted'>(opcional)</span>
            </label>
            <textarea
              id='story'
              value={story}
              onChange={(e) => setStory(e.target.value)}
              maxLength={180}
              rows={2}
              placeholder={`Ej: ${name} encuentra un dragón que no sabe volar`}
              className='w-full px-4 py-3 rounded-2xl bg-bg-light border-2 border-border focus:border-primary outline-none resize-none mb-5'
            />

            <fieldset className='mb-4'>
              <legend className='font-semibold mb-2'>¿Cuántos años tiene?</legend>
              <div className='grid grid-cols-3 gap-2'>
                {AGE_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option.id}
                    active={ageRange === option.id}
                    onClick={() => setAgeRange(option.id)}>
                    {option.label}
                  </ChoiceButton>
                ))}
              </div>
            </fieldset>

            <fieldset className='mb-6'>
              <legend className='font-semibold mb-2'>
                Es… <span className='font-normal text-text-muted'>(para escribir bien el cuento)</span>
              </legend>
              <div className='grid grid-cols-2 gap-2'>
                <ChoiceButton active={gender === "nina"} onClick={() => setGender(gender === "nina" ? null : "nina")}>
                  Una niña
                </ChoiceButton>
                <ChoiceButton active={gender === "nino"} onClick={() => setGender(gender === "nino" ? null : "nino")}>
                  Un niño
                </ChoiceButton>
              </div>
            </fieldset>

            <button
              type='button'
              disabled={!canContinueLikes}
              onClick={() => setStep(2)}
              className='w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-lg font-bold flex items-center justify-center gap-2'>
              Continuar <ArrowRight className='w-5 h-5' />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <BackButton onClick={() => setStep(1)} />
            <h1 className='font-display text-3xl sm:text-4xl font-semibold mb-2'>
              ¿Quieres que se parezca a {name}?
            </h1>
            <p className='text-text-muted mb-5'>
              Con una foto dibujamos un personaje inspirado en su pelo, sus ojos y
              su piel. Es opcional.
            </p>

            {photoPreview ? (
              <div className='flex items-center gap-4 p-3 rounded-2xl bg-bg-light border border-border mb-3'>
                <img src={photoPreview} alt='Foto elegida' className='w-20 h-20 rounded-xl object-cover' />
                <div className='flex-1 text-sm'>
                  {analyzing ? (
                    <span className='flex items-center gap-2 text-text-muted'>
                      <Loader2 className='w-4 h-4 animate-spin' /> Mirando la foto…
                    </span>
                  ) : (
                    <span className='text-success font-semibold'>¡Foto lista!</span>
                  )}
                </div>
                <button
                  type='button'
                  onClick={removePhoto}
                  aria-label='Quitar la foto'
                  className='p-3 rounded-xl hover:bg-bg'>
                  <Trash2 className='w-5 h-5' />
                </button>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => fileRef.current?.click()}
                className='w-full min-h-[96px] rounded-2xl border-2 border-dashed border-border-strong bg-bg-light hover:border-primary flex flex-col items-center justify-center gap-1 mb-3'>
                <Camera className='w-7 h-7 text-primary' />
                <span className='font-semibold'>Subir una foto</span>
                <span className='text-sm text-text-muted'>De frente y con buena luz</span>
              </button>
            )}
            <input
              ref={fileRef}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              className='hidden'
              onChange={(e) => handlePhoto(e.target.files?.[0])}
            />
            {photoError && <p className='text-sm text-primary mb-3'>{photoError}</p>}
            <p className='text-sm text-text-muted mb-6'>
              🔒 La foto no se guarda: se usa al momento para dibujar el personaje.
              Solo puede subirla su madre, padre o tutor.{" "}
              <Link href='/privacidad' className='underline'>
                Más info
              </Link>
            </p>

            {/* Opciones avanzadas */}
            <button
              type='button'
              onClick={() => setShowMore(!showMore)}
              aria-expanded={showMore}
              className='w-full flex items-center justify-between py-3 font-semibold'>
              Más opciones (compañero, dedicatoria, estilo)
              <ChevronDown className={`w-5 h-5 transition-transform ${showMore ? "rotate-180" : ""}`} />
            </button>
            {showMore && (
              <div className='space-y-4 pb-4'>
                <div>
                  <label htmlFor='companion' className='block font-semibold mb-1.5'>
                    ¿Le acompaña alguien?
                  </label>
                  <input
                    id='companion'
                    value={companion}
                    onChange={(e) => setCompanion(e.target.value)}
                    maxLength={120}
                    placeholder='Ej: su perro Toby, un labrador marrón'
                    className='w-full px-4 py-3 rounded-xl bg-bg-light border-2 border-border focus:border-primary outline-none'
                  />
                </div>
                <div>
                  <label htmlFor='dedication' className='block font-semibold mb-1.5'>
                    Dedicatoria
                  </label>
                  <textarea
                    id='dedication'
                    value={dedication}
                    onChange={(e) => setDedication(e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder={`Ej: Para ${name}, con todo el cariño de los abuelos`}
                    className='w-full px-4 py-3 rounded-xl bg-bg-light border-2 border-border focus:border-primary outline-none resize-none'
                  />
                </div>
                <fieldset>
                  <legend className='font-semibold mb-1.5'>Estilo de las ilustraciones</legend>
                  <div className='grid grid-cols-2 gap-2'>
                    {STYLE_CHOICES.map((id) => {
                      const option = BOOK_STYLES.find((s) => s.id === id);
                      return (
                        <ChoiceButton key={id} active={style === id} onClick={() => setStyle(id)}>
                          {option?.label ?? id}
                        </ChoiceButton>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            )}

            <button
              type='button'
              disabled={analyzing}
              onClick={submit}
              className='mt-2 w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-lg font-bold flex items-center justify-center gap-2 animate-pulse-glow'>
              <Sparkles className='w-5 h-5' />
              Crear el cuento de {name}
            </button>
            <p className='mt-3 text-sm text-text-muted text-center'>
              Gratis: lees la historia y ves su portada antes de pagar nada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='mb-3 -ml-2 px-2 py-2 inline-flex items-center gap-1 text-text-muted hover:text-text'>
      <ArrowLeft className='w-4 h-4' /> Atrás
    </button>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[48px] px-3 py-2.5 rounded-xl border-2 font-semibold transition-colors ${
        active ? "bg-primary text-white border-primary" : "bg-bg-light border-border hover:border-border-strong"
      }`}>
      {children}
    </button>
  );
}
