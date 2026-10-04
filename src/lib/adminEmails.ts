/**
 * Emails que son administradores (ADMIN_EMAILS="a@b.com,c@d.com"). Al iniciar
 * sesión se les asigna el rol ADMIN; además conservan su perfil de usuario.
 * Módulo sin dependencias para poder usarlo desde lib/auth.ts.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
