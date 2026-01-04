import Link from "next/link";
import { Book, Mail, ArrowLeft } from "lucide-react";

export default function VerificarEmailPage() {
  return (
    <div className='min-h-screen bg-bg flex items-center justify-center p-4'>
      <div className='max-w-md w-full text-center'>
        {/* Header */}
        <Link href='/' className='inline-flex items-center gap-2 mb-8'>
          <div className='w-12 h-12 rounded-xl bg-primary flex items-center justify-center'>
            <Book className='w-7 h-7 text-white' />
          </div>
          <span className='text-2xl font-bold'>
            <span className='text-primary'>Libros</span>
            <span className='text-secondary'>IA</span>
          </span>
        </Link>

        {/* Card */}
        <div className='bg-surface border border-border rounded-2xl p-8'>
          <div className='w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center'>
            <Mail className='w-10 h-10 text-primary' />
          </div>

          <h1 className='text-2xl font-bold mb-3'>
            ¡Revisa tu bandeja de entrada!
          </h1>

          <p className='text-text-muted mb-6'>
            Te hemos enviado un <strong>enlace mágico</strong> para iniciar
            sesión.
          </p>

          <div className='bg-bg rounded-xl p-4 mb-6'>
            <p className='text-sm text-text-muted'>
              📧 Revisa tu email (también la carpeta de spam)
              <br />
              🔗 Haz click en el enlace para acceder
              <br />⏰ El enlace expira en 24 horas
            </p>
          </div>

          <p className='text-xs text-text-muted'>
            ¿No recibiste el email?{" "}
            <Link href='/login' className='text-primary hover:underline'>
              Intentar de nuevo
            </Link>
          </p>
        </div>

        {/* Back link */}
        <div className='mt-6'>
          <Link
            href='/'
            className='text-text-muted hover:text-text transition-colors inline-flex items-center gap-2'>
            <ArrowLeft className='w-4 h-4' />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
