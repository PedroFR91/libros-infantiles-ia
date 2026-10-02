// ============================================
// Filtro de propiedad intelectual (Q7)
// ============================================
// Personajes y marcas conocidos que no podemos dibujar ni nombrar en un libro
// que vendemos. Se aplica al tema, al compañero, a la dedicatoria y al ajuste
// libre de "rehacer". La moderación de OpenAI va aparte (contenido dañino).
//
// Todo se compara normalizado: minúsculas, sin tildes y sin signos, por
// palabras completas ("elsa" no salta con "elsapo"). Los nombres que también
// son nombres de pila comunes (Elsa, Mario, Nemo...) solo saltan si aparecen
// junto a una palabra de su universo ("la princesa Elsa", "Mario Bros"),
// para no rechazar a la prima Elsa o al amigo Mario.

export interface IpMatch {
  /** Lo que se ha detectado, tal y como lo mostramos ("Frozen") */
  label: string;
  /** Alternativa sin derechos que proponemos */
  suggestion: string;
  /** Campo donde apareció (theme, companion, dedication, customPrompt...) */
  field?: string;
}

interface IpEntry {
  label: string;
  suggestion: string;
  /** Frases normalizadas que, por sí solas, ya son la marca */
  terms: string[];
  /** Nombres ambiguos: solo cuentan si aparece también alguna de `context` */
  ambiguous?: string[];
  context?: string[];
}

const DEFAULT_SUGGESTION = "un personaje inventado con su propio nombre";

const IP_ENTRIES: IpEntry[] = [
  {
    label: "Frozen",
    suggestion: "una princesa de hielo",
    terms: ["frozen", "arendelle", "olaf"],
    ambiguous: ["elsa", "anna"],
    context: ["princesa", "reina", "hielo", "nieve", "congelado", "congelada", "olaf", "arendelle", "frozen", "kristoff"],
  },
  {
    label: "Disney",
    suggestion: "una princesa de un reino inventado",
    terms: [
      "disney", "pixar", "mickey", "minnie", "pato donald", "goofy", "moana", "vaiana",
      "rey leon", "simba", "lilo", "stitch", "toy story", "buzz lightyear", "rayo mcqueen",
      "mcqueen", "buscando a nemo", "monstruos sa", "monsters inc", "ratatouille", "wall e",
      "winnie the pooh", "winnie pooh", "cenicienta disney", "mirabel madrigal", "encanto disney",
    ],
    ambiguous: ["nemo", "dory", "woody", "ariel", "rapunzel"],
    context: ["pez payaso", "dory", "nemo", "vaquero", "buzz", "sirenita", "enredados", "disney", "pixar"],
  },
  {
    label: "Patrulla Canina",
    suggestion: "un equipo de perritos rescatadores",
    terms: ["patrulla canina", "paw patrol", "ryder"],
    ambiguous: ["chase", "marshall", "skye", "rubble", "rocky", "zuma"],
    context: ["patrulla", "cachorro", "cachorros", "perrito policia", "bahia aventura"],
  },
  {
    label: "Spider-Man",
    suggestion: "un superhéroe que trepa por las paredes",
    terms: ["spiderman", "spider man", "spidey", "hombre arana", "miles morales", "peter parker"],
  },
  {
    label: "Marvel / DC",
    suggestion: "un superhéroe inventado con su propio poder",
    terms: [
      "marvel", "vengadores", "avengers", "iron man", "ironman", "capitan america", "hulk",
      "thanos", "black panther", "pantera negra", "batman", "superman", "wonder woman",
      "mujer maravilla", "dc comics", "liga de la justicia", "spidergwen", "deadpool",
    ],
  },
  {
    label: "Peppa Pig",
    suggestion: "una cerdita a la que le encantan los charcos",
    terms: ["peppa", "peppa pig", "george pig"],
  },
  {
    label: "Pokémon",
    suggestion: "unas criaturas inventadas que viven en bolsillos",
    terms: ["pokemon", "pikachu", "charmander", "eevee", "ash ketchum", "pokeball"],
  },
  {
    label: "Harry Potter",
    suggestion: "una escuela de magos inventada",
    terms: ["harry potter", "hogwarts", "hermione", "dumbledore", "voldemort", "gryffindor", "quidditch"],
  },
  {
    label: "Bluey",
    suggestion: "una familia de perros juguetones",
    terms: ["bluey"],
    ambiguous: ["bingo"],
    context: ["bluey", "perrita azul", "heeler"],
  },
  {
    label: "Barbie",
    suggestion: "una muñeca aventurera inventada",
    terms: ["barbie"],
  },
  {
    label: "Super Mario",
    suggestion: "un fontanero saltarín inventado",
    terms: ["super mario", "mario bros", "mario kart", "luigi", "bowser", "princesa peach", "yoshi", "nintendo"],
    ambiguous: ["mario"],
    context: ["fontanero", "seta", "setas", "champinon", "tuberia", "tuberias", "bros", "kart", "peach", "videojuego"],
  },
  {
    label: "Sonic",
    suggestion: "un erizo muy veloz inventado",
    terms: ["sonic the hedgehog", "sega"],
    ambiguous: ["sonic"],
    context: ["erizo", "anillos", "hedgehog", "tails", "knuckles", "videojuego"],
  },
  {
    label: "Minecraft",
    suggestion: "un mundo hecho de bloques inventado",
    terms: ["minecraft", "creeper", "enderman"],
  },
  {
    label: "otra marca o personaje conocido",
    suggestion: DEFAULT_SUGGESTION,
    terms: [
      "fortnite", "roblox", "lego", "playmobil", "hello kitty", "shrek", "minions", "minion",
      "baby shark", "cocomelon", "pj masks", "heroes en pijama", "bob esponja", "spongebob",
      "dora la exploradora", "dora exploradora", "doraemon", "pocoyo", "star wars", "jedi",
      "darth vader", "yoda", "zelda", "kirby", "pac man", "pacman", "transformers",
      "power rangers", "tortugas ninja", "ninja turtles", "scooby doo", "scooby",
      "looney tunes", "bugs bunny", "tom y jerry", "snoopy", "garfield", "asterix", "tintin",
      "pitufos", "pitufo", "smurfs", "miraculous", "cat noir", "my little pony",
      "gabby", "super wings", "lol surprise", "kpop demon hunters", "guerreras kpop", "huntrix",
      "masha y el oso", "dragon ball", "goku", "naruto", "sailor moon", "mortadelo", "superzings",
      "bing bunny", "caillou", "teletubbies", "barrio sesamo", "epi y blas", "coco melon",
    ],
    ambiguous: ["ladybug", "masha", "gru"],
    context: ["miraculous", "cat noir", "marinette", "oso", "minions", "villano"],
  },
];

/** Minúsculas, sin tildes, sin signos y con espacios simples */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

function containsPhrase(normalized: string, phrase: string): boolean {
  return ` ${normalized} `.includes(` ${phrase} `);
}

/** Primera marca o personaje con derechos encontrado en el texto (o null) */
export function findIpReference(text: string | null | undefined): IpMatch | null {
  if (!text?.trim()) return null;
  const normalized = normalizeForMatch(text);
  for (const entry of IP_ENTRIES) {
    if (entry.terms.some((term) => containsPhrase(normalized, term))) {
      return { label: entry.label, suggestion: entry.suggestion };
    }
    if (
      entry.ambiguous?.some((name) => containsPhrase(normalized, name)) &&
      entry.context?.some((word) => containsPhrase(normalized, word))
    ) {
      return { label: entry.label, suggestion: entry.suggestion };
    }
  }
  return null;
}

/**
 * Revisa varios campos de texto del usuario; devuelve la primera coincidencia
 * con el campo donde apareció.
 */
export function checkIntellectualProperty(
  fields: Record<string, string | null | undefined>,
): IpMatch | null {
  for (const [field, value] of Object.entries(fields)) {
    const match = findIpReference(value);
    if (match) return { ...match, field };
  }
  return null;
}

/** Mensaje amable para la familia */
export function ipErrorMessage(match: IpMatch): string {
  const what =
    match.label === "otra marca o personaje conocido"
      ? "personajes de marcas"
      : `personajes de marcas como ${match.label}`;
  return `Por derechos de autor no podemos usar ${what}; prueba con '${match.suggestion}'.`;
}
