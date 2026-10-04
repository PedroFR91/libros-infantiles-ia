import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  CameraOff,
  ChevronDown,
  Eraser,
  Gift,
  Mail,
  Palette,
  PenLine,
  ScanEye,
  ShieldCheck,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import {
  FOUNDER_OFFER,
  FREE_REDRAWS,
  GUARANTEE_TEXT,
  PRINT_COMING_SOON_TEXT,
} from "@/lib/pricing";
import { SEO_INDEX } from "@/lib/seo-pages";
import { SiteHeader } from "@/components/SiteHeader";
import { CONTACT_EMAIL, SiteFooter } from "@/components/SiteFooter";
import { ThemeIcon } from "@/components/ThemeIcon";
import { HeroStart } from "@/components/landing/HeroStart";
import { ShowcaseGallery } from "@/components/landing/ShowcaseGallery";
import { OfferSection } from "@/components/landing/OfferSection";

// Landing. Reglas (REVISION-PRODUCTO-2026-10.md §4 y §6): nada de
// testimonios, cifras ni reseñas inventadas, ni etiquetas "Popular".
// El contenido es visible sin animaciones de entrada (whileInView con
// opacity 0 dejaba secciones vacías en capturas y lectores).


const STEPS = [
  {
    icon: PenLine,
    title: "Escribe su nombre y lo que le gusta",
    text: "Dinosaurios, el espacio, su perro, el fútbol… Si quieres, añade su edad y una foto para inspirar al personaje.",
  },
  {
    icon: BookOpen,
    title: "Lees su historia y ves su portada, gratis",
    text: "En unos minutos tienes la historia completa y su portada. Sin tarjeta y sin crear cuenta. Puedes cambiar cualquier frase.",
  },
  {
    icon: Gift,
    title: "La ilustramos y la tienes en PDF",
    text: "Portada + 12 páginas ilustradas, en minutos. Para leerla en la tablet o imprimirla en casa o en una copistería.",
  },
];

// Lo que hace de verdad el motor (sin comparativas ni cifras; ver §5 de la revisión)
const CARE = [
  {
    icon: UserRoundCheck,
    title: "El mismo protagonista en todas las páginas",
    text: "Preparamos una hoja de referencia de cada personaje y usamos la portada como guía de estilo, para que sea el mismo de la primera a la última página.",
  },
  {
    icon: Eraser,
    title: "Sin letras raras dentro de los dibujos",
    text: "El texto va en la página, bien escrito; cuidamos que las ilustraciones no se llenen de letras inventadas.",
  },
  {
    icon: ScanEye,
    title: "Revisamos cada ilustración",
    text: "Cada dibujo pasa una revisión automática y rehacemos los que salen mal: un personaje distinto, manos o caras deformes, cosas que sobran.",
  },
  {
    icon: BookOpenCheck,
    title: "Historias escritas para su edad",
    text: "Frases a su medida, sin rimas forzadas ni texto repetido, y sin personajes de marcas: la aventura es solo suya.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "¿Tengo que pagar para probarlo?",
    a: "No. La historia completa y la portada se crean gratis, sin tarjeta y sin crear cuenta. Solo pagas si quieres que lo ilustremos entero.",
  },
  {
    q: "¿Puedo cambiar algo cuando esté ilustrado?",
    a: `Sí. Puedes cambiar el texto de cualquier página y rehacer dibujos gratis hasta ${FREE_REDRAWS} veces.`,
  },
  {
    q: "¿Y si no me gusta cómo queda?",
    a: GUARANTEE_TEXT,
  },
  {
    q: "¿Se parecerá a mi hijo?",
    a: "Será un personaje inspirado en tu hijo (pelo, ojos, piel): dibujado, no una foto ni un retrato exacto. Si subes una foto, solo sirve para describir esos rasgos.",
  },
  {
    q: "¿Qué pasa con la foto?",
    a: "Es opcional. Se usa en el momento para describir rasgos como el color del pelo o de los ojos y no se guarda.",
  },
  {
    q: "¿Cuánto tarda en llegar?",
    a: "La historia y la portada, unos minutos. Tras el pago, el cuento ilustrado y su PDF también tardan unos minutos: sirve incluso como regalo de última hora.",
  },
  {
    q: "¿Lo puedo tener impreso?",
    a: `${PRINT_COMING_SOON_TEXT} Mientras tanto, el PDF incluye una versión para imprimir en casa o en una copistería.`,
  },
  {
    q: "¿Para qué edades es?",
    a: "Para niños de 3 a 8 años. Eliges su franja (3-4, 5-6 o 7-8) y el texto se adapta: frases más cortas para los pequeños, más aventura para los mayores.",
  },
  {
    q: "¿Necesito crear una cuenta?",
    a: "No. Te enviamos el enlace de tu cuento por email y puedes recuperarlo cuando quieras desde «Mis cuentos» con ese mismo email.",
  },
  {
    q: "¿Qué es el precio fundador?",
    a: `Un descuento del ${FOUNDER_OFFER.percent} % que se aplica solo al pagar, sin códigos, en los ${FOUNDER_OFFER.limit} primeros pedidos. Cuando se agotan, se acaba.`,
  },
  {
    q: "¿Puedo devolverlo?",
    a: "Al ser un cuento personalizado no tiene derecho de desistimiento, pero tienes nuestra garantía.",
  },
];

const THEMES = SEO_INDEX.filter((p) => p.kind === "tema");
const OCCASIONS = SEO_INDEX.filter((p) => p.kind === "ocasion");
const THEME_CHIP: Record<string, string> = {
  dinosaurios: "Dinosaurios",
  espacio: "Espacio",
  princesas: "Princesas",
  piratas: "Piratas",
  superheroes: "Superhéroes",
  animales: "Animales",
  futbol: "Fútbol",
  sirenas: "Sirenas y océano",
  magia: "Magia",
};

function SectionTitle({
  id,
  title,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className='text-center mb-10'>
      <h2 id={id} className='font-display font-semibold text-3xl sm:text-4xl mb-3'>
        {title}
      </h2>
      {subtitle && (
        <p className='text-text-muted text-lg max-w-2xl mx-auto'>{subtitle}</p>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className='min-h-screen bg-bg text-text'>
      <SiteHeader
        links={[
          { href: "#como-funciona", label: "Cómo funciona" },
          { href: "#precios", label: "Precios" },
          { href: "#preguntas", label: "Preguntas" },
          { href: "/mis-libros", label: "Mis cuentos" },
        ]}
        ctaHref='/editor'
        ctaLabel='Empezar gratis'
        offerBar
      />

      <main>
        <HeroStart />

        {/* Ejemplos reales: lo primero tras el hero (solo si hay libros showcase) */}
        <ShowcaseGallery />

        {/* Cómo funciona */}
        <section
          id='como-funciona'
          aria-labelledby='como-funciona-titulo'
          className='px-4 py-14 sm:py-20 bg-bg-light border-y border-border scroll-mt-16'>
          <div className='max-w-6xl mx-auto'>
            <SectionTitle
              id='como-funciona-titulo'
              title='Cómo funciona'
              subtitle='Ves su historia y su portada antes de pagar nada.'
            />
            <ol className='grid md:grid-cols-3 gap-5'>
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className='relative rounded-2xl bg-surface border border-border card-shadow p-6'>
                  <div className='flex items-center gap-3 mb-4'>
                    <span
                      className='w-10 h-10 rounded-full bg-primary text-white font-display font-semibold text-xl flex items-center justify-center shrink-0'
                      aria-hidden>
                      {i + 1}
                    </span>
                    <step.icon className='w-7 h-7 text-primary' aria-hidden />
                  </div>
                  <h3 className='font-display font-semibold text-xl mb-2'>
                    <span className='sr-only'>Paso {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className='text-text-muted'>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Lo que cuidamos en cada cuento (hechos del motor, sin comparativas) */}
        <section aria-labelledby='cuidamos-titulo' className='px-4 py-14 sm:py-20'>
          <div className='max-w-5xl mx-auto'>
            <SectionTitle
              id='cuidamos-titulo'
              title='Lo que cuidamos en cada cuento'
              subtitle='Detrás de cada página hay más trabajo del que parece.'
            />
            <ul className='grid sm:grid-cols-2 gap-4 sm:gap-5'>
              {CARE.map((item) => (
                <li
                  key={item.title}
                  className='flex gap-4 rounded-2xl bg-surface border border-border p-5 sm:p-6'>
                  <span className='w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0'>
                    <item.icon className='w-6 h-6 text-primary' aria-hidden />
                  </span>
                  <div>
                    <h3 className='font-bold text-lg leading-snug mb-1'>{item.title}</h3>
                    <p className='text-text-muted'>{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className='mt-5 flex items-start gap-3 rounded-2xl bg-[#EAF5EE] border border-[#BFE0CB] p-5 sm:p-6 text-lg'>
              <ShieldCheck className='w-7 h-7 text-success shrink-0' aria-hidden />
              <span>
                <strong>Y si algo no te convence:</strong> {GUARANTEE_TEXT}
              </span>
            </p>
          </div>
        </section>

        {/* Parecido honesto y foto */}
        <section aria-labelledby='parecido-titulo' className='px-4 pb-14 sm:pb-20'>
          <div className='max-w-5xl mx-auto rounded-3xl bg-bg-light border border-border card-shadow grid md:grid-cols-2'>
            <div className='p-6 sm:p-8'>
              <Palette className='w-8 h-8 text-primary mb-3' aria-hidden />
              <h2
                id='parecido-titulo'
                className='font-display font-semibold text-2xl sm:text-3xl mb-2'>
                Su personaje, dibujado
              </h2>
              <p className='text-lg'>
                Creamos un personaje inspirado en tu hijo (pelo, ojos, piel):
                dibujado, no una foto. Lleva su nombre en cada página.
              </p>
            </div>
            <div className='p-6 sm:p-8 border-t md:border-t-0 md:border-l border-border'>
              <CameraOff className='w-8 h-8 text-secondary mb-3' aria-hidden />
              <h2 className='font-display font-semibold text-2xl sm:text-3xl mb-2'>
                La foto no se guarda
              </h2>
              <p className='text-lg'>
                Es opcional. Solo sirve para describir sus rasgos en el momento
                y después se descarta.{" "}
                <Link
                  href='/privacidad'
                  className='text-text-muted underline underline-offset-2 hover:text-text'>
                  Cómo tratamos los datos
                </Link>
              </p>
            </div>
          </div>
        </section>

        <OfferSection />

        {/* Fechas y ocasiones */}
        <section aria-labelledby='regalo-titulo' className='px-4 py-14 sm:py-20'>
          <div className='max-w-5xl mx-auto rounded-3xl bg-secondary text-white p-6 sm:p-10'>
            <h2
              id='regalo-titulo'
              className='font-display font-semibold text-3xl sm:text-4xl mb-3'>
              Pensado para regalar
            </h2>
            <p className='text-lg text-white/90 max-w-3xl mb-6'>
              Para su cumpleaños, para Navidad, para la noche de Reyes o para
              acompañarle en un momento importante. Con tu dedicatoria en la
              primera página.
            </p>
            <div className='flex items-start gap-3 rounded-2xl bg-white/10 border border-white/20 p-4 mb-6'>
              <Truck className='w-6 h-6 shrink-0 text-[#FFD9B8]' aria-hidden />
              <p className='text-lg'>
                <strong>El PDF está listo en minutos.</strong>{" "}
                <span className='text-white/85'>{PRINT_COMING_SOON_TEXT}</span>
              </p>
            </div>
            <ul className='flex flex-wrap gap-2.5'>
              {OCCASIONS.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/cuentos/${o.slug}`}
                    className='inline-flex items-center gap-2 min-h-11 px-4 rounded-full bg-white text-secondary font-semibold hover:bg-[#FFF1E4] transition-colors'>
                    <ThemeIcon slug={o.slug} className='w-4 h-4' />
                    {o.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Temas */}
        <section aria-labelledby='temas-titulo' className='px-4 pb-14 sm:pb-20'>
          <div className='max-w-5xl mx-auto'>
            <SectionTitle
              id='temas-titulo'
              title='¿Qué le apasiona?'
              subtitle='Elige una idea o escribe la tuya: el cuento se escribe a partir de lo que le gusta.'
            />
            <ul className='flex flex-wrap justify-center gap-2.5'>
              {THEMES.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/cuentos/${t.slug}`}
                    className='inline-flex items-center gap-2 min-h-11 px-4 rounded-full bg-surface border border-border hover:border-primary hover:text-primary-hover font-semibold transition-colors'>
                    <ThemeIcon slug={t.slug} className='w-4 h-4 text-primary' />
                    {THEME_CHIP[t.slug] ?? t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Quién hay detrás */}
        <section
          aria-labelledby='quien-titulo'
          className='px-4 py-14 sm:py-16 bg-bg-light border-y border-border'>
          <div className='max-w-3xl mx-auto text-center'>
            <h2 id='quien-titulo' className='font-display font-semibold text-3xl mb-3'>
              Detrás de LibrosIA está Pedro, desde Málaga
            </h2>
            <p className='text-lg text-text-muted mb-5'>
              Es un proyecto pequeño e independiente. Si tienes cualquier duda,
              antes o después de pedir, escríbeme y te contesto yo.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className='inline-flex items-center gap-2 min-h-11 px-5 rounded-xl border-2 border-secondary text-secondary font-bold hover:bg-secondary hover:text-white transition-colors'>
              <Mail className='w-5 h-5' aria-hidden />
              {CONTACT_EMAIL}
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section
          id='preguntas'
          aria-labelledby='preguntas-titulo'
          className='px-4 py-14 sm:py-20 scroll-mt-16'>
          <div className='max-w-3xl mx-auto'>
            <SectionTitle id='preguntas-titulo' title='Preguntas frecuentes' />
            <div className='space-y-3'>
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className='group rounded-2xl bg-surface border border-border open:border-border-strong'>
                  <summary className='cursor-pointer list-none flex items-center justify-between gap-3 p-4 sm:p-5 font-bold text-lg rounded-2xl [&::-webkit-details-marker]:hidden'>
                    {item.q}
                    <ChevronDown
                      className='w-5 h-5 shrink-0 text-primary transition-transform group-open:rotate-180'
                      aria-hidden
                    />
                  </summary>
                  <p className='px-4 sm:px-5 pb-5 -mt-1 text-text-muted'>{item.a}</p>
                </details>
              ))}
            </div>
            <p className='mt-6 text-center text-text-muted'>
              ¿Ya tienes un cuento?{" "}
              <Link
                href='/mis-libros'
                className='font-semibold text-primary hover:text-primary-hover underline underline-offset-2'>
                Recupéralo con tu email
              </Link>
            </p>
          </div>
        </section>

        {/* CTA final */}
        <section className='px-4 pb-16 sm:pb-24'>
          <div className='max-w-4xl mx-auto text-center rounded-3xl bg-primary-soft border border-[#F5CDAE] px-6 py-10 sm:py-14'>
            <Gift className='w-8 h-8 text-primary mx-auto mb-4' aria-hidden />
            <h2 className='font-display font-semibold text-3xl sm:text-4xl mb-3'>
              Su nombre, su aventura, su cuento
            </h2>
            <p className='text-lg text-text-muted mb-7'>
              Lee su historia ahora y decide después. Es gratis.
            </p>
            <Link
              href='/#empezar'
              className='inline-flex items-center gap-2 min-h-13 px-7 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg transition-colors'>
              Empezar su cuento gratis
              <ArrowRight className='w-5 h-5' aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
