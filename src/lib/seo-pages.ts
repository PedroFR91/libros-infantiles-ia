// Páginas SEO de /cuentos/[slug]: datos puros (sin dependencias de servidor).
//
// - SEO_INDEX es ligero (slug, tipo, etiqueta) y es lo que usan la landing,
//   el índice /cuentos y el sitemap.
// - SEO_CONTENT tiene el texto largo de cada página; solo lo importan las
//   páginas de servidor.
//
// Reglas de contenido: nada de testimonios, cifras de clientes ni promesas que
// no estén en el flujo real. Los precios NO van en estos textos: la plantilla
// los lee de src/lib/pricing.ts. Sin emojis: los iconos salen de
// src/components/ThemeIcon.tsx. Formato único: "portada + 12 páginas ilustradas".
// Las páginas de campaña (Halloween, Black Friday, Navidad, Reyes) toman
// fechas, descuentos y plazos de src/lib/campaigns.ts para que no se desfasen.

import { CAMPAIGNS } from "@/lib/campaigns";

// ─── Editable por temporada ──────────────────────────────────────────────
// Fecha límite para pedir el libro IMPRESO y recibirlo en Navidad
// (aprobación + 7-10 días laborables + margen de mensajería en diciembre).
// La usan la landing y las páginas SEO. Ponla a null para ocultar el aviso.
export const CHRISTMAS_DEADLINE: string | null = "5 de diciembre";
// ─────────────────────────────────────────────────────────────────────────

const campaign = (prefix: string) => CAMPAIGNS.find((c) => c.id.startsWith(prefix));
const HALLOWEEN = campaign("halloween");
const BLACK_FRIDAY = campaign("black-friday");
const NAVIDAD = campaign("navidad");
const REYES = campaign("reyes");
const XMAS = CHRISTMAS_DEADLINE ?? "5 de diciembre";

function madridDate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", ...opts }).format(
    new Date(iso),
  );
}

/** "del 23 al 30 de noviembre" (mismo mes) a partir de las fechas de la campaña */
function campaignRange(c: { start: string; end: string } | undefined, fallback: string): string {
  if (!c) return fallback;
  return `del ${madridDate(c.start, { day: "numeric" })} al ${madridDate(c.end, {
    day: "numeric",
    month: "long",
  })}`;
}

const HALLOWEEN_PERCENT = HALLOWEEN?.discountPercent ?? 15;
const HALLOWEEN_RANGE = campaignRange(HALLOWEEN, "del 15 al 31 de octubre");
const HALLOWEEN_PRINT =
  HALLOWEEN?.printDeadline ??
  "Si lo quieres impreso, pídelo con margen: tarda 7-10 días laborables desde que lo apruebas.";
const BF_PERCENT = BLACK_FRIDAY?.discountPercent ?? 25;
const BF_RANGE = campaignRange(BLACK_FRIDAY, "del 23 al 30 de noviembre");
const REYES_PRINT_NOTE =
  REYES?.printDeadline ??
  "Para Reyes el impreso ya no llega a tiempo: regala el PDF y pide el impreso después.";

export const SEO_INDEX = [
  { slug: "dinosaurios", kind: "tema", label: "Cuentos de dinosaurios" },
  { slug: "espacio", kind: "tema", label: "Cuentos del espacio" },
  { slug: "princesas", kind: "tema", label: "Cuentos de princesas" },
  { slug: "piratas", kind: "tema", label: "Cuentos de piratas" },
  { slug: "superheroes", kind: "tema", label: "Cuentos de superhéroes" },
  { slug: "animales", kind: "tema", label: "Cuentos de animales" },
  { slug: "futbol", kind: "tema", label: "Cuentos de fútbol" },
  { slug: "sirenas", kind: "tema", label: "Cuentos de sirenas y del océano" },
  { slug: "magia", kind: "tema", label: "Cuentos de magia" },
  { slug: "regalo-cumpleanos", kind: "ocasion", label: "Regalo de cumpleaños" },
  { slug: "regalo-navidad", kind: "ocasion", label: "Regalo de Navidad" },
  { slug: "reyes-magos", kind: "ocasion", label: "Regalo de Reyes Magos" },
  { slug: "hermano-mayor", kind: "ocasion", label: "Hermano mayor: llega un bebé" },
  { slug: "primer-dia-de-cole", kind: "ocasion", label: "Primer día de cole" },
  { slug: "halloween", kind: "ocasion", label: "Halloween sin sustos" },
  { slug: "black-friday", kind: "oferta", label: "Black Friday" },
] as const;

export type SeoSlug = (typeof SEO_INDEX)[number]["slug"];
export type SeoKind = (typeof SEO_INDEX)[number]["kind"];

export interface SeoSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface SeoContent {
  /** <title> (la plantilla del layout añade " | LibrosIA") */
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: SeoSection[];
  faq: { q: string; a: string }[];
  /** Tema sugerido que se pasa al editor como ?theme= */
  ctaTheme: string;
  ctaLabel: string;
  related: [SeoSlug, SeoSlug, SeoSlug];
}

// Bloque común que se repite en las FAQ de temas (adaptado en cada página).
const EDAD_FAQ = {
  q: "¿Para qué edades es?",
  a: "Para niños de 3 a 8 años. Al crear el libro eliges 3-4, 5-6 o 7-8 años y el lenguaje y la extensión del texto se ajustan a esa edad.",
};

export const SEO_CONTENT: Record<SeoSlug, SeoContent> = {
  dinosaurios: {
    metaTitle: "Cuento personalizado de dinosaurios para niños",
    metaDescription:
      "Crea un cuento de dinosaurios donde tu hijo es el protagonista: portada + 12 páginas ilustradas, en PDF o impreso en casa. La historia y la portada de muestra son gratis.",
    h1: "Cuento personalizado de dinosaurios: tu hijo, explorador del Jurásico",
    intro:
      "Hay una etapa en la que los dinosaurios lo son todo: se saben nombres imposibles, distinguen un herbívoro de un carnívoro a simple vista y duermen abrazados a un triceratops de peluche. Un cuento en el que el propio niño viaja entre dinosaurios convierte esa pasión en una historia que puede leer (o escuchar) una y otra vez, con su nombre en cada página.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Escribes el nombre del niño y el tema, y la IA escribe una aventura de 12 páginas con principio, nudo y final. En un cuento de dinosaurios lo habitual es un viaje a un valle prehistórico, la búsqueda de un huevo perdido o la amistad con una cría que se ha separado de su manada. El protagonista resuelve el problema con ingenio y valentía, no con fuerza.",
          "Si añades un compañero (su perro, su hermana o su mejor amigo), aparece en la historia y en las ilustraciones junto a él.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["El campo del tema es libre, así que puedes afinarlo todo lo que quieras. Algunas ideas:"],
        bullets: [
          "Un viaje en el tiempo para devolver un huevo de dinosaurio a su nido.",
          "Una excursión al museo en la que los esqueletos cobran vida por una noche.",
          "Un pequeño paleontólogo que descubre un fósil en el jardín.",
          "Hacerse amigo de un tiranosaurio que en realidad tiene miedo a la oscuridad.",
        ],
      },
      {
        heading: "Consejos para elegir",
        paragraphs: [
          "Para 3-4 años funcionan mejor historias sencillas, con un solo dinosaurio amigo y mucha repetición. A partir de 5-6 años puedes pedir más personajes, algún dato real (nombres de especies, qué comían) y un pequeño misterio. Con 7-8 años aguantan tramas con giros y algo de suspense.",
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "Los dinosaurios dan mucho juego para hablar del miedo a lo grande y desconocido, de cuidar a quien es más pequeño y de la curiosidad científica. Si quieres que la historia gire en torno a un valor concreto, escríbelo en el tema: por ejemplo, «dinosaurios, y que aprenda a pedir ayuda».",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Los dinosaurios dan miedo?",
        a: "No es la idea: las historias son aptas para niños pequeños y los dinosaurios suelen ser amigos o criaturas a las que ayudar. Además, puedes leer y editar todo el texto antes de pagar.",
      },
    ],
    ctaTheme: "una aventura con dinosaurios",
    ctaLabel: "Crear su cuento de dinosaurios gratis",
    related: ["animales", "espacio", "regalo-cumpleanos"],
  },

  espacio: {
    metaTitle: "Cuento personalizado del espacio y astronautas",
    metaDescription:
      "Un cuento ilustrado donde tu hijo viaja al espacio como astronauta. Historia y portada de muestra gratis; portada + 12 páginas ilustradas en PDF o libro impreso.",
    h1: "Cuento personalizado del espacio: tu hijo, astronauta por un día",
    intro:
      "Pocas cosas despiertan tanto la imaginación como mirar la Luna y preguntarse qué hay más allá. En este cuento el protagonista se pone el casco, sube a un cohete y vive su propia misión espacial, con su nombre en cada página y un personaje dibujado inspirado en él.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una aventura de 12 páginas con un objetivo claro: rescatar a un robot perdido, encontrar una estrella que se ha apagado o visitar un planeta donde viven criaturas amables. El personaje mantiene el mismo aspecto en todas las ilustraciones, de principio a fin.",
          "Si subes una foto, solo sirve para inspirar al personaje (pelo, ojos, piel): es un dibujo, no una foto, y la foto no se guarda.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["Escribe el tema con tus palabras. Por ejemplo:"],
        bullets: [
          "Un viaje a la Luna para recuperar el osito que se llevó un cohete.",
          "Una misión a Marte junto a su perro astronauta.",
          "Descubrir un planeta donde todo es de colores y hacer un amigo extraterrestre.",
          "Ayudar a la tripulación de una estación espacial a arreglar una avería.",
        ],
      },
      {
        heading: "Edades y consejos",
        paragraphs: [
          "Con 3-4 años, una sola misión y pocos personajes. Con 5-6, puedes añadir planetas del sistema solar y algo de vocabulario nuevo (órbita, gravedad). Con 7-8 años, una tripulación, un problema técnico que resolver y un final con sorpresa funcionan muy bien.",
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "El espacio es perfecto para hablar de trabajo en equipo, de perseverancia cuando algo sale mal y de la curiosidad por aprender. También es un buen tema para niños a los que les cuesta dormir: una misión que termina mirando la Tierra desde lejos invita a la calma.",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Puedo cambiar el texto si no me convence?",
        a: "Sí. Puedes editar el texto de cada página antes de ilustrarlo y también después.",
      },
    ],
    ctaTheme: "un viaje al espacio como astronauta",
    ctaLabel: "Crear su cuento del espacio gratis",
    related: ["dinosaurios", "superheroes", "regalo-navidad"],
  },

  princesas: {
    metaTitle: "Cuento personalizado de princesas (y príncipes)",
    metaDescription:
      "Crea un cuento de princesas donde tu hija o tu hijo es quien protagoniza la aventura. Portada + 12 páginas ilustradas, en PDF o impreso. Historia y portada de muestra gratis.",
    h1: "Cuento personalizado de princesas: una princesa que vive su propia aventura",
    intro:
      "Los cuentos de princesas no tienen por qué ir de esperar a nadie. En un cuento personalizado la princesa (o el príncipe) es tu hija o tu hijo, y es quien toma las decisiones: cruza el bosque, habla con el dragón y encuentra la solución. Tú decides el tono de la historia.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una historia de 12 páginas ambientada en un reino, un castillo o un bosque encantado. La protagonista tiene un objetivo propio: recuperar la corona que ha robado una urraca, hacerse amiga del dragón al que todos temen o organizar el baile más divertido del reino. El personaje mantiene el mismo aspecto en todas las ilustraciones.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["Algunas propuestas que puedes escribir tal cual o adaptar:"],
        bullets: [
          "Una princesa inventora que construye unas alas para volar sobre su reino.",
          "Una princesa que se hace amiga de un dragón tímido.",
          "Un príncipe y su hermana que resuelven el misterio del castillo.",
          "Una princesa exploradora que busca la flor más rara del bosque.",
        ],
      },
      {
        heading: "Consejos para elegir",
        paragraphs: [
          "Piensa en lo que le gusta a tu hija o hijo además de las princesas: animales, inventos, música… Mezclarlo en el tema da historias más originales. Si tiene un peluche o una mascota inseparable, añádelo como compañero y aparecerá en el cuento.",
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "Valentía, amistad, empatía con quien es diferente y confianza en una misma. Si quieres reforzar alguno en concreto, escríbelo en el tema; antes de pagar puedes leer la historia completa y cambiar lo que quieras.",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Puede ser un príncipe o una historia sin corona?",
        a: "Claro. El tema es libre: puedes escribir «príncipe», «caballera», «reina de las hadas» o lo que encaje con tu hijo o hija.",
      },
    ],
    ctaTheme: "una princesa valiente en un reino encantado",
    ctaLabel: "Crear su cuento de princesas gratis",
    related: ["magia", "sirenas", "regalo-cumpleanos"],
  },

  piratas: {
    metaTitle: "Cuento personalizado de piratas para niños",
    metaDescription:
      "Un cuento de piratas con tu hijo como capitán: mapas, islas y tesoros en portada + 12 páginas ilustradas. Historia y portada de muestra gratis; PDF o libro impreso.",
    h1: "Cuento personalizado de piratas: tu hijo, capitán de su propio barco",
    intro:
      "Un mapa con una X, un loro que habla demasiado y una isla que no aparece en ningún atlas. Los cuentos de piratas tienen todo lo que hace falta para una buena aventura, y en este el capitán es tu hijo.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una travesía de 12 páginas: zarpar, encontrar una pista, superar una tormenta o un obstáculo y llegar al tesoro. Muchas veces el tesoro resulta no ser oro, sino algo con más sentido para el protagonista. Puedes añadir un compañero (un hermano, un amigo o la mascota de casa) como grumete.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["Prueba con alguna de estas o inventa la tuya:"],
        bullets: [
          "Un capitán pirata que busca el tesoro escondido por su abuelo.",
          "Piratas buenos que devuelven a una ballena perdida a su familia.",
          "Un barco pirata que navega por una bañera gigante.",
          "Un mapa que aparece dentro de una botella en la playa de vacaciones.",
        ],
      },
      {
        heading: "Edades y consejos",
        paragraphs: [
          "A los 3-4 años, mejor una aventura corta con un objetivo claro. A los 5-6 años, añadir un mapa con varias pistas les encanta. Con 7-8 años puedes pedir una tripulación, un rival pirata y algún acertijo. Si el niño veranea en la costa, menciona el lugar en el tema para que la historia le resulte cercana.",
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "Trabajo en equipo, honestidad (repartir el tesoro, cumplir la palabra dada) y cuidado del mar. Son temas que salen solos en una historia de piratas y que dan pie a conversar después de leer.",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Puedo pedirlo impreso?",
        a: "Sí. Puedes pedirlo directamente impreso + PDF, con envío a casa incluido, o empezar por el PDF y pasarlo a papel más tarde. El libro impreso mide 21×21 cm y no se imprime hasta que lo apruebas.",
      },
    ],
    ctaTheme: "una aventura pirata en busca de un tesoro",
    ctaLabel: "Crear su cuento de piratas gratis",
    related: ["sirenas", "superheroes", "reyes-magos"],
  },

  superheroes: {
    metaTitle: "Cuento personalizado de superhéroes para niños",
    metaDescription:
      "Tu hijo como superhéroe con su propio poder: un cuento personalizado con portada + 12 páginas ilustradas. Historia y portada de muestra gratis; PDF o impreso.",
    h1: "Cuento personalizado de superhéroes: tu hijo y su superpoder",
    intro:
      "Todos los niños tienen algo que los hace especiales. En este cuento ese algo se convierte en un superpoder: el protagonista descubre lo que puede hacer, se pone la capa y ayuda a su barrio, su cole o su familia. Con su nombre en cada página y un personaje inspirado en él.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una historia de origen y misión en 12 páginas: el niño descubre su poder, aprende a usarlo y lo pone al servicio de los demás. No hacen falta villanos terroríficos; a menudo el reto es un problema que hay que arreglar o alguien a quien ayudar.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["Algunas ideas para escribir en el tema:"],
        bullets: [
          "Un superhéroe cuyo poder es hacer reír a cualquiera.",
          "Una superheroína que habla con los animales del parque.",
          "Superhéroes del cole que salvan la fiesta de fin de curso.",
          "Un niño que descubre que su superpoder es ser valiente cuando tiene miedo.",
        ],
      },
      {
        heading: "Consejos para elegir el superpoder",
        paragraphs: [
          "Funciona muy bien elegir un poder que conecte con algo real del niño: si es muy rápido, correr como el viento; si es cariñoso, curar con abrazos; si no para de preguntar, saberlo todo. Así la historia le habla a él y no a un personaje genérico. Si tiene hermanos, añádelos como compañeros de equipo.",
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "Ayudar a los demás, gestionar el miedo, la responsabilidad («un gran poder…») y aceptar que pedir ayuda también es de héroes. Puedes indicar uno de ellos en el tema y leer la historia completa antes de pagar nada.",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Aparecen personajes de cómics conocidos?",
        a: "No. Las historias y los superhéroes son originales; el héroe es tu hijo, con el poder que tú elijas.",
      },
    ],
    ctaTheme: "un superhéroe con un superpoder especial",
    ctaLabel: "Crear su cuento de superhéroes gratis",
    related: ["futbol", "espacio", "primer-dia-de-cole"],
  },

  animales: {
    metaTitle: "Cuento personalizado de animales para niños",
    metaDescription:
      "Un cuento de animales donde tu hijo es el protagonista: selva, granja o bosque en portada + 12 páginas ilustradas. Historia y portada de muestra gratis.",
    h1: "Cuento personalizado de animales: una aventura en la selva, la granja o el bosque",
    intro:
      "Los animales son el primer gran interés de casi todos los niños. Un cuento en el que tu hijo habla con un león, cuida de un cervatillo o ayuda a los animales de la granja es una forma bonita de unir esa curiosidad con la lectura, y la mascota de casa puede colarse en la historia.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una aventura de 12 páginas en el escenario que elijas: selva, sabana, granja, bosque, polo norte o el propio parque del barrio. El protagonista conoce a uno o varios animales, les ayuda con un problema y vuelve a casa con un amigo nuevo.",
          "Si tenéis mascota, añádela como compañero (por ejemplo, «su perro Toby, un beagle») y aparecerá en las ilustraciones.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["Algunas ideas para empezar:"],
        bullets: [
          "Un safari en el que el elefante más pequeño se ha perdido.",
          "Una noche en la granja en la que los animales organizan una fiesta.",
          "Ayudar a un pingüino que quiere aprender a volar.",
          "Una aventura en el bosque con su gato como guía.",
        ],
      },
      {
        heading: "Edades y consejos",
        paragraphs: [
          "Para 3-4 años, animales conocidos y sonidos que se puedan imitar al leer en voz alta. Para 5-6, animales más exóticos y algún dato curioso. Para 7-8, una historia con un problema de verdad (un hábitat en peligro, un animal herido) y una solución en la que participa el niño.",
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "Empatía, cuidado de los seres vivos, respeto por la naturaleza y responsabilidad. Si en casa estáis pensando en adoptar una mascota, un cuento sobre cuidar de un animal puede ser una buena manera de hablarlo.",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Puede salir nuestra mascota?",
        a: "Sí. Al crear el libro puedes añadir un compañero, que puede ser vuestra mascota. Descríbela brevemente (especie, color, nombre) para que las ilustraciones se parezcan.",
      },
    ],
    ctaTheme: "una aventura con animales",
    ctaLabel: "Crear su cuento de animales gratis",
    related: ["dinosaurios", "sirenas", "hermano-mayor"],
  },

  futbol: {
    metaTitle: "Cuento personalizado de fútbol para niños",
    metaDescription:
      "Un cuento de fútbol con tu hijo o hija como protagonista del partido más importante. Portada + 12 páginas ilustradas, en PDF o impreso. Historia y portada de muestra gratis.",
    h1: "Cuento personalizado de fútbol: el partido más importante de su vida",
    intro:
      "Si en casa se habla de fútbol a todas horas, si el balón duerme junto a la cama o si los entrenamientos del sábado son sagrados, este cuento es para tu hijo o tu hija. Es la estrella del equipo, con su nombre en la camiseta y en cada página.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una historia de 12 páginas alrededor de un partido, un torneo o un entrenamiento especial. Lo interesante no es solo marcar el gol de la victoria: la historia suele girar en torno a superar los nervios, ayudar a un compañero o aprender que perder también forma parte del juego.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["Algunas ideas que puedes adaptar:"],
        bullets: [
          "La final del torneo del cole y un penalti que nadie quiere tirar.",
          "Un balón mágico que lleva al protagonista a jugar en un estadio enorme.",
          "Formar un equipo con los animales del bosque.",
          "Una portera que aprende a no tener miedo a los balones altos.",
        ],
      },
      {
        heading: "Consejos para personalizarlo",
        paragraphs: [
          "Menciona en el tema el color de su equipación o la posición en la que juega para que la historia le resulte suya. Añade como compañero a su mejor amigo del equipo o a un hermano. Ten en cuenta que no se usan escudos ni nombres de clubes reales: el equipo es inventado.",
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "Compañerismo, esfuerzo, juego limpio y saber ganar y perder. Son conversaciones que surgen solas después de leer un cuento de fútbol, sobre todo si el niño ya juega en un equipo.",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Puede ser una niña futbolista?",
        a: "Por supuesto. La protagonista es quien tú indiques, con su nombre y, si subes una foto, con un personaje dibujado inspirado en sus rasgos (la foto no se guarda).",
      },
    ],
    ctaTheme: "un partido de fútbol muy especial",
    ctaLabel: "Crear su cuento de fútbol gratis",
    related: ["superheroes", "regalo-cumpleanos", "primer-dia-de-cole"],
  },

  sirenas: {
    metaTitle: "Cuento personalizado de sirenas y del fondo del mar",
    metaDescription:
      "Un cuento submarino con sirenas, delfines y tesoros donde tu hijo o hija es protagonista. Portada + 12 páginas ilustradas; historia y portada de muestra gratis.",
    h1: "Cuento personalizado de sirenas: una aventura en el fondo del océano",
    intro:
      "Bajo el agua todo es posible: hablar con los delfines, visitar ciudades de coral o descubrir un barco hundido. En este cuento tu hija o tu hijo se sumerge en el océano como sirena, tritón o pequeño explorador submarino.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una aventura marina de 12 páginas con un objetivo: encontrar una perla perdida, ayudar a una tortuga atrapada o descubrir de dónde viene una canción misteriosa. El personaje mantiene el mismo aspecto en todas las ilustraciones, también con cola de sirena.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["Para inspirarte:"],
        bullets: [
          "Una sirena que limpia el arrecife con ayuda de sus amigos peces.",
          "Un explorador en submarino que encuentra un tesoro pirata.",
          "Un verano en la playa en el que una caracola lleva al fondo del mar.",
          "Un tritón que busca a la ballena que canta por las noches.",
        ],
      },
      {
        heading: "Edades y consejos",
        paragraphs: [
          "Para los más pequeños, animales marinos conocidos (peces, tortugas, delfines) y una historia tranquila, ideal para antes de dormir. A partir de 5-6 años, más misterio y criaturas de las profundidades. Si el niño ha estado hace poco en la playa o en un acuario, mencionarlo en el tema le encantará.",
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "Cuidado del mar y del medio ambiente, amistad entre seres muy distintos y curiosidad por lo desconocido. Puedes leer la historia entera antes de pagar y ajustar lo que quieras.",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Puede ser un niño en vez de una sirena?",
        a: "Sí. Puedes escribir «tritón», «buzo», «explorador submarino» o cualquier idea; el tema es libre.",
      },
    ],
    ctaTheme: "una aventura bajo el mar con sirenas",
    ctaLabel: "Crear su cuento submarino gratis",
    related: ["piratas", "princesas", "animales"],
  },

  magia: {
    metaTitle: "Cuento personalizado de magia, hadas y brujas buenas",
    metaDescription:
      "Un cuento de magia donde tu hijo aprende hechizos, conoce hadas o va a una escuela de magos. Portada + 12 páginas ilustradas. Historia y portada de muestra gratis.",
    h1: "Cuento personalizado de magia: su primer hechizo",
    intro:
      "Una varita encontrada en el desván, una escuela de magia escondida detrás del parque o un hada que necesita ayuda. Los cuentos de magia permiten que pase cualquier cosa, y en este el aprendiz de mago es tu hijo.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una historia de 12 páginas en la que el protagonista descubre la magia, comete algún error divertido aprendiendo y acaba usando lo que sabe para ayudar a alguien. Puede ambientarse en un bosque encantado, una escuela de magos o su propia casa transformada.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["Algunas propuestas:"],
        bullets: [
          "El primer día en una escuela de magia donde los libros vuelan.",
          "Un hechizo que sale mal y llena la cocina de burbujas.",
          "Ayudar a las hadas del jardín a recuperar sus colores.",
          "Una bruja buena que enseña al protagonista a hablar con los árboles.",
        ],
      },
      {
        heading: "Consejos para elegir",
        paragraphs: [
          "Para 3-4 años, magia sencilla y visual (colores, burbujas, animales que hablan). Para 5-6, un hechizo que aprender y un pequeño reto. Para 7-8, una escuela de magia con compañeros, reglas y un misterio que resolver. Añadir a un hermano o amigo como compañero de aprendizaje da mucho juego.",
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "Paciencia (la magia no sale a la primera), aprender de los errores, usar lo que sabes para ayudar y confiar en uno mismo. Indícalo en el tema si quieres que sea el centro de la historia.",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Se parece a alguna saga conocida?",
        a: "No. Las historias son originales y se escriben para tu hijo; no usan personajes ni lugares de libros o películas existentes.",
      },
    ],
    ctaTheme: "una aventura de magia con hechizos y hadas",
    ctaLabel: "Crear su cuento de magia gratis",
    related: ["princesas", "regalo-navidad", "reyes-magos"],
  },

  "regalo-cumpleanos": {
    metaTitle: "Libro personalizado para regalar en un cumpleaños",
    metaDescription:
      "Un regalo de cumpleaños original: un cuento ilustrado donde el niño es el protagonista, con dedicatoria. PDF en minutos o libro impreso con envío a casa.",
    h1: "Un libro personalizado como regalo de cumpleaños",
    intro:
      "Juguetes van a llegar muchos. Un cuento en el que el niño que cumple años es el protagonista, con su nombre, un personaje inspirado en él y unas palabras tuyas en la dedicatoria, es de esos regalos que se guardan. Sirve tanto si eres madre o padre como si eres tío, abuela o padrino.",
    sections: [
      {
        heading: "Cómo se prepara el regalo",
        paragraphs: [
          "Escribes el nombre del niño y un tema que le guste, eliges su edad y, si quieres, añades un compañero y una dedicatoria. La historia y una portada de muestra se crean gratis en unos minutos para que veas cómo queda. Si te convence, lo ilustramos entero y te llega impreso a casa con su PDF, o solo en PDF si lo prefieres.",
        ],
      },
      {
        heading: "Ideas de temas para un cumpleaños",
        paragraphs: ["Elige algo que le apasione ahora mismo, o directamente su cumpleaños:"],
        bullets: [
          "Una fiesta de cumpleaños en la que los invitados son dinosaurios.",
          "Un viaje mágico para encontrar las velas que han desaparecido de la tarta.",
          "Su deporte o su dibujo animado favorito convertido en una aventura propia.",
          "Un cumpleaños en el espacio con su mejor amigo como copiloto.",
        ],
      },
      {
        heading: "Consejos para acertar",
        paragraphs: [
          "Si vas con el tiempo justo, el PDF está listo en minutos: puedes imprimirlo en casa o en una copistería, o enviarlo para leerlo en una tableta. Si quieres el libro impreso, pídelo con al menos dos semanas de margen. La dedicatoria es lo que más se recuerda: una frase sencilla con la fecha y quién lo regala basta.",
        ],
      },
      {
        heading: "Para qué edades",
        paragraphs: [
          "De 3 a 8 años. El texto se adapta a la franja que elijas (3-4, 5-6 o 7-8). Para mellizos o hermanos, cada niño puede tener su propio cuento: después del primero, el segundo cuento digital tiene un precio reducido.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Cuánto tarda?",
        a: "La historia y la portada de muestra, unos minutos. El libro ilustrado completo, unos minutos más tras el pago. El impreso llega en 7-10 días laborables desde que lo apruebas.",
      },
      {
        q: "¿Puedo añadir una dedicatoria?",
        a: "Sí. Al crear el libro tienes un campo para escribir una dedicatoria (hasta 300 caracteres).",
      },
    ],
    ctaTheme: "una fiesta de cumpleaños mágica",
    ctaLabel: "Crear su libro de cumpleaños gratis",
    related: ["dinosaurios", "futbol", "regalo-navidad"],
  },

  "regalo-navidad": {
    metaTitle: "Cuento personalizado para regalar en Navidad",
    metaDescription:
      "Regala en Navidad un cuento donde el niño es el protagonista: historia y portada de muestra gratis, PDF en minutos o libro impreso con envío a casa.",
    h1: "Un cuento personalizado como regalo de Navidad",
    intro:
      "La Navidad es época de leer juntos bajo la manta. Un cuento en el que el niño ayuda a Papá Noel, salva la Nochebuena o vive una aventura en la nieve, con su nombre en cada página y un personaje inspirado en él, es un regalo que se vuelve a sacar cada diciembre.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una historia navideña de 12 páginas ilustradas con el niño como protagonista. Puedes ambientarla en el Polo Norte, en el pueblo de los abuelos o en vuestra propia casa la noche del 24. Si añades a un hermano o a la mascota como compañero, también aparecen.",
        ],
      },
      {
        heading: "Ideas de temas navideños",
        paragraphs: ["Algunas ideas que funcionan muy bien:"],
        bullets: [
          "Ayudar a Papá Noel cuando a un reno se le apaga la nariz.",
          "Una nevada mágica que convierte el barrio en un bosque encantado.",
          "Un muñeco de nieve que cobra vida la noche de Navidad.",
          "Buscar el último regalo perdido antes de que amanezca.",
        ],
      },
      {
        heading: "Plazos: digital o impreso",
        paragraphs: [
          `El PDF está listo en minutos después del pago, así que sirve incluso como regalo de última hora. El libro impreso tarda entre 7 y 10 días laborables en llegar, y en diciembre la mensajería va más cargada: pídelo con margen. ${CHRISTMAS_DEADLINE ? `Para recibirlo en Navidad, pídelo antes del ${CHRISTMAS_DEADLINE}.` : ""}`,
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "Generosidad, pensar en los demás, la ilusión y el tiempo en familia. Escribe en el tema si quieres que la historia se centre en alguno de ellos; podrás leerla entera y editarla antes de pagar.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Llegará a tiempo para Navidad?",
        a: `El PDF, sí: está listo en minutos. El impreso tarda 7-10 días laborables desde que lo apruebas; ${CHRISTMAS_DEADLINE ? `para recibirlo en Navidad, pídelo antes del ${CHRISTMAS_DEADLINE}` : "pídelo con margen, sobre todo en diciembre"}.`,
      },
      {
        q: "¿Se puede regalar a varios niños?",
        a: "Sí. Cada niño tiene su propio cuento, con su nombre. Después del primero, el segundo cuento digital tiene un precio reducido, y puedes añadir copias impresas extra del mismo libro (por ejemplo, para los abuelos).",
      },
    ],
    ctaTheme: NAVIDAD?.themes[0]?.id ?? "una aventura de Navidad ayudando a Papá Noel",
    ctaLabel: "Crear su cuento de Navidad gratis",
    related: ["reyes-magos", "magia", "regalo-cumpleanos"],
  },

  "reyes-magos": {
    metaTitle: "Cuento personalizado para regalar en Reyes Magos",
    metaDescription:
      "Un regalo de Reyes diferente: un cuento ilustrado donde el niño es protagonista, con dedicatoria de Sus Majestades. PDF en minutos o libro impreso.",
    h1: "Un cuento personalizado como regalo de Reyes Magos",
    intro:
      "La noche del 5 de enero es la más mágica del año en España. Un cuento en el que el niño acompaña a Melchor, Gaspar y Baltasar, o ayuda a un paje a encontrar una carta perdida, es un regalo que encaja de lleno con esa ilusión. Y la dedicatoria puede firmarla quien tú quieras.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una historia de 12 páginas ilustradas en torno a la noche de Reyes: el viaje de los camellos, la cabalgata, los zapatos junto a la ventana o la carta que el niño escribió. El protagonista es tu hijo, con su nombre y un personaje inspirado en él, y puede ir acompañado de un hermano, un amigo o la mascota de casa.",
        ],
      },
      {
        heading: "Ideas de temas",
        paragraphs: ["Algunas ideas para escribir en el tema:"],
        bullets: [
          "Ayudar a un paje real a recuperar las cartas que se ha llevado el viento.",
          "Un camello que se pierde y el niño lo guía de vuelta a la cabalgata.",
          "Viajar siguiendo la estrella para conocer a los Reyes Magos.",
          "Una noche de Reyes en la que los juguetes cobran vida.",
        ],
      },
      {
        heading: "Consejos y plazos",
        paragraphs: [
          `El libro impreso tarda entre 7 y 10 días laborables desde que lo apruebas, y entre Navidad y Reyes hay festivos y la mensajería va saturada. Si lo quieres en papel para el día 6, pídelo a la vez que los regalos de Navidad, antes del ${XMAS}. ${REYES_PRINT_NOTE}`,
          "El PDF está listo en minutos después del pago: se puede leer en una tableta o imprimir en casa la misma mañana del 6, y pasarlo a papel más adelante. En la dedicatoria puedes escribir un mensaje «de parte de los Reyes Magos».",
        ],
      },
      {
        heading: "Valores que puede trabajar",
        paragraphs: [
          "Generosidad, gratitud, paciencia (esperar a que amanezca) y la ilusión compartida en familia. Lees la historia completa antes de pagar y puedes cambiar cualquier frase.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Puedo poner una dedicatoria de los Reyes Magos?",
        a: "Sí. La dedicatoria es texto libre, así que puedes firmarla como quieras.",
      },
      {
        q: "¿Llegará el impreso para Reyes?",
        a: `Solo si lo pides con tiempo: para tenerlo en papel el 6 de enero, pídelo antes del ${XMAS}. A partir de Navidad el impreso ya no llega a tiempo: regala el PDF, que está listo en minutos, y pide el impreso después.`,
      },
      {
        q: "¿Envían a toda España?",
        a: "El libro impreso se envía a toda España y tarda entre 7 y 10 días laborables desde que lo apruebas.",
      },
    ],
    ctaTheme: REYES?.themes[0]?.id ?? "una aventura la noche de Reyes Magos",
    ctaLabel: "Crear su cuento de Reyes gratis",
    related: ["regalo-navidad", "magia", "piratas"],
  },

  "hermano-mayor": {
    metaTitle: "Cuento personalizado para el hermano mayor: llega un bebé",
    metaDescription:
      "Un cuento para preparar al hermano o hermana mayor ante la llegada de un bebé, con su nombre. Portada + 12 páginas ilustradas. Historia y portada gratis.",
    h1: "Cuento personalizado para el hermano mayor: llega un bebé a casa",
    intro:
      "La llegada de un hermanito es una gran noticia que a veces trae emociones mezcladas: ilusión, celos, miedo a que ya no le quieran igual. Un cuento en el que el hermano o la hermana mayor es el héroe de la historia ayuda a ponerle palabras a todo eso y le recuerda que tiene un papel importante.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una historia de 12 páginas en la que el protagonista vive la llegada del bebé como una aventura: prepara la habitación, descubre lo que el bebé todavía no sabe hacer y que él sí puede enseñarle, y comprueba que el cariño de su familia no se reparte, se multiplica. Si ya sabéis el nombre del bebé, puedes añadirlo como compañero.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["Puedes escribirlo de forma directa o envolverlo en otra aventura:"],
        bullets: [
          "Un hermano mayor que se convierte en el guardián del bebé.",
          "Una misión espacial para encontrar la estrella del nuevo hermanito.",
          "Enseñar al bebé los secretos del jardín, del parque o de su habitación.",
          "Un superhéroe cuyo superpoder es ser el mejor hermano mayor.",
        ],
      },
      {
        heading: "Cuándo regalarlo",
        paragraphs: [
          "Muchas familias lo leen durante las últimas semanas del embarazo o lo regalan el día que el mayor conoce al bebé, como un regalo solo para él. Si lo quieres impreso, cuenta con 7-10 días laborables de envío. Si las fechas se complican, el PDF está listo en minutos.",
        ],
      },
      {
        heading: "Para qué edades y qué trabaja",
        paragraphs: [
          "Funciona especialmente bien entre los 3 y los 6 años, que es cuando más se nota el cambio. Trabaja la gestión de los celos, la responsabilidad, la autoestima y el vínculo entre hermanos. Puedes leer y editar el texto para ajustarlo a vuestra situación.",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Puedo adaptar el texto a nuestra familia?",
        a: "Sí. Puedes editar el texto de cada página antes y después de ilustrarlo.",
      },
    ],
    ctaTheme: "el hermano mayor que da la bienvenida a un bebé",
    ctaLabel: "Crear su cuento de hermano mayor gratis",
    related: ["primer-dia-de-cole", "superheroes", "animales"],
  },

  "primer-dia-de-cole": {
    metaTitle: "Cuento personalizado para el primer día de cole",
    metaDescription:
      "Un cuento para preparar el primer día de colegio con tu hijo como protagonista: sus nervios, sus nuevos amigos y su valentía. Portada + 12 páginas ilustradas.",
    h1: "Cuento personalizado para el primer día de cole",
    intro:
      "Empezar el cole, cambiar de etapa o llegar a un colegio nuevo son momentos grandes para un niño. Leer antes una historia en la que él mismo vive ese primer día, con sus nervios y su final feliz, ayuda a que lo desconocido se vuelva un poco más conocido.",
    sections: [
      {
        heading: "Qué tipo de historia se crea",
        paragraphs: [
          "Una historia de 12 páginas que acompaña al protagonista desde la noche anterior hasta la vuelta a casa: preparar la mochila, despedirse en la puerta, conocer a la profe y hacer un primer amigo. Puedes darle un toque de aventura (una mochila mágica, un dragón que también es nuevo) para que sea más divertida.",
        ],
      },
      {
        heading: "Ideas para el tema",
        paragraphs: ["Algunas formas de plantearlo:"],
        bullets: [
          "Una mochila mágica que le da valor cuando la abraza.",
          "Un primer día en el que toda la clase son animales nuevos como él.",
          "Ayudar a otro niño que también tiene miedo y hacerse amigos.",
          "Un explorador que descubre los rincones secretos del cole.",
        ],
      },
      {
        heading: "Consejos para elegir",
        paragraphs: [
          "Si conoces detalles reales (el nombre de la profe, el color del uniforme, el recreo con columpios), inclúyelos en el tema o edita luego el texto: cuanto más se parezca a lo que va a vivir, más le ayudará. Leedlo varias veces durante los días previos, no solo la noche antes.",
        ],
      },
      {
        heading: "Para qué edades y qué trabaja",
        paragraphs: [
          "Pensado sobre todo para 3-4 años (inicio de Infantil) y 5-6 (paso a Primaria), aunque sirve también para un cambio de colegio a cualquier edad hasta los 8. Trabaja la gestión de los nervios, la separación de los padres, la amistad y la confianza en uno mismo.",
        ],
      },
    ],
    faq: [
      EDAD_FAQ,
      {
        q: "¿Lo tendré a tiempo?",
        a: "El PDF está listo en minutos tras el pago. El impreso tarda 7-10 días laborables en llegar, así que pídelo con margen si lo quieres en papel para el primer día.",
      },
    ],
    ctaTheme: "su primer día de cole",
    ctaLabel: "Crear su cuento del primer día gratis",
    related: ["hermano-mayor", "superheroes", "animales"],
  },

  halloween: {
    metaTitle: "Cuento personalizado de Halloween que no da miedo",
    metaDescription:
      "Un cuento de Halloween divertido y nada terrorífico donde tu hijo es el protagonista: disfraces, calabazas y monstruos simpáticos. Historia y portada de muestra gratis.",
    h1: "Un cuento de Halloween personalizado (y que no da miedo)",
    intro:
      "Halloween puede ser una fiesta de disfraces, calabazas y caramelos sin pasar miedo. En este cuento tu hijo es el protagonista de una noche de Halloween divertida: se disfraza, recorre el barrio y descubre que el monstruo de la historia es, en el fondo, más tímido que él.",
    sections: [
      {
        heading: "Un Halloween divertido, no terrorífico",
        paragraphs: [
          "Las historias se escriben para niños de 3 a 8 años: sin sustos fuertes, sin nada desagradable y sin finales inquietantes. Los fantasmas, brujas y monstruos que aparecen son simpáticos, algo torpes o necesitan ayuda, y el protagonista resuelve la situación con ingenio y buen corazón.",
          "Antes de pagar lees la historia completa y puedes cambiar cualquier frase que no encaje con tu hijo.",
        ],
      },
      {
        heading: "Ideas de historias",
        paragraphs: ["El tema es libre. Algunas ideas que funcionan muy bien:"],
        bullets: [
          "Un monstruo simpático que tiene miedo a la oscuridad y al que hay que acompañar a casa.",
          "Una calabaza que no consigue encender su sonrisa la noche del 31.",
          "Una bruja buena que ha perdido su escoba y necesita ayuda antes de medianoche.",
          "Un concurso de disfraces en el cole en el que los disfraces cobran vida.",
          "Una ruta de truco o trato por el barrio con su hermano y el perro de casa.",
        ],
      },
      {
        heading: "Qué edad y cuánto «miedo»",
        paragraphs: [
          "Con 3-4 años, mejor una historia de disfraces y calabazas, sin oscuridad ni personajes que asusten. Con 5-6, un monstruo simpático o una casa «encantada» que resulta ser una fiesta. Con 7-8 años aguantan un pequeño misterio con algo de suspense y un final que lo explica todo. Si tu hijo es especialmente sensible, escríbelo en el tema («que no dé nada de miedo») y la historia lo tendrá en cuenta.",
        ],
      },
      {
        heading: "Cómo leerlo esa noche",
        paragraphs: [
          "Leedlo antes de salir, como parte del ritual de disfrazarse, o al volver, con la luz tenue y los caramelos sobre la mesa. Pon voces a los personajes, deja que sea él quien lea su nombre y pregúntale qué disfraz llevaría en la historia. Si algo le ha asustado esa noche, un cuento en el que él es el valiente ayuda a cerrar el día con calma.",
        ],
      },
      {
        heading: "Plazos y descuento",
        paragraphs: [
          `El PDF está listo en unos minutos después del pago, así que llega a tiempo aunque lo pidas el mismo 31. ${HALLOWEEN_PRINT}`,
          `En 2026, ${HALLOWEEN_RANGE}, los cuentos tienen un ${HALLOWEEN_PERCENT} % de descuento que se aplica solo al pagar, sin códigos. Solo hay un descuento por pedido: si en ese momento hay otro mayor (como el precio fundador), se aplica el mayor.`,
        ],
      },
    ],
    faq: [
      {
        q: "¿El cuento da miedo?",
        a: "No. Es un cuento de Halloween pensado para niños pequeños: los monstruos son amigos o necesitan ayuda y el final siempre es tranquilo. Además, lees y puedes editar todo el texto antes de pagar.",
      },
      EDAD_FAQ,
      {
        q: "¿Llegará a tiempo para el 31?",
        a: `El PDF, sí: está listo en minutos. ${HALLOWEEN_PRINT}`,
      },
    ],
    ctaTheme: HALLOWEEN?.themes[0]?.id ?? "una noche de Halloween divertida y nada terrorífica",
    ctaLabel: "Crear su cuento de Halloween gratis",
    related: ["magia", "animales", "regalo-cumpleanos"],
  },

  "black-friday": {
    metaTitle: `Black Friday en cuentos personalizados: −${BF_PERCENT} % en todo`,
    metaDescription: `En 2026, ${BF_RANGE}, −${BF_PERCENT} % automático en cuentos personalizados en PDF e impresos. Sin códigos y con tiempo para recibirlo en Navidad.`,
    h1: `Black Friday en LibrosIA: −${BF_PERCENT} % en todos los cuentos`,
    intro: `Si estás pensando en regalar un cuento personalizado en Navidad o en Reyes, el Black Friday es buen momento para pedirlo: tiene descuento y todavía queda margen para que llegue impreso. En 2026, ${BF_RANGE}, todos los cuentos tienen un ${BF_PERCENT} % de descuento, también los impresos.`,
    sections: [
      {
        heading: "Qué incluye el descuento",
        paragraphs: ["Se aplica a todo lo que se puede comprar en la web:"],
        bullets: [
          "El cuento digital: portada + 12 páginas ilustradas en PDF.",
          "El cuento impreso + PDF: 21×21 cm, tapa blanda, con envío a casa incluido (solo España).",
          "Pasar a papel un cuento que ya tienes en PDF.",
          "Las copias extra del mismo libro para abuelos o tíos, en el mismo envío.",
          "El segundo cuento digital, para hermanos o primos.",
        ],
      },
      {
        heading: "Un descuento real y automático",
        paragraphs: [
          "No hace falta ningún código: el descuento se aplica solo al pagar y ves el importe final en la página de pago antes de confirmar. Se calcula sobre el precio habitual de la web, el que aparece en la sección de precios. No inflamos ni tachamos precios: te decimos el porcentaje y lo que pagas.",
          "Solo se aplica un descuento por pedido. Si en ese momento hay otro mayor, se aplica el mayor; no se suman. La historia y la portada de muestra siguen siendo gratis, como siempre: lees el cuento entero antes de decidir.",
        ],
      },
      {
        heading: "Plazos para Navidad y Reyes",
        paragraphs: [
          `El libro no se imprime hasta que apruebas el cuento terminado y, desde ese momento, tarda entre 7 y 10 días laborables en llegar. Un pedido hecho en Black Friday llega con margen para Navidad. Si te lo piensas más, para recibir el impreso en Navidad pídelo antes del ${XMAS}.`,
          "Para Reyes vale la misma fecha: entre Navidad y el 6 de enero hay festivos y, pedido después, el impreso ya no llega a tiempo. En ese caso, regala el PDF, que está listo en minutos, y pide el impreso más adelante.",
        ],
      },
      {
        heading: "Ideas para aprovecharlo",
        paragraphs: ["Algunas formas de organizar los regalos de estas fechas:"],
        bullets: [
          "Un cuento para cada hermano, cada uno con su nombre y su tema favorito.",
          "El impreso para Navidad y una copia extra para los abuelos.",
          "Un cuento con tema navideño o de Reyes, pedido ahora y guardado hasta el día.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Necesito un código de descuento?",
        a: "No. El descuento se aplica automáticamente al pagar y ves el precio final antes de confirmar.",
      },
      {
        q: "¿El descuento vale también para el libro impreso?",
        a: `Sí. Durante el Black Friday el −${BF_PERCENT} % se aplica al digital, al impreso + PDF, a pasar a papel y a las copias extra.`,
      },
      {
        q: "¿Llegará a tiempo para Navidad?",
        a: `Sí, si lo pides antes del ${XMAS}: el impreso tarda 7-10 días laborables desde que lo apruebas. El PDF está listo en minutos.`,
      },
      {
        q: "¿Puedo pedirlo ahora y regalarlo más tarde?",
        a: "Sí. Te enviamos el enlace del cuento por email y puedes recuperarlo cuando quieras desde «Mis cuentos». El impreso lo recibes en casa y lo guardas hasta el día.",
      },
    ],
    ctaTheme: NAVIDAD?.themes[0]?.id ?? "una aventura de Navidad ayudando a Papá Noel",
    ctaLabel: "Crear su cuento gratis",
    related: ["regalo-navidad", "reyes-magos", "regalo-cumpleanos"],
  },
};

export function isSeoSlug(slug: string): slug is SeoSlug {
  return SEO_INDEX.some((p) => p.slug === slug);
}

export function getSeoPage(slug: string) {
  if (!isSeoSlug(slug)) return null;
  const meta = SEO_INDEX.find((p) => p.slug === slug)!;
  return { ...meta, ...SEO_CONTENT[slug] };
}

/** URL del editor con el tema sugerido (el editor puede ignorarlo). */
export function editorUrlForTheme(theme: string): string {
  return `/editor?theme=${encodeURIComponent(theme)}`;
}
