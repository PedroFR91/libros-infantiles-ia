import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import prisma from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      from:
        process.env.EMAIL_FROM || "LibrosIA <noreply@libros.iconicospace.com>",
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/verificar-email",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Fusionar créditos de sesión anónima al hacer login
      if (user.email) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const sessionId = cookieStore.get("sessionId")?.value;

        if (sessionId) {
          // Buscar usuario anónimo con ese sessionId
          const anonymousUser = await prisma.user.findUnique({
            where: { sessionId },
          });

          if (anonymousUser && anonymousUser.credits > 0) {
            // El usuario que está haciendo login
            const existingUser = await prisma.user.findUnique({
              where: { email: user.email },
            });

            if (existingUser) {
              // Transferir créditos al usuario existente
              await prisma.$transaction([
                prisma.user.update({
                  where: { id: existingUser.id },
                  data: { credits: { increment: anonymousUser.credits } },
                }),
                prisma.creditLedger.create({
                  data: {
                    userId: existingUser.id,
                    amount: anonymousUser.credits,
                    reason: "session_merge",
                    referenceId: anonymousUser.id,
                    balance: existingUser.credits + anonymousUser.credits,
                  },
                }),
                // Transferir libros del usuario anónimo
                prisma.book.updateMany({
                  where: { userId: anonymousUser.id },
                  data: { userId: existingUser.id },
                }),
                // Transferir pagos del usuario anónimo
                prisma.payment.updateMany({
                  where: { userId: anonymousUser.id },
                  data: { userId: existingUser.id },
                }),
                // Transferir historial de créditos
                prisma.creditLedger.updateMany({
                  where: { userId: anonymousUser.id },
                  data: { userId: existingUser.id },
                }),
                // Eliminar usuario anónimo
                prisma.user.delete({
                  where: { id: anonymousUser.id },
                }),
              ]);
            }
          }
        }
      }
      return true;
    },
    async session({ session, user }) {
      // Añadir datos extra a la sesión
      if (session.user) {
        session.user.id = user.id;
        session.user.credits = (user as any).credits || 0;
        session.user.role = (user as any).role || "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Cuando se crea un nuevo usuario, intentar fusionar con sesión anónima
      if (user.email) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const sessionId = cookieStore.get("sessionId")?.value;

        if (sessionId) {
          const anonymousUser = await prisma.user.findUnique({
            where: { sessionId },
          });

          if (anonymousUser && anonymousUser.id !== user.id) {
            // Transferir créditos, libros, pagos e historial
            await prisma.$transaction([
              prisma.user.update({
                where: { id: user.id },
                data: { credits: { increment: anonymousUser.credits } },
              }),
              prisma.book.updateMany({
                where: { userId: anonymousUser.id },
                data: { userId: user.id },
              }),
              prisma.payment.updateMany({
                where: { userId: anonymousUser.id },
                data: { userId: user.id },
              }),
              prisma.creditLedger.updateMany({
                where: { userId: anonymousUser.id },
                data: { userId: user.id },
              }),
              prisma.user.delete({
                where: { id: anonymousUser.id },
              }),
            ]);
          }
        }
      }
    },
  },
});

// Types para TypeScript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      credits: number;
      role: "USER" | "ADMIN";
    };
  }
}
