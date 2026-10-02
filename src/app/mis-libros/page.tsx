"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Book, Mail, Loader2, CheckCircle } from "lucide-react";

export default function MisLibrosPage() {
  return (
    <Suspense fallback={null}>
      <Recover />
    </Suspense>
  );
}

function Recover() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("enlace") === "caducado";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className='min-h-screen bg-bg text-text flex flex-col'>
      <header className='px-4 py-4 max-w-xl w-full mx-auto'>
        <Link href='/' className='inline-flex items-center gap-2 font-bold text-lg'>
          <span className='w-8 h-8 rounded-lg bg-primary flex items-center justify-center'>
            <Book className='w-5 h-5 text-white' />
          </span>
          LibrosIA
        </Link>
      </header>

      <main className='flex-1 px-4 py-8 max-w-xl w-full mx-auto'>
        <h1 className='font-display text-3xl font-semibold mb-3'>Tus cuentos</h1>
        <p className='text-text-muted mb-6'>
          No necesitas cuenta. Escribe el email que usaste al crear o comprar tu
          cuento y te enviamos el enlace para abrirlo en este dispositivo.
        </p>

        {expired && (
          <p role='status' className='mb-6 p-3 rounded-xl bg-primary-soft text-text text-sm'>
            Ese enlace no es válido. Pídenos uno nuevo con tu email.
          </p>
        )}

        {state === "sent" ? (
          <div role='status' className='p-5 rounded-2xl bg-bg-light border border-border card-shadow flex gap-3'>
            <CheckCircle className='w-6 h-6 text-success flex-shrink-0' />
            <div>
              <p className='font-bold mb-1'>Revisa tu correo</p>
              <p className='text-text-muted text-sm'>
                Si hay cuentos con <strong>{email}</strong>, te llegará un email
                con sus enlaces en un par de minutos. Mira también en promociones
                o spam.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className='space-y-3'>
            <label htmlFor='recover-email' className='block font-semibold'>
              Tu email
            </label>
            <input
              id='recover-email'
              type='email'
              required
              autoComplete='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='tu@email.com'
              className='w-full px-4 py-3.5 rounded-xl bg-bg-light border border-border-strong text-base focus:border-primary outline-none'
            />
            <button
              type='submit'
              disabled={state === "sending"}
              className='w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60'>
              {state === "sending" ? (
                <Loader2 className='w-5 h-5 animate-spin' />
              ) : (
                <Mail className='w-5 h-5' />
              )}
              Enviarme mis cuentos
            </button>
            {state === "error" && (
              <p className='text-sm text-primary'>
                No se pudo enviar. Inténtalo de nuevo en un momento.
              </p>
            )}
          </form>
        )}

        <p className='mt-10 text-sm text-text-muted'>
          ¿Aún no tienes ninguno?{" "}
          <Link href='/editor' className='text-primary font-semibold underline'>
            Crea su cuento gratis
          </Link>
        </p>
      </main>
    </div>
  );
}
