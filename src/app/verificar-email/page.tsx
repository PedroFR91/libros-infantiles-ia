import Link from "next/link";
import { Mail, ArrowLeft, Inbox, Link2, Clock } from "lucide-react";
import { BrandLogo } from "@/components/SiteHeader";

export default function VerificarEmailPage() {
  return (
    <div className='min-h-screen bg-bg text-text flex items-center justify-center px-4 py-10'>
      <div className='max-w-md w-full text-center'>
        <Link href='/' className='inline-flex mb-8 rounded-lg' aria-label='LibrosIA, inicio'>
          <BrandLogo size='lg' />
        </Link>

        <div className='bg-bg-light border border-border card-shadow rounded-3xl p-6 sm:p-8'>
          <div className='w-20 h-20 mx-auto mb-6 rounded-full bg-primary-soft flex items-center justify-center'>
            <Mail className='w-10 h-10 text-primary' aria-hidden />
          </div>

          <h1 className='font-display font-semibold text-3xl mb-3'>Revisa tu email</h1>

          <p className='text-text-muted mb-6'>
            Te hemos enviado un enlace para entrar en tu cuenta.
          </p>

          <ul className='bg-bg rounded-2xl border border-border p-4 mb-6 space-y-2.5 text-left text-text-muted'>
            <li className='flex items-start gap-3'>
              <Inbox className='w-5 h-5 text-primary shrink-0 mt-0.5' aria-hidden />
              Mira en tu bandeja de entrada y en la carpeta de spam.
            </li>
            <li className='flex items-start gap-3'>
              <Link2 className='w-5 h-5 text-primary shrink-0 mt-0.5' aria-hidden />
              Pulsa el enlace del email para entrar.
            </li>
            <li className='flex items-start gap-3'>
              <Clock className='w-5 h-5 text-primary shrink-0 mt-0.5' aria-hidden />
              El enlace caduca en 24 horas.
            </li>
          </ul>

          <p className='text-[0.95rem] text-text-muted'>
            ¿No te ha llegado?{" "}
            <Link href='/login' className='font-semibold text-primary underline underline-offset-2'>
              Inténtalo de nuevo
            </Link>
          </p>
        </div>

        <div className='mt-6'>
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
