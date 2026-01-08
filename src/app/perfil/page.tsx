"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Book,
  Download,
  Loader2,
  User,
  LogOut,
  Coins,
  Calendar,
  FileText,
  ChevronRight,
  Eye,
  Trash2,
  Shield,
  ArrowLeft,
} from "lucide-react";

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

export default function ProfilePage() {
  const { data: session, status: sessionStatus } = useSession();
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    fetchData();
  }, [sessionStatus]);

  const fetchData = async () => {
    try {
      const [userRes, booksRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/books"),
      ]);

      const userData = await userRes.json();
      const booksData = await booksRes.json();

      setCredits(userData.credits || 0);
      setBooks(booksData.books || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

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
      alert("Error al descargar el PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm("¿Estás seguro de eliminar este libro?")) return;

    try {
      const res = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
      if (res.ok) {
        setBooks(books.filter((b) => b.id !== bookId));
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className='px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full'>
            Completado
          </span>
        );
      case "GENERATING":
        return (
          <span className='px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full'>
            Generando...
          </span>
        );
      case "ERROR":
        return (
          <span className='px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full'>
            Error
          </span>
        );
      default:
        return (
          <span className='px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full'>
            Borrador
          </span>
        );
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className='min-h-screen bg-bg flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className='min-h-screen bg-bg flex items-center justify-center'>
        <div className='text-center'>
          <User className='w-16 h-16 mx-auto mb-4 text-text-muted' />
          <h2 className='text-xl font-bold mb-2'>No has iniciado sesión</h2>
          <p className='text-text-muted mb-4'>
            Inicia sesión para ver tu perfil y documentos
          </p>
          <Link
            href='/login'
            className='px-6 py-3 bg-primary text-white rounded-xl font-semibold'>
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-bg'>
      {/* Header */}
      <header className='bg-bg-light border-b border-border'>
        <div className='max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between'>
          <div className='flex items-center gap-2 sm:gap-4'>
            <Link
              href='/editor'
              className='p-1.5 sm:p-2 hover:bg-surface rounded-lg transition-colors'>
              <ArrowLeft className='w-4 h-4 sm:w-5 sm:h-5' />
            </Link>
            <Link href='/' className='flex items-center gap-2'>
              <div className='w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center'>
                <Book className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
              </div>
              <span className='font-bold hidden sm:inline'>
                <span className='text-primary'>Libros</span>
                <span className='text-secondary'>IA</span>
              </span>
            </Link>
          </div>

          <div className='flex items-center gap-2 sm:gap-3'>
            {session.user.role === "ADMIN" && (
              <Link
                href='/admin'
                className='p-1.5 sm:p-2 rounded-lg bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-colors'
                title='Panel Admin'>
                <Shield className='w-4 h-4 sm:w-5 sm:h-5' />
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className='p-1.5 sm:p-2 rounded-lg bg-surface border border-border hover:border-red-500 hover:text-red-500 transition-colors'>
              <LogOut className='w-4 h-4 sm:w-5 sm:h-5' />
            </button>
          </div>
        </div>
      </header>

      <main className='max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8'>
        {/* Perfil del usuario */}
        <div className='bg-bg-light rounded-xl sm:rounded-2xl border border-border p-4 sm:p-6 mb-4 sm:mb-8'>
          <div className='flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6'>
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "Avatar"}
                className='w-16 h-16 sm:w-20 sm:h-20 rounded-full'
              />
            ) : (
              <div className='w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/20 flex items-center justify-center'>
                <User className='w-8 h-8 sm:w-10 sm:h-10 text-primary' />
              </div>
            )}

            <div className='flex-1 text-center sm:text-left'>
              <h1 className='text-xl sm:text-2xl font-bold mb-1'>
                {session.user.name || "Usuario"}
              </h1>
              <p className='text-sm sm:text-base text-text-muted'>
                {session.user.email}
              </p>
            </div>

            <div className='text-center sm:text-right'>
              <div className='flex items-center justify-center sm:justify-end gap-2 text-xl sm:text-2xl font-bold text-primary'>
                <Coins className='w-5 h-5 sm:w-6 sm:h-6' />
                {credits}
              </div>
              <p className='text-xs sm:text-sm text-text-muted'>
                créditos disponibles
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className='grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8'>
          <div className='bg-bg-light rounded-lg sm:rounded-xl border border-border p-3 sm:p-4'>
            <div className='flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3'>
              <div className='p-2 sm:p-3 rounded-lg bg-primary/20'>
                <FileText className='w-4 h-4 sm:w-5 sm:h-5 text-primary' />
              </div>
              <div className='text-center sm:text-left'>
                <p className='text-lg sm:text-2xl font-bold'>{books.length}</p>
                <p className='text-[10px] sm:text-sm text-text-muted'>Libros</p>
              </div>
            </div>
          </div>

          <div className='bg-bg-light rounded-lg sm:rounded-xl border border-border p-3 sm:p-4'>
            <div className='flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3'>
              <div className='p-2 sm:p-3 rounded-lg bg-green-500/20'>
                <Book className='w-4 h-4 sm:w-5 sm:h-5 text-green-400' />
              </div>
              <div className='text-center sm:text-left'>
                <p className='text-lg sm:text-2xl font-bold'>
                  {books.filter((b) => b.status === "COMPLETED").length}
                </p>
                <p className='text-[10px] sm:text-sm text-text-muted'>
                  Completos
                </p>
              </div>
            </div>
          </div>

          <div className='bg-bg-light rounded-lg sm:rounded-xl border border-border p-3 sm:p-4'>
            <div className='flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3'>
              <div className='p-2 sm:p-3 rounded-lg bg-secondary/20'>
                <Coins className='w-4 h-4 sm:w-5 sm:h-5 text-secondary' />
              </div>
              <div className='text-center sm:text-left'>
                <p className='text-lg sm:text-2xl font-bold'>{credits}</p>
                <p className='text-[10px] sm:text-sm text-text-muted'>
                  Créditos
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Historial de libros */}
        <div>
          <h2 className='text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2'>
            <Book className='w-4 h-4 sm:w-5 sm:h-5' />
            Mis libros
          </h2>

          {books.length === 0 ? (
            <div className='bg-bg-light rounded-xl sm:rounded-2xl border border-border p-8 sm:p-12 text-center'>
              <Book className='w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-text-muted opacity-50' />
              <h3 className='text-base sm:text-lg font-bold mb-2'>
                No tienes libros todavía
              </h3>
              <p className='text-sm sm:text-base text-text-muted mb-4 sm:mb-6'>
                Crea tu primer libro personalizado con inteligencia artificial
              </p>
              <Link
                href='/editor'
                className='inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:bg-primary-hover transition-colors'>
                Crear mi primer libro
                <ChevronRight className='w-4 h-4' />
              </Link>
            </div>
          ) : (
            <div className='space-y-3 sm:space-y-4'>
              {books.map((book) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='bg-bg-light rounded-lg sm:rounded-xl border border-border overflow-hidden'>
                  <div className='flex flex-col sm:flex-row'>
                    {/* Miniatura */}
                    <div className='w-full sm:w-28 md:w-32 h-32 sm:h-auto flex-shrink-0 bg-surface'>
                      {book.pages[0]?.imageUrl ? (
                        <img
                          src={book.pages[0].imageUrl}
                          alt={book.title || "Portada"}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center min-h-[100px]'>
                          <Book className='w-8 h-8 text-text-muted' />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className='flex-1 p-3 sm:p-4'>
                      <div className='flex items-start justify-between mb-1 sm:mb-2 gap-2'>
                        <div className='min-w-0 flex-1'>
                          <h3 className='font-bold text-sm sm:text-lg truncate'>
                            {book.title || `Historia de ${book.kidName}`}
                          </h3>
                          <p className='text-xs sm:text-sm text-text-muted'>
                            Protagonista: {book.kidName}
                          </p>
                        </div>
                        {getStatusBadge(book.status)}
                      </div>

                      <p className='text-xs sm:text-sm text-text-muted mb-2 sm:mb-3 line-clamp-1'>
                        {book.theme}
                      </p>

                      <div className='flex items-center gap-2 text-[10px] sm:text-xs text-text-muted'>
                        <Calendar className='w-3 h-3' />
                        <span className='hidden xs:inline'>
                          {formatDate(book.createdAt)}
                        </span>
                        <span className='xs:hidden'>
                          {new Date(book.createdAt).toLocaleDateString()}
                        </span>
                        <span className='mx-1 sm:mx-2'>•</span>
                        {book.pages.length} págs
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className='flex sm:flex-col justify-center gap-2 p-3 sm:p-4 border-t sm:border-t-0 sm:border-l border-border'>
                      <Link
                        href={`/editor?bookId=${book.id}`}
                        className='flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 bg-surface rounded-lg hover:bg-primary hover:text-white transition-colors text-xs sm:text-sm flex-1 sm:flex-none'>
                        <Eye className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                        <span>Ver</span>
                      </Link>

                      {book.status === "COMPLETED" && (
                        <button
                          onClick={() => handleDownload(book.id, "digital")}
                          disabled={downloadingId === book.id}
                          className='flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 bg-surface rounded-lg hover:bg-primary hover:text-white transition-colors text-xs sm:text-sm disabled:opacity-50 flex-1 sm:flex-none'>
                          {downloadingId === book.id ? (
                            <Loader2 className='w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin' />
                          ) : (
                            <Download className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                          )}
                          <span>PDF</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(book.id)}
                        className='flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 bg-surface rounded-lg hover:bg-red-500 hover:text-white transition-colors text-xs sm:text-sm text-red-400 flex-1 sm:flex-none'>
                        <Trash2 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                        <span className='hidden sm:inline'>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
