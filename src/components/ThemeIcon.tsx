import {
  Anchor,
  Baby,
  Backpack,
  BookHeart,
  Cake,
  Crown,
  Footprints,
  PawPrint,
  Rocket,
  Shell,
  Star,
  TreePine,
  Trophy,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Un único set de iconos (lucide) para temas y ocasiones: sin emojis del sistema.
const ICONS: Record<string, LucideIcon> = {
  dinosaurios: Footprints,
  espacio: Rocket,
  princesas: Crown,
  piratas: Anchor,
  superheroes: Zap,
  animales: PawPrint,
  futbol: Trophy,
  sirenas: Shell,
  magia: WandSparkles,
  "regalo-cumpleanos": Cake,
  "regalo-navidad": TreePine,
  "reyes-magos": Star,
  "hermano-mayor": Baby,
  "primer-dia-de-cole": Backpack,
};

export function ThemeIcon({
  slug,
  className = "w-5 h-5",
}: {
  slug: string;
  className?: string;
}) {
  const Icon = ICONS[slug] ?? BookHeart;
  return <Icon className={className} aria-hidden />;
}
