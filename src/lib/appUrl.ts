/** URL absoluta de la app (emails, redirecciones de Stripe) */
export function appUrl(path = ""): string {
  const base =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://libros.iconicospace.com";
  return `${base.replace(/\/$/, "")}${path}`;
}
