import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { CookieBanner } from "@/components/CookieBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://libros.iconicospace.com";

export const metadata: Metadata = {
  title: {
    default: "LibrosIA - Crea libros infantiles personalizados con IA",
    template: "%s | LibrosIA",
  },
  description:
    "Genera cuentos infantiles únicos con ilustraciones personalizadas usando inteligencia artificial. 12 páginas ilustradas, descarga en PDF.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "LibrosIA - Crea libros infantiles personalizados con IA",
    description:
      "Genera cuentos infantiles únicos con ilustraciones personalizadas usando inteligencia artificial. Desde 4,99€.",
    url: siteUrl,
    siteName: "LibrosIA by IconicoSpace",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LibrosIA - Libros infantiles personalizados con IA",
    description:
      "Crea cuentos únicos para tus hijos con ilustraciones generadas por IA. 12 páginas, PDF descargable.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='es'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
