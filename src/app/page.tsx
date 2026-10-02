"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { CREDIT_PACKS, PRINT_PRODUCT, formatEuros } from "@/lib/pricing";
import { SEO_INDEX, editorUrlForTheme } from "@/lib/seo-pages";
import {
  Book,
  Sparkles,
  Download,
  CreditCard,
  Wand2,
  Gift,
  Truck,
  ShieldCheck,
  CameraOff,
  Printer,
  Repeat,
  Eye,
  ChevronRight,
  CalendarHeart,
  Tag,
  Check,
} from "lucide-react";
import { motion, MotionConfig } from "framer-motion";

// ─── Editable por temporada ──────────────────────────────────────────────
// Fecha límite recomendada para pedir el libro IMPRESO y recibirlo antes de
// Navidad (producción + envío 5-9 días + margen de mensajería en diciembre).
// Cámbiala cada año o ponla a null para ocultar el aviso.
const CHRISTMAS_PRINT_DEADLINE: string | null = "10 de diciembre";

// Código promocional de lanzamiento (se introduce en la página de pago de Stripe).
const LAUNCH_PROMO = { code: "LANZAMIENTO", discount: "50 %" };
// ─────────────────────────────────────────────────────────────────────────

const CONTACT_EMAIL = "hola@iconicospace.com";

interface ShowcaseBook {
  id: string;
  title: string | null;
  theme: string;
  style: string;
  coverUrl: string | null;
  pages: { pageNumber: number; imageUrl: string | null; text: string | null }[];
}

// Temas con página propia → /cuentos/<slug>; el resto abre el editor con el tema.
const THEME_CHIPS: { emoji: string; label: string; href: string }[] = [
  { emoji: "🦕", label: "Dinosaurios", href: "/cuentos/dinosaurios" },
  { emoji: "🚀", label: "Espacio", href: "/cuentos/espacio" },
  { emoji: "👑", label: "Princesas", href: "/cuentos/princesas" },
  { emoji: "🏴‍☠️", label: "Piratas", href: "/cuentos/piratas" },
  { emoji: "🦸", label: "Superhéroes", href: "/cuentos/superheroes" },
  { emoji: "🦁", label: "Animales", href: "/cuentos/animales" },
  { emoji: "⚽", label: "Fútbol", href: "/cuentos/futbol" },
  { emoji: "🧜", label: "Sirenas y océano", href: "/cuentos/sirenas" },
  { emoji: "✨", label: "Magia", href: "/cuentos/magia" },
  { emoji: "🚒", label: "Bomberos", href: editorUrlForTheme("una aventura como bombero") },
  { emoji: "🧚", label: "Hadas", href: editorUrlForTheme("un bosque de hadas") },
  { emoji: "🚗", label: "Coches", href: editorUrlForTheme("una carrera de coches") },
];

const OCCASIONS = SEO_INDEX.filter((p) => p.kind === "ocasion");

const STEPS = [
  {
    icon: Wand2,
    title: "1. Crea la historia gratis",
    description:
      "Escribe su nombre y el tema que le apasiona. Si quieres, elige su edad (3-4, 5-6 o 7-8), añade un compañero (su mascota, un hermano, su mejor amigo), una dedicatoria y una foto para describir sus rasgos. En unos minutos tienes la historia completa y una portada de muestra. Gratis.",
  },
  {
    icon: Sparkles,
    title: "2. Desbloquea las ilustraciones",
    description:
      "¿Te gusta? Paga una sola vez y se ilustran la portada y las 12 páginas, con el mismo protagonista reconocible en todas. Puedes retocar el texto antes y después.",
  },
  {
    icon: Gift,
    title: "3. Descárgalo o recíbelo impreso",
    description:
      "Descarga el PDF para leer en pantalla y otro listo para imprimir. Si es para regalar, pide el libro en tapa dura 20×20 cm y te lo enviamos a casa.",
  },
];

const TRUST = [
  {
    icon: Eye,
    title: "Lo ves antes de pagar",
    text: "La historia completa y una portada de muestra son gratis. Solo pagas si te convence.",
  },
  {
    icon: ShieldCheck,
    title: "Pago seguro con Stripe",
    text: "No vemos ni guardamos los datos de tu tarjeta.",
  },
  {
    icon: CameraOff,
    title: "La foto no se guarda",
    text: "Es opcional y solo se usa para describir rasgos como el pelo o los ojos.",
  },
  {
    icon: Printer,
    title: "PDF listo para imprimir",
    text: "Un PDF para pantalla y otro preparado para imprenta o para imprimir en casa.",
  },
  {
    icon: Repeat,
    title: "Sin suscripción",
    text: "Pago único por libro. Nada de cuotas ni renovaciones.",
  },
  {
    icon: Truck,
    title: "Si llega defectuoso, lo reponemos",
    text: "Si el libro impreso tiene un defecto de impresión, te enviamos otro.",
  },
];

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "¿Cuánto tarda?",
    a: "Unos minutos. La historia y la portada de muestra se crean al momento; tras el pago, las ilustraciones y el PDF también están listos en unos minutos. El libro impreso llega en 5-9 días.",
  },
  {
    q: "¿La foto de mi hijo se guarda?",
    a: "No. La foto es opcional y solo se usa en el momento para describir sus rasgos (color de pelo, ojos, etc.). No se almacena.",
  },
  {
    q: "¿Puedo editar el texto?",
    a: "Sí. Puedes cambiar el texto de cualquier página antes de desbloquear las ilustraciones y también después.",
  },
  {
    q: "¿Para qué edades es?",
    a: "Para niños de 3 a 8 años. Eliges la franja (3-4, 5-6 o 7-8) y el texto se adapta a esa edad.",
  },
  {
    q: "¿Cómo es el libro impreso?",
    a: `Tapa dura, formato cuadrado de 20×20 cm, con la portada y las 12 páginas ilustradas. Cuesta ${formatEuros(PRINT_PRODUCT.price)} con el envío a domicilio en España incluido, y llega en ${PRINT_PRODUCT.deliveryDays.min}-${PRINT_PRODUCT.deliveryDays.max} días.`,
  },
  {
    q: "¿Puedo devolverlo?",
    a: (
      <>
        Al ser un producto personalizado no aplica el{" "}
        <Link href='/desistimiento' className='text-primary underline'>
          derecho de desistimiento
        </Link>
        . Pero si el libro impreso llega con un defecto de impresión, escríbenos
        a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className='text-primary underline'>
          {CONTACT_EMAIL}
        </a>{" "}
        y te lo reponemos.
      </>
    ),
  },
  {
    q: "¿Hay algún descuento?",
    a: `Sí: por el lanzamiento, introduce el código ${LAUNCH_PROMO.code} en la página de pago y tendrás un ${LAUNCH_PROMO.discount} de descuento.`,
  },
];

function booksInPack(credits: number) {
  return Math.max(1, Math.round(credits / 5));
}

function ShowcaseSection({ books }: { books: ShowcaseBook[] }) {
  return (
    <section
      id='ejemplos'
      aria-labelledby='ejemplos-titulo'
      className='py-12 sm:py-20 px-4'>
      <div className='max-w-7xl mx-auto'>
        <div className='text-center mb-8 sm:mb-12'>
          <h2
            id='ejemplos-titulo'
            className='text-2xl sm:text-4xl font-bold mb-3 sm:mb-4'>
            Libros creados con LibrosIA
          </h2>
          <p className='text-text-muted text-sm sm:text-lg max-w-2xl mx-auto'>
            Portadas y páginas reales generadas con la herramienta.
          </p>
        </div>

        <ul className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {books.map((book) => {
            const title = book.title || `Un cuento de ${book.theme}`;
            const sample = book.pages.find((p) => p.text);
            return (
              <li
                key={book.id}
                className='rounded-2xl bg-surface border border-border overflow-hidden flex flex-col'>
                {book.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverUrl}
                    alt={`Portada del libro «${title}»`}
                    loading='lazy'
                    className='w-full aspect-square object-cover'
                  />
                )}
                <div className='p-4 flex flex-col gap-3 flex-1'>
                  <div>
                    <h3 className='font-bold text-lg leading-snug'>{title}</h3>
                    <p className='text-text-muted text-sm'>Tema: {book.theme}</p>
                  </div>
                  {book.pages.some((p) => p.imageUrl) && (
                    <div className='grid grid-cols-3 gap-2'>
                      {book.pages
                        .filter((p) => p.imageUrl)
                        .map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={p.pageNumber}
                            src={p.imageUrl!}
                            alt={`Ilustración de la página ${p.pageNumber} de «${title}»`}
                            loading='lazy'
                            className='w-full aspect-square object-cover rounded-lg'
                          />
                        ))}
                    </div>
                  )}
                  {sample?.text && (
                    <p className='text-sm text-text-muted italic line-clamp-3'>
                      «{sample.text}»
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [showcase, setShowcase] = useState<ShowcaseBook[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/showcase", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { books: [] }))
      .then((data: { books?: ShowcaseBook[] }) => {
        if (Array.isArray(data.books)) {
          setShowcase(data.books.filter((b) => b.coverUrl));
        }
      })
      .catch(() => {
        /* sin ejemplos: la sección no se muestra */
      });
    return () => controller.abort();
  }, []);

  const packs = Object.values(CREDIT_PACKS);

  return (
    <MotionConfig reducedMotion='user'>
      <div className='min-h-screen bg-bg'>
        {/* Header */}
        <header className='fixed top-0 left-0 right-0 z-50 glass'>
          <div className='max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between'>
            <Link href='/' className='flex items-center gap-2' aria-label='LibrosIA, inicio'>
              <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary flex items-center justify-center'>
                <Book className='w-5 h-5 sm:w-6 sm:h-6 text-white' aria-hidden />
              </div>
              <span className='text-lg sm:text-xl font-bold'>
                <span className='text-primary'>Libros</span>
                <span className='text-secondary'>IA</span>
              </span>
            </Link>

            <nav aria-label='Principal' className='hidden md:flex items-center gap-8'>
              <a href='#como-funciona' className='text-text-muted hover:text-text transition-colors'>
                Cómo funciona
              </a>
              {showcase.length > 0 && (
                <a href='#ejemplos' className='text-text-muted hover:text-text transition-colors'>
                  Ejemplos
                </a>
              )}
              <a href='#precios' className='text-text-muted hover:text-text transition-colors'>
                Precios
              </a>
              <a href='#preguntas' className='text-text-muted hover:text-text transition-colors'>
                Preguntas
              </a>
            </nav>

            <Link
              href='/editor'
              className='px-3 sm:px-6 py-2 sm:py-2.5 bg-primary hover:bg-primary-hover text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-all hover:scale-105'>
              <span className='hidden sm:inline'>Crear su libro gratis</span>
              <span className='sm:hidden'>Crear gratis</span>
            </Link>
          </div>
        </header>

        <main>
          {/* Hero */}
          <section className='pt-24 sm:pt-32 pb-12 sm:pb-20 px-4'>
            <div className='max-w-7xl mx-auto'>
              <div className='grid lg:grid-cols-2 gap-10 lg:gap-12 items-center'>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}>
                  <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/30 text-primary mb-4 sm:mb-6'>
                    <Gift className='w-4 h-4' aria-hidden />
                    <span className='text-xs sm:text-sm font-medium'>
                      Un regalo de cumpleaños, Navidad o Reyes que no tiene nadie más
                    </span>
                  </div>

                  <h1 className='text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight'>
                    Un cuento donde{" "}
                    <span className='gradient-text'>tu hijo es el protagonista</span>
                  </h1>

                  <p className='text-base sm:text-xl text-text-muted mb-6 sm:mb-8 max-w-xl'>
                    Escribe su nombre y lo que más le gusta. En unos minutos
                    tendrás su historia y una portada de muestra,{" "}
                    <strong className='text-text'>gratis</strong>. Si te
                    encanta, la ilustramos entera y te la llevas en PDF o
                    impresa en tapa dura.
                  </p>

                  <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
                    <Link
                      href='/editor'
                      className='px-6 sm:px-8 py-3.5 sm:py-4 bg-primary hover:bg-primary-hover text-white font-bold text-base sm:text-lg rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2 animate-pulse-glow'>
                      <Wand2 className='w-5 h-5' aria-hidden />
                      Crear su libro gratis
                    </Link>
                    <a
                      href='#precios'
                      className='px-6 sm:px-8 py-3.5 sm:py-4 bg-surface hover:bg-border text-text font-semibold rounded-xl transition-colors flex items-center justify-center'>
                      Ver precios
                    </a>
                  </div>

                  <ul className='mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-text-muted text-sm sm:text-base'>
                    {[
                      "Historia y portada de muestra gratis",
                      "Portada + 12 páginas ilustradas",
                      "PDF para pantalla y para imprimir",
                      "También en tapa dura con envío a casa",
                    ].map((item) => (
                      <li key={item} className='flex items-center gap-2'>
                        <Check className='w-5 h-5 text-green-500 shrink-0' aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Ilustración decorativa (no es un libro real) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className='relative'
                  aria-hidden>
                  <div className='w-full max-w-sm sm:max-w-md mx-auto'>
                    <div className='relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 sm:p-8 book-shadow'>
                      <div className='aspect-square bg-surface rounded-xl overflow-hidden relative'>
                        <div className='absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20' />
                        <div className='absolute inset-0 flex flex-col items-center justify-center p-6 text-center'>
                          <div className='w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/30 flex items-center justify-center mb-4 animate-float'>
                            <span className='text-4xl sm:text-5xl'>🧒</span>
                          </div>
                          <p className='text-sm text-text-muted mb-1'>La gran aventura de</p>
                          <p className='text-2xl sm:text-3xl font-bold px-4 py-1 rounded-lg border-2 border-dashed border-primary/60'>
                            su nombre aquí
                          </p>
                          <p className='text-text-muted text-sm mt-3'>
                            Tapa dura · 20×20 cm
                          </p>
                        </div>
                      </div>
                      <div className='absolute -top-4 -right-4 w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg animate-float'>
                        <span className='text-2xl'>🎁</span>
                      </div>
                      <div
                        className='absolute -bottom-4 -left-4 w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg animate-float'
                        style={{ animationDelay: "0.5s" }}>
                        <span className='text-xl'>⭐</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Cómo funciona */}
          <section
            id='como-funciona'
            aria-labelledby='como-funciona-titulo'
            className='py-12 sm:py-20 px-4 bg-bg-light'>
            <div className='max-w-7xl mx-auto'>
              <div className='text-center mb-10 sm:mb-16'>
                <h2 id='como-funciona-titulo' className='text-2xl sm:text-4xl font-bold mb-3 sm:mb-4'>
                  Cómo funciona
                </h2>
                <p className='text-text-muted text-sm sm:text-lg max-w-2xl mx-auto'>
                  Ves la historia antes de pagar nada.
                </p>
              </div>

              <ol className='grid md:grid-cols-3 gap-4 sm:gap-8'>
                {STEPS.map((step, index) => (
                  <motion.li
                    key={step.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className='p-5 sm:p-8 rounded-xl sm:rounded-2xl bg-surface border border-border hover:border-primary/50 transition-colors'>
                    <div className='w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center mb-4 sm:mb-6'>
                      <step.icon className='w-5 h-5 sm:w-7 sm:h-7 text-primary' aria-hidden />
                    </div>
                    <h3 className='text-lg sm:text-xl font-bold mb-2 sm:mb-3'>{step.title}</h3>
                    <p className='text-text-muted text-sm sm:text-base'>{step.description}</p>
                  </motion.li>
                ))}
              </ol>

              <div className='mt-10 text-center'>
                <Link
                  href='/editor'
                  className='inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors'>
                  <Wand2 className='w-5 h-5' aria-hidden />
                  Crear su libro gratis
                </Link>
              </div>
            </div>
          </section>

          {/* Ejemplos reales (solo si hay libros marcados como showcase) */}
          {showcase.length > 0 && <ShowcaseSection books={showcase} />}

          {/* Regalo y fechas */}
          <section
            aria-labelledby='regalo-titulo'
            className={`py-12 sm:py-20 px-4 ${showcase.length > 0 ? "bg-bg-light" : ""}`}>
            <div className='max-w-5xl mx-auto'>
              <div className='rounded-2xl border-2 border-primary/60 bg-gradient-to-br from-primary/15 to-surface p-6 sm:p-10'>
                <div className='flex items-center gap-3 mb-4'>
                  <CalendarHeart className='w-7 h-7 text-primary shrink-0' aria-hidden />
                  <h2 id='regalo-titulo' className='text-2xl sm:text-3xl font-bold'>
                    Pensado para regalar
                  </h2>
                </div>
                <p className='text-text-muted text-sm sm:text-lg mb-5 max-w-3xl'>
                  Para un cumpleaños, para Navidad, para la noche de Reyes o
                  para ayudarle con un momento importante. Añade una dedicatoria
                  y será un regalo hecho solo para él o ella.
                </p>

                {CHRISTMAS_PRINT_DEADLINE && (
                  <div className='flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-bg/60 border border-border mb-6'>
                    <Truck className='w-6 h-6 text-primary shrink-0' aria-hidden />
                    <p className='text-sm sm:text-base'>
                      <strong>
                        Pídelo impreso antes del {CHRISTMAS_PRINT_DEADLINE} para
                        recibirlo en Navidad.
                      </strong>{" "}
                      <span className='text-text-muted'>
                        ¿Vas tarde? El PDF está listo en minutos y lo puedes
                        imprimir en casa.
                      </span>
                    </p>
                  </div>
                )}

                <ul className='flex flex-wrap gap-2 sm:gap-3'>
                  {OCCASIONS.map((o) => (
                    <li key={o.slug}>
                      <Link
                        href={`/cuentos/${o.slug}`}
                        className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border hover:border-primary transition-colors text-sm sm:text-base'>
                        <span aria-hidden>{o.emoji}</span>
                        {o.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Temas */}
          <section aria-labelledby='temas-titulo' className='py-12 sm:py-20 px-4'>
            <div className='max-w-7xl mx-auto'>
              <div className='text-center mb-8 sm:mb-12'>
                <h2 id='temas-titulo' className='text-2xl sm:text-4xl font-bold mb-3 sm:mb-4'>
                  ¿Qué le apasiona?
                </h2>
                <p className='text-text-muted text-sm sm:text-lg'>
                  Elige una idea o escribe cualquier tema: el cuento se crea a
                  partir de lo que tú le pidas.
                </p>
              </div>

              <ul className='flex flex-wrap justify-center gap-2 sm:gap-4'>
                {THEME_CHIPS.map((cat) => (
                  <li key={cat.label}>
                    <Link
                      href={cat.href}
                      className='px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-surface border border-border hover:border-primary transition-colors flex items-center gap-1 sm:gap-2'>
                      <span className='text-lg sm:text-2xl' aria-hidden>
                        {cat.emoji}
                      </span>
                      <span className='font-medium text-sm sm:text-base'>{cat.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Precios */}
          <section
            id='precios'
            aria-labelledby='precios-titulo'
            className='py-12 sm:py-20 px-4 bg-bg-light'>
            <div className='max-w-6xl mx-auto'>
              <div className='text-center mb-8 sm:mb-12'>
                <h2 id='precios-titulo' className='text-2xl sm:text-4xl font-bold mb-3 sm:mb-4'>
                  Precios
                </h2>
                <p className='text-text-muted text-sm sm:text-lg max-w-2xl mx-auto'>
                  La historia y la portada de muestra son{" "}
                  <strong className='text-text'>gratis</strong>. Solo pagas si
                  quieres desbloquear las ilustraciones.
                </p>
                <p className='mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm sm:text-base'>
                  <Tag className='w-4 h-4 text-primary' aria-hidden />
                  <span>
                    Lanzamiento: {LAUNCH_PROMO.discount} con el código{" "}
                    <strong className='font-mono'>{LAUNCH_PROMO.code}</strong> en
                    la página de pago
                  </span>
                </p>
              </div>

              <div className='grid lg:grid-cols-[3fr_2fr] gap-6 lg:gap-8 items-stretch'>
                {/* Packs digitales */}
                <div>
                  <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
                    <Download className='w-5 h-5 text-primary' aria-hidden />
                    Libro digital (PDF)
                  </h3>
                  <div className='grid sm:grid-cols-3 gap-4'>
                    {packs.map((pack) => {
                      const books = booksInPack(pack.credits);
                      return (
                        <div
                          key={pack.name}
                          className={`p-5 rounded-xl sm:rounded-2xl relative flex flex-col text-center ${
                            pack.popular
                              ? "bg-gradient-to-b from-primary/20 to-surface border-2 border-primary"
                              : "bg-surface border border-border"
                          }`}>
                          {pack.popular && (
                            <div className='absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-xs font-bold rounded-full whitespace-nowrap'>
                              Más elegido
                            </div>
                          )}
                          <h4 className='text-lg font-bold mb-1'>{pack.name}</h4>
                          <p className='text-3xl font-bold mb-1'>{formatEuros(pack.price)}</p>
                          <p className='text-xs text-text-muted mb-3 min-h-4'>
                            {books > 1
                              ? `${formatEuros(Math.round(pack.price / books))} por libro`
                              : "IVA incluido"}
                          </p>
                          <p className='text-text-muted text-sm mb-4 flex-1'>{pack.description}</p>
                          <Link
                            href='/editor'
                            className={`block w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                              pack.popular
                                ? "bg-primary hover:bg-primary-hover text-white"
                                : "bg-border hover:bg-bg text-text"
                            }`}>
                            Empezar gratis
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                  <p className='mt-4 text-sm text-text-muted'>
                    Cada libro incluye portada y 12 páginas ilustradas, PDF para
                    pantalla y PDF para imprimir.
                  </p>
                </div>

                {/* Libro impreso */}
                <div className='p-6 sm:p-8 rounded-2xl border-2 border-primary bg-gradient-to-b from-primary/25 to-surface relative flex flex-col'>
                  <div className='absolute -top-3 left-6 px-3 py-0.5 bg-primary text-white text-xs font-bold rounded-full'>
                    Ideal para regalar
                  </div>
                  <div className='flex items-center gap-3 mb-3'>
                    <Book className='w-7 h-7 text-primary' aria-hidden />
                    <h3 className='text-xl sm:text-2xl font-bold'>{PRINT_PRODUCT.name}</h3>
                  </div>
                  <p className='text-4xl font-bold mb-1'>{formatEuros(PRINT_PRODUCT.price)}</p>
                  <p className='text-sm text-text-muted mb-5'>IVA y envío incluidos</p>
                  <ul className='space-y-2 mb-6 text-sm sm:text-base flex-1'>
                    {[
                      "Tapa dura, 20×20 cm",
                      "Portada y 12 páginas ilustradas",
                      `Envío a casa en toda España en ${PRINT_PRODUCT.deliveryDays.min}-${PRINT_PRODUCT.deliveryDays.max} días`,
                      "Si llega con un defecto de impresión, lo reponemos",
                    ].map((item) => (
                      <li key={item} className='flex items-start gap-2'>
                        <Check className='w-5 h-5 text-green-500 shrink-0 mt-0.5' aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className='text-xs text-text-muted mb-4'>
                    Se pide desde tu libro una vez desbloqueadas sus
                    ilustraciones.
                  </p>
                  <Link
                    href='/editor'
                    className='block w-full py-3 rounded-xl font-bold text-center bg-primary hover:bg-primary-hover text-white transition-colors'>
                    Crear su libro gratis
                  </Link>
                </div>
              </div>

              <div className='mt-8 sm:mt-10 text-center'>
                <p className='inline-flex items-center gap-2 text-text-muted text-sm sm:text-base'>
                  <CreditCard className='w-4 h-4 sm:w-5 sm:h-5 shrink-0' aria-hidden />
                  <span>Pago único y seguro con Stripe · Sin suscripciones</span>
                </p>
              </div>
            </div>
          </section>

          {/* Confianza */}
          <section aria-labelledby='confianza-titulo' className='py-12 sm:py-20 px-4'>
            <div className='max-w-6xl mx-auto'>
              <h2 id='confianza-titulo' className='text-2xl sm:text-4xl font-bold mb-8 sm:mb-12 text-center'>
                Compra con tranquilidad
              </h2>
              <ul className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
                {TRUST.map((item) => (
                  <li key={item.title} className='flex gap-4 p-5 rounded-xl bg-surface border border-border'>
                    <item.icon className='w-6 h-6 text-primary shrink-0 mt-0.5' aria-hidden />
                    <div>
                      <h3 className='font-bold mb-1'>{item.title}</h3>
                      <p className='text-text-muted text-sm'>{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* FAQ */}
          <section
            id='preguntas'
            aria-labelledby='preguntas-titulo'
            className='py-12 sm:py-20 px-4 bg-bg-light'>
            <div className='max-w-3xl mx-auto'>
              <h2 id='preguntas-titulo' className='text-2xl sm:text-4xl font-bold mb-8 text-center'>
                Preguntas frecuentes
              </h2>
              <div className='space-y-3'>
                {FAQ.map((item) => (
                  <details key={item.q} className='group rounded-xl bg-surface border border-border p-4 sm:p-5'>
                    <summary className='cursor-pointer list-none font-semibold text-base sm:text-lg flex items-center justify-between gap-3 rounded focus-visible:outline-2 focus-visible:outline-primary'>
                      {item.q}
                      <ChevronRight
                        className='w-5 h-5 shrink-0 transition-transform group-open:rotate-90'
                        aria-hidden
                      />
                    </summary>
                    <div className='mt-3 text-text-muted text-sm sm:text-base'>{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* CTA final */}
          <section className='py-12 sm:py-20 px-4'>
            <div className='max-w-4xl mx-auto text-center'>
              <h2 className='text-2xl sm:text-4xl font-bold mb-4 sm:mb-6'>
                Su nombre, su aventura, su libro
              </h2>
              <p className='text-base sm:text-xl text-text-muted mb-6 sm:mb-8'>
                Crea la historia ahora y decide después. Es gratis.
              </p>
              <Link
                href='/editor'
                className='inline-flex items-center gap-2 px-6 sm:px-10 py-3.5 sm:py-5 bg-primary hover:bg-primary-hover text-white font-bold text-base sm:text-xl rounded-xl sm:rounded-2xl transition-all hover:scale-105 animate-pulse-glow'>
                <Wand2 className='w-5 h-5 sm:w-6 sm:h-6' aria-hidden />
                Crear su libro gratis
              </Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className='py-8 sm:py-12 px-4 border-t border-border'>
          <div className='max-w-7xl mx-auto'>
            <nav aria-labelledby='ideas-footer' className='mb-8'>
              <h2 id='ideas-footer' className='text-sm font-semibold mb-3'>
                <Link href='/cuentos' className='hover:text-primary transition-colors'>
                  Ideas de cuentos personalizados
                </Link>
              </h2>
              <ul className='flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-text-muted'>
                {SEO_INDEX.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/cuentos/${p.slug}`} className='hover:text-text transition-colors'>
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className='flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 pt-6 border-t border-border'>
              <div className='flex items-center gap-2'>
                <div className='w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center'>
                  <Book className='w-4 h-4 sm:w-5 sm:h-5 text-white' aria-hidden />
                </div>
                <span className='font-bold text-sm sm:text-base'>
                  <span className='text-primary'>Libros</span>
                  <span className='text-secondary'>IA</span>
                </span>
                <span className='text-text-muted ml-2 text-xs sm:text-base'>by IconicoSpace</span>
              </div>

              <div className='text-text-muted text-xs sm:text-sm text-center sm:text-right'>
                © {new Date().getFullYear()} IconicoSpace. Todos los derechos reservados.
              </div>
            </div>

            <div className='mt-4 pt-4 border-t border-border flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-text-muted'>
              <Link href='/privacidad' className='hover:text-text transition-colors'>
                Privacidad
              </Link>
              <Link href='/terminos' className='hover:text-text transition-colors'>
                Términos de Servicio
              </Link>
              <Link href='/cookies' className='hover:text-text transition-colors'>
                Cookies
              </Link>
              <Link href='/legal' className='hover:text-text transition-colors'>
                Aviso Legal
              </Link>
              <Link href='/desistimiento' className='hover:text-text transition-colors'>
                Desistimiento
              </Link>
              <a href={`mailto:${CONTACT_EMAIL}`} className='hover:text-text transition-colors'>
                Contacto
              </a>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
