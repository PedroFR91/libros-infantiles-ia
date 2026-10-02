import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { Providers } from "./providers";
import { Suspense } from "react";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

// Cuerpo: Nunito (redondeada, muy legible). Títulos: Fraunces (clase font-display).
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://libros.iconicospace.com";

export const metadata: Metadata = {
  title: {
    default: "LibrosIA · Regala un cuento donde el héroe lleva su nombre",
    template: "%s | LibrosIA",
  },
  description:
    "Un cuento ilustrado con su nombre y lo que más le gusta. Lee la historia y mira su portada gratis; si te enamora, lo ilustramos (portada + 12 páginas) y te llega impreso a casa o en PDF.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Regala un cuento donde el héroe lleva su nombre",
    description:
      "Historia y portada gratis, sin tarjeta. Si te enamora, lo ilustramos y te llega impreso a casa o en PDF.",
    url: siteUrl,
    siteName: "LibrosIA by IconicoSpace",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regala un cuento donde el héroe lleva su nombre",
    description:
      "Historia y portada gratis, sin tarjeta. Si te enamora, lo ilustramos y te llega impreso a casa o en PDF.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFF8EE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='es' className={`${nunito.variable} ${fraunces.variable}`}>
      <body
        className='font-sans antialiased'>
        <Providers>{children}</Providers>
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
