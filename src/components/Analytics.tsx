import Script from "next/script";
import { connection } from "next/server";

// Script de Umami leído en tiempo de ejecución: la imagen Docker se construye
// en CI sin .env, así que una variable NEXT_PUBLIC_* quedaría vacía.
//   ANALYTICS_SCRIPT_SRC=https://cloud.umami.is/script.js
//   ANALYTICS_WEBSITE_ID=<id del sitio en Umami>
export async function Analytics() {
  await connection();
  const src = process.env.ANALYTICS_SCRIPT_SRC;
  const websiteId = process.env.ANALYTICS_WEBSITE_ID;
  if (!src || !websiteId) return null;

  return (
    <Script
      src={src}
      data-website-id={websiteId}
      strategy='afterInteractive'
    />
  );
}
