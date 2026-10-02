"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/SiteHeader";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/editor" });
    } catch {
      setError("No se ha podido entrar con Google. Inténtalo de nuevo.");
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("resend", {
        email: email.trim(),
        redirect: false,
        callbackUrl: "/editor",
      });

      if (result?.error) {
        setError("No se ha podido enviar el email. Inténtalo de nuevo.");
      } else {
        setEmailSent(true);
      }
    } catch {
      setError("No se ha podido enviar el email. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className='min-h-screen bg-bg text-text flex items-center justify-center px-4 py-10'>
        <div className='max-w-md w-full'>
          <div className='bg-bg-light border border-border card-shadow rounded-3xl p-6 sm:p-8 text-center'>
            <div className='w-16 h-16 mx-auto mb-6 rounded-full bg-[#EAF5EE] flex items-center justify-center'>
              <Mail className='w-8 h-8 text-success' aria-hidden />
            </div>
            <h1 className='font-display font-semibold text-3xl mb-2'>Revisa tu email</h1>
            <p className='text-text-muted mb-4'>
              Te hemos enviado un enlace para entrar a{" "}
              <strong className='text-text break-all'>{email}</strong>.
            </p>
            <p className='text-text-muted mb-6'>
              Caduca en 24 horas. Si no lo ves, mira en la carpeta de spam.
            </p>
            <button
              onClick={() => setEmailSent(false)}
              className='min-h-11 px-4 font-semibold text-primary hover:text-primary-hover underline underline-offset-2'>
              Usar otro email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-bg text-text flex items-center justify-center px-4 py-10'>
      <div className='max-w-md w-full'>
        <div className='text-center mb-6'>
          <Link href='/' className='inline-flex mb-6 rounded-lg' aria-label='LibrosIA, inicio'>
            <BrandLogo size='lg' />
          </Link>
          <h1 className='font-display font-semibold text-3xl sm:text-4xl mb-2'>
            Entrar en tu cuenta
          </h1>
          <p className='text-text-muted'>
            La cuenta es opcional. Si tienes una, entra para ver tus cuentos.
          </p>
        </div>

        {/* La cuenta es opcional */}
        <div className='mb-5 rounded-2xl bg-primary-soft border border-[#F5CDAE] p-4 sm:p-5'>
          <p className='font-bold flex items-center gap-2 mb-1'>
            <Sparkles className='w-5 h-5 text-primary shrink-0' aria-hidden />
            No necesitas cuenta para crear tu cuento
          </p>
          <p className='text-text-muted'>
            Empieza sin registrarte: te enviamos el enlace de tu cuento por
            email.{" "}
            <Link
              href='/editor'
              className='font-semibold text-primary-hover underline underline-offset-2'>
              Empezar su cuento gratis
            </Link>
          </p>
          <p className='text-text-muted mt-2'>
            ¿Ya tienes un cuento?{" "}
            <Link
              href='/mis-libros'
              className='font-semibold text-primary-hover underline underline-offset-2'>
              Recupéralo con tu email
            </Link>
          </p>
        </div>

        <div className='bg-bg-light border border-border card-shadow rounded-3xl p-6 sm:p-8'>
          {error && (
            <div
              role='alert'
              className='mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800'>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className='w-full min-h-12 py-3 px-4 bg-white hover:bg-bg border-2 border-border-strong rounded-xl font-bold text-text transition-colors flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed'>
            {isLoading ? (
              <Loader2 className='w-5 h-5 animate-spin' aria-hidden />
            ) : (
              <svg className='w-5 h-5' viewBox='0 0 24 24' aria-hidden>
                <path
                  fill='#4285F4'
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                />
                <path
                  fill='#34A853'
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                />
                <path
                  fill='#FBBC05'
                  d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                />
                <path
                  fill='#EA4335'
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                />
              </svg>
            )}
            Continuar con Google
          </button>

          <div className='relative my-6'>
            <div className='absolute inset-0 flex items-center' aria-hidden>
              <div className='w-full border-t border-border'></div>
            </div>
            <div className='relative flex justify-center'>
              <span className='px-4 bg-bg-light text-text-muted'>o con tu email</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className='space-y-4'>
            <div>
              <label htmlFor='login-email' className='block font-bold mb-2'>
                Email
              </label>
              <input
                id='login-email'
                type='email'
                autoComplete='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='tu@email.com'
                className='w-full min-h-12 px-4 py-3 text-base bg-surface border-2 border-border-strong rounded-xl text-text placeholder:text-text-muted/80 focus:border-primary outline-none transition-colors'
                disabled={isLoading}
                required
              />
            </div>
            <button
              type='submit'
              disabled={isLoading || !email.trim()}
              className='w-full min-h-12 py-3 bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2'>
              {isLoading ? (
                <Loader2 className='w-5 h-5 animate-spin' aria-hidden />
              ) : (
                <Mail className='w-5 h-5' aria-hidden />
              )}
              Enviarme un enlace para entrar
            </button>
          </form>

          <p className='mt-5 text-center text-[0.95rem] text-text-muted'>
            Sin contraseñas: te enviamos un enlace para entrar.
          </p>
        </div>

        <div className='mt-6 text-center'>
          <Link
            href='/'
            className='min-h-11 text-text-muted hover:text-text transition-colors inline-flex items-center gap-2'>
            <ArrowLeft className='w-4 h-4' aria-hidden />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
