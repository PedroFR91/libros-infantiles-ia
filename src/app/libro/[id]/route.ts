import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tokensMatch } from "@/lib/bookAccess";
import { appUrl } from "@/lib/appUrl";

// GET /libro/{id}?t={token} - Enlace privado de un cuento (emails, otro
// dispositivo). Sin cuenta: este navegador pasa a ser el del dueño anónimo
// del cuento (misma cookie de sesión) y se abre el editor.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("t");

  const book = await prisma.book.findUnique({
    where: { id },
    select: {
      accessToken: true,
      user: { select: { id: true, email: true, sessionId: true } },
    },
  });
  if (!book || !tokensMatch(book.accessToken, token)) {
    return NextResponse.redirect(appUrl("/mis-libros?enlace=caducado"));
  }

  const editorUrl = appUrl(`/editor?bookId=${id}`);
  const owner = book.user;

  // Cuento de una cuenta registrada: hay que entrar con esa cuenta
  if (owner.email) {
    const session = await auth();
    if (session?.user?.id === owner.id) return NextResponse.redirect(editorUrl);
    return NextResponse.redirect(
      appUrl(`/login?callbackUrl=${encodeURIComponent(`/editor?bookId=${id}`)}`),
    );
  }

  // Cuento anónimo. Si este navegador no tiene sesión propia, adopta la del
  // dueño (es su otro dispositivo). Si ya tiene una (sesión iniciada o
  // borradores anónimos propios), solo se le pasa ESTE cuento: así no se
  // pisan sus datos ni se entrega todo lo del dueño a un email reenviado.
  const session = await auth();
  const cookieSessionId = request.cookies.get("sessionId")?.value;
  const visitorId =
    session?.user?.id ??
    (cookieSessionId
      ? (await prisma.user.findUnique({ where: { sessionId: cookieSessionId }, select: { id: true } }))?.id
      : undefined);

  if (visitorId && visitorId !== owner.id) {
    const [books, credits] = await Promise.all([
      prisma.book.count({ where: { userId: visitorId } }),
      prisma.user.findUnique({ where: { id: visitorId }, select: { credits: true } }),
    ]);
    if (session?.user?.id || books > 0 || (credits?.credits ?? 0) > 0) {
      await prisma.book.update({ where: { id }, data: { userId: visitorId } });
      return NextResponse.redirect(editorUrl);
    }
  }

  const response = NextResponse.redirect(editorUrl);
  if (owner.sessionId && visitorId !== owner.id) {
    response.cookies.set("sessionId", owner.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
