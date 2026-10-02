"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Book,
  BookOpen,
  CheckCircle2,
  Download,
  Loader2,
  User,
  LogOut,
  Calendar,
  ChevronRight,
  Eye,
  Trash2,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { BrandLogo } from "@/components/SiteHeader";

interface BookItem {
  id: string;
  title: string | null;
  kidName: string;
  theme: string;
  style: string;
  status: "DRAFT" | "GENERATING" | "COMPLETED" | "ERROR";
  createdAt: string;
  pages: { id: string; imageUrl: string | null }[];
}

// En la interfaz no se habla de créditos: 5 créditos = 1 cuento por ilustrar.
const CREDITS_PER_BOOK = 5;

const STATUS: Record<BookItem["status"], { label: string; className: string }> = {
  DRAFT: { label: "Sin ilustrar", className: "bg-bg text-text-muted border-border" },
  GENERATING: { label: "Ilustrando", className: "bg-amber-50 text-amber-900 border-amber-200" },
  COMPLETED: { label: "Listo", className: "bg-[#EAF5EE] text-success border-[#BFE0CB]" },
  ERROR: { label: "Sin terminar", className: "bg-red-50 text-red-800 border-red-200" },
};

async function loadProfile() {
  const [userRes, booksRes] = await Promise.all([fetch("/api/user"), fetch("/api/books")]);
  const userData = await userRes.json();
  const booksData = await booksRes.json();
  return {
    credits: (userData.credits as number) || 0,
    books: (booksData.books as BookItem[]) || [],
  };
}

export default function ProfilePage() {
  const { data: session, status: sessionStatus } = useSession();
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    let cancelled = false;
    loadProfile()
      .then((data) => {
        if (cancelled) return;
        setCredits(data.credits);
        setBooks(data.books);
      })
      .catch((error) => console.error("Error loading data:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  const booksAvailable = Math.floor(credits / CREDITS_PER_BOOK);

  const handleDownload = async (bookId: string, type: "digital" | "print") => {
    setDownloadingId(bookId);
    try {
      const res = await fetch(`/api/books/${bookId}/pdf/download?type=${type}`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error descargando");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `libro-${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading:", error);
      alert("No se ha podido descargar el PDF. Inténtalo de nuevo.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm("¿Seguro que quieres borrar este cuento? No se puede deshacer.")) return;

    try {
      const res = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
      if (res.ok) {
        setBooks(books.filter((b) => b.id !== bookId));
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (sessionStatus === "loading" || loading) {
    return (
      <div className='min-h-screen bg-bg flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' aria-label='Cargando' />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className='min-h-screen bg-bg text-text flex items-center justify-center px-4'>
        <div className='max-w-md w-full text-center bg-bg-light border border-border card-shadow rounded-3xl p-6 sm:p-8'>
          <User className='w-14 h-14 mx-auto mb-4 text-text-muted' aria-hidden />
          <h1 className='font-display font-semibold text-2xl mb-2'>No has entrado en tu cuenta</h1>
          <p className='text-text-muted mb-6'>
            No necesitas cuenta: tus cuentos también se recuperan con el email
            que usaste.
          </p>
          <div className='flex flex-col gap-3'>
            <Link
              href='/mis-libros'
              className='min-h-12 inline-flex items-center justify-center px-6 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-colors'>
              Recuperar mis cuentos por email
            </Link>
            <Link
              href='/login'
              className='min-h-12 inline-flex items-center justify-center px-6 border-2 border-border-strong rounded-xl font-bold hover:bg-bg transition-colors'>
              Entrar en mi cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-bg text-text'>
      <header className='sticky top-0 z-40 glass'>
        <div className='max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <Link
              href='/editor'
              className='w-11 h-11 inline-flex items-center justify-center hover:bg-bg-light rounded-xl transition-colors'
              aria-label='Volver al editor'>
              <ArrowLeft className='w-5 h-5' aria-hidden />
            </Link>
            <Link href='/' aria-label='LibrosIA, inicio' className='rounded-lg'>
              <BrandLogo size='sm' />
            </Link>
          </div>

          <div className='flex items-center gap-2'>
            {session.user.role === "ADMIN" && (
              <Link
                href='/admin'
                className='w-11 h-11 inline-flex items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 transition-colors'
                title='Panel de administración'
                aria-label='Panel de administración'>
                <Shield className='w-5 h-5' aria-hidden />
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className='min-h-11 px-3 inline-flex items-center gap-2 rounded-xl bg-bg-light border border-border hover:border-red-300 hover:text-red-800 transition-colors font-semibold'>
              <LogOut className='w-5 h-5' aria-hidden />
              <span className='hidden sm:inline'>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className='max-w-5xl mx-auto px-4 py-6 sm:py-10'>
        {/* Perfil */}
        <div className='bg-bg-light rounded-3xl border border-border card-shadow p-5 sm:p-6 mb-6'>
          <div className='flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6'>
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=''
                className='w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-border'
              />
            ) : (
              <div className='w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary-soft flex items-center justify-center'>
                <User className='w-8 h-8 sm:w-10 sm:h-10 text-primary' aria-hidden />
              </div>
            )}

            <div className='flex-1 text-center sm:text-left min-w-0'>
              <h1 className='font-display font-semibold text-2xl sm:text-3xl mb-1'>
                {session.user.name || "Tu cuenta"}
              </h1>
              <p className='text-text-muted break-all'>{session.user.email}</p>
            </div>

            <div className='text-center sm:text-right'>
              <p className='font-display font-semibold text-3xl text-primary'>{booksAvailable}</p>
              <p className='text-text-muted'>
                {booksAvailable === 1 ? "cuento disponible" : "cuentos disponibles"}
              </p>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className='grid grid-cols-2 gap-3 mb-8'>
          {[
            { icon: BookOpen, value: books.length, label: "Cuentos" },
            {
              icon: CheckCircle2,
              value: books.filter((b) => b.status === "COMPLETED").length,
              label: "Listos",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className='bg-bg-light rounded-2xl border border-border p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3'>
              <div className='p-2 sm:p-2.5 rounded-xl bg-primary-soft'>
                <stat.icon className='w-5 h-5 text-primary' aria-hidden />
              </div>
              <div className='text-center sm:text-left'>
                <p className='text-xl sm:text-2xl font-bold leading-tight'>{stat.value}</p>
                <p className='text-sm text-text-muted'>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Cuentos */}
        <section aria-labelledby='mis-cuentos'>
          <h2
            id='mis-cuentos'
            className='font-display font-semibold text-2xl mb-4 flex items-center gap-2'>
            Mis cuentos
          </h2>

          {books.length === 0 ? (
            <div className='bg-bg-light rounded-3xl border border-border p-8 sm:p-12 text-center'>
              <BookOpen className='w-12 h-12 mx-auto mb-4 text-text-muted' aria-hidden />
              <h3 className='font-display font-semibold text-xl mb-2'>Todavía no tienes cuentos</h3>
              <p className='text-text-muted mb-6'>
                Escribe su nombre y lee su historia gratis.
              </p>
              <Link
                href='/editor'
                className='min-h-12 inline-flex items-center gap-2 px-6 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors'>
                Empezar su cuento gratis
                <ChevronRight className='w-5 h-5' aria-hidden />
              </Link>
            </div>
          ) : (
            <ul className='space-y-4'>
              {books.map((book) => {
                const status = STATUS[book.status] ?? STATUS.DRAFT;
                return (
                  <li
                    key={book.id}
                    className='bg-bg-light rounded-2xl border border-border card-shadow overflow-hidden'>
                    <div className='flex flex-col sm:flex-row'>
                      <div className='w-full sm:w-32 h-40 sm:h-auto shrink-0 bg-bg'>
                        {book.pages[0]?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.pages[0].imageUrl}
                            alt={`Portada de ${book.title || `la historia de ${book.kidName}`}`}
                            className='w-full h-full object-cover'
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center min-h-25'>
                            <Book className='w-8 h-8 text-text-muted' aria-hidden />
                          </div>
                        )}
                      </div>

                      <div className='flex-1 p-4 min-w-0'>
                        <div className='flex items-start justify-between mb-1 gap-2'>
                          <div className='min-w-0 flex-1'>
                            <h3 className='font-bold text-lg truncate'>
                              {book.title || `La historia de ${book.kidName}`}
                            </h3>
                            <p className='text-text-muted'>Protagonista: {book.kidName}</p>
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-0.5 text-sm font-semibold rounded-full border ${status.className}`}>
                            {status.label}
                          </span>
                        </div>

                        <p className='text-text-muted mb-2 line-clamp-1'>{book.theme}</p>

                        <p className='flex items-center gap-2 text-sm text-text-muted'>
                          <Calendar className='w-4 h-4' aria-hidden />
                          {formatDate(book.createdAt)}
                        </p>
                      </div>

                      <div className='flex sm:flex-col justify-center gap-2 p-3 sm:p-4 border-t sm:border-t-0 sm:border-l border-border'>
                        <Link
                          href={`/editor?bookId=${book.id}`}
                          className='min-h-11 flex items-center justify-center gap-2 px-3 bg-bg rounded-xl border border-border hover:bg-primary hover:border-primary hover:text-white transition-colors font-semibold flex-1 sm:flex-none'>
                          <Eye className='w-4 h-4' aria-hidden />
                          Abrir
                        </Link>

                        {book.status === "COMPLETED" && (
                          <button
                            onClick={() => handleDownload(book.id, "digital")}
                            disabled={downloadingId === book.id}
                            className='min-h-11 flex items-center justify-center gap-2 px-3 bg-bg rounded-xl border border-border hover:bg-primary hover:border-primary hover:text-white transition-colors font-semibold disabled:opacity-60 flex-1 sm:flex-none'>
                            {downloadingId === book.id ? (
                              <Loader2 className='w-4 h-4 animate-spin' aria-hidden />
                            ) : (
                              <Download className='w-4 h-4' aria-hidden />
                            )}
                            PDF
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(book.id)}
                          className='min-h-11 flex items-center justify-center gap-2 px-3 bg-bg rounded-xl border border-border text-red-800 hover:bg-red-50 hover:border-red-200 transition-colors font-semibold flex-1 sm:flex-none'
                          aria-label={`Borrar ${book.title || `la historia de ${book.kidName}`}`}>
                          <Trash2 className='w-4 h-4' aria-hidden />
                          <span className='hidden sm:inline'>Borrar</span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
