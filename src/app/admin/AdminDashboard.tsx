"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Book,
  Users,
  CreditCard,
  DollarSign,
  ArrowLeft,
  Shield,
  Plus,
  Minus,
  Search,
  Crown,
  Eye,
  X,
  Coins,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  RefreshCw,
  Download,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface UserData {
  id: string;
  email: string | null;
  name: string | null;
  sessionId: string | null;
  credits: number;
  role: "USER" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
  _count: {
    books: number;
    payments: number;
  };
}

interface BookData {
  id: string;
  title: string | null;
  kidName: string;
  theme: string;
  status: "DRAFT" | "GENERATING" | "COMPLETED" | "ERROR";
  createdAt: Date;
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
  _count: {
    pages: number;
  };
}

interface PaymentData {
  id: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  creditsGranted: number;
  createdAt: Date;
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

interface AdminDashboardProps {
  users: UserData[];
  books: BookData[];
  recentPayments: PaymentData[];
  stats: {
    totalUsers: number;
    totalBooks: number;
    completedBooks: number;
    totalPayments: number;
    totalRevenue: number;
    totalCreditsInSystem: number;
  };
}

type TabType = "users" | "books" | "payments";

export default function AdminDashboard({
  users,
  books,
  recentPayments,
  stats,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(10);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userDetailModal, setUserDetailModal] = useState<UserData | null>(null);
  const [bookDetailModal, setBookDetailModal] = useState<BookData | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  // Filter functions
  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.sessionId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBooks = books.filter(
    (book) =>
      book.kidName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.theme.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayments = recentPayments.filter(
    (payment) =>
      payment.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCredits = async (userId: string, amount: number) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert("Error al actualizar créditos");
      }
    } catch (error) {
      alert("Error al actualizar créditos");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    if (
      !confirm(
        `¿Seguro que quieres ${
          currentRole === "ADMIN" ? "quitar" : "dar"
        } permisos de admin?`
      )
    ) {
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: currentRole === "ADMIN" ? "USER" : "ADMIN",
        }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert("Error al cambiar rol");
      }
    } catch (error) {
      alert("Error al cambiar rol");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-500 text-xs font-medium rounded'>
            <CheckCircle className='w-3 h-3' />
            Completado
          </span>
        );
      case "GENERATING":
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-500 text-xs font-medium rounded'>
            <RefreshCw className='w-3 h-3 animate-spin' />
            Generando
          </span>
        );
      case "DRAFT":
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-medium rounded'>
            <FileText className='w-3 h-3' />
            Borrador
          </span>
        );
      case "ERROR":
      case "FAILED":
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-500 text-xs font-medium rounded'>
            <XCircle className='w-3 h-3' />
            Error
          </span>
        );
      case "PENDING":
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-medium rounded'>
            <Clock className='w-3 h-3' />
            Pendiente
          </span>
        );
      default:
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 bg-gray-500/20 text-gray-500 text-xs font-medium rounded'>
            {status}
          </span>
        );
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get user's books for modal
  const getUserBooks = (userId: string) => {
    return books.filter((book) => book.user.id === userId);
  };

  const getUserPayments = (userId: string) => {
    return recentPayments.filter((payment) => payment.user.id === userId);
  };

  // Admin book actions
  const handleDownloadPdf = async (
    bookId: string,
    type: "digital" | "print"
  ) => {
    setDownloadingPdf(`${bookId}-${type}`);
    try {
      const res = await fetch(`/api/books/${bookId}/pdf/download?type=${type}`);
      if (!res.ok) throw new Error("Error downloading PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `libro-${bookId.slice(0, 8)}-${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert("Error al descargar el PDF");
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (
      !confirm(
        "¿Seguro que quieres eliminar este libro? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", bookId }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert("Error al eliminar el libro");
      }
    } catch (error) {
      alert("Error al eliminar el libro");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className='min-h-screen bg-bg'>
      {/* Header */}
      <header className='bg-bg-light border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link
              href='/editor'
              className='p-2 rounded-lg bg-surface hover:bg-border transition-colors'>
              <ArrowLeft className='w-5 h-5' />
            </Link>
            <div className='flex items-center gap-2'>
              <Shield className='w-6 h-6 text-amber-500' />
              <h1 className='text-xl font-bold'>Panel de Administración</h1>
            </div>
          </div>
          <Link href='/' className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-lg bg-primary flex items-center justify-center'>
              <Book className='w-5 h-5 text-white' />
            </div>
            <span className='font-bold'>
              <span className='text-primary'>Libros</span>
              <span className='text-secondary'>IA</span>
            </span>
          </Link>
        </div>
      </header>

      <div className='max-w-7xl mx-auto px-4 py-8'>
        {/* Stats Cards */}
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8'>
          <div className='bg-surface border border-border rounded-xl p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center'>
                <Users className='w-5 h-5 text-blue-500' />
              </div>
              <div>
                <p className='text-xs text-text-muted'>Usuarios</p>
                <p className='text-xl font-bold'>{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className='bg-surface border border-border rounded-xl p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center'>
                <Book className='w-5 h-5 text-purple-500' />
              </div>
              <div>
                <p className='text-xs text-text-muted'>Libros</p>
                <p className='text-xl font-bold'>{stats.totalBooks}</p>
              </div>
            </div>
          </div>

          <div className='bg-surface border border-border rounded-xl p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center'>
                <CheckCircle className='w-5 h-5 text-green-500' />
              </div>
              <div>
                <p className='text-xs text-text-muted'>Completados</p>
                <p className='text-xl font-bold'>{stats.completedBooks}</p>
              </div>
            </div>
          </div>

          <div className='bg-surface border border-border rounded-xl p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center'>
                <CreditCard className='w-5 h-5 text-emerald-500' />
              </div>
              <div>
                <p className='text-xs text-text-muted'>Pagos</p>
                <p className='text-xl font-bold'>{stats.totalPayments}</p>
              </div>
            </div>
          </div>

          <div className='bg-surface border border-border rounded-xl p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center'>
                <DollarSign className='w-5 h-5 text-amber-500' />
              </div>
              <div>
                <p className='text-xs text-text-muted'>Ingresos</p>
                <p className='text-xl font-bold'>
                  €{stats.totalRevenue.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-surface border border-border rounded-xl p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center'>
                <Coins className='w-5 h-5 text-primary' />
              </div>
              <div>
                <p className='text-xs text-text-muted'>Créditos</p>
                <p className='text-xl font-bold'>
                  {stats.totalCreditsInSystem}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex gap-2 mb-4'>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-primary text-white"
                : "bg-surface hover:bg-border text-text"
            }`}>
            <Users className='w-4 h-4' />
            Usuarios ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("books")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === "books"
                ? "bg-primary text-white"
                : "bg-surface hover:bg-border text-text"
            }`}>
            <Book className='w-4 h-4' />
            Libros ({books.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === "payments"
                ? "bg-primary text-white"
                : "bg-surface hover:bg-border text-text"
            }`}>
            <CreditCard className='w-4 h-4' />
            Pagos ({recentPayments.length})
          </button>
        </div>

        {/* Main Content */}
        <div className='bg-surface border border-border rounded-xl overflow-hidden'>
          <div className='p-4 border-b border-border flex items-center justify-between'>
            <h2 className='text-lg font-bold'>
              {activeTab === "users" && "Gestión de Usuarios"}
              {activeTab === "books" && "Libros Generados"}
              {activeTab === "payments" && "Historial de Pagos"}
            </h2>
            <div className='relative'>
              <Search className='w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted' />
              <input
                type='text'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Buscar...'
                className='pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:border-primary outline-none w-64'
              />
            </div>
          </div>

          {/* Users Table */}
          {activeTab === "users" && (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-bg'>
                  <tr>
                    <th className='text-left px-4 py-3 text-sm font-medium text-text-muted'>
                      Usuario
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Tipo
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Créditos
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Libros
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Pagos
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Rol
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Creado
                    </th>
                    <th className='text-right px-4 py-3 text-sm font-medium text-text-muted'>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className='hover:bg-bg/50'>
                      <td className='px-4 py-3'>
                        <div>
                          <p className='font-medium'>
                            {user.name || user.email || "Usuario anónimo"}
                          </p>
                          <p className='text-xs text-text-muted'>
                            {user.email ||
                              `Session: ${user.sessionId?.slice(0, 8)}...`}
                          </p>
                        </div>
                      </td>
                      <td className='px-4 py-3 text-center'>
                        {user.email ? (
                          <span className='px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded'>
                            Registrado
                          </span>
                        ) : (
                          <span className='px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded'>
                            Anónimo
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <span className='font-semibold text-primary'>
                          {user.credits}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-center'>
                        {user._count.books}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        {user._count.payments}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        {user.role === "ADMIN" ? (
                          <span className='inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-medium rounded'>
                            <Crown className='w-3 h-3' />
                            Admin
                          </span>
                        ) : (
                          <span className='px-2 py-1 bg-surface text-text-muted text-xs rounded'>
                            Usuario
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-center text-xs text-text-muted'>
                        {formatDate(user.createdAt)}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            onClick={() => setUserDetailModal(user)}
                            className='p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 rounded transition-colors'
                            title='Ver detalles'>
                            <Eye className='w-4 h-4' />
                          </button>
                          {selectedUser === user.id ? (
                            <div className='flex items-center gap-1'>
                              <input
                                type='number'
                                value={creditAmount}
                                onChange={(e) =>
                                  setCreditAmount(parseInt(e.target.value) || 0)
                                }
                                className='w-16 px-2 py-1 bg-bg border border-border rounded text-center text-sm'
                              />
                              <button
                                onClick={() =>
                                  handleAddCredits(user.id, creditAmount)
                                }
                                disabled={isUpdating}
                                className='p-1.5 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50'>
                                <Plus className='w-4 h-4' />
                              </button>
                              <button
                                onClick={() =>
                                  handleAddCredits(user.id, -creditAmount)
                                }
                                disabled={isUpdating}
                                className='p-1.5 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50'>
                                <Minus className='w-4 h-4' />
                              </button>
                              <button
                                onClick={() => setSelectedUser(null)}
                                className='p-1.5 bg-surface hover:bg-border rounded'>
                                <X className='w-4 h-4' />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => setSelectedUser(user.id)}
                                className='px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium rounded transition-colors'>
                                Créditos
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleAdmin(user.id, user.role)
                                }
                                disabled={isUpdating}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                  user.role === "ADMIN"
                                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-500"
                                    : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-500"
                                }`}>
                                {user.role === "ADMIN" ? "Quitar" : "Admin"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className='p-8 text-center text-text-muted'>
                  No se encontraron usuarios
                </div>
              )}
            </div>
          )}

          {/* Books Table */}
          {activeTab === "books" && (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-bg'>
                  <tr>
                    <th className='text-left px-4 py-3 text-sm font-medium text-text-muted'>
                      Libro
                    </th>
                    <th className='text-left px-4 py-3 text-sm font-medium text-text-muted'>
                      Usuario
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Páginas
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Estado
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Creado
                    </th>
                    <th className='text-right px-4 py-3 text-sm font-medium text-text-muted'>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className='hover:bg-bg/50'>
                      <td className='px-4 py-3'>
                        <div>
                          <p className='font-medium'>
                            {book.title || `Libro de ${book.kidName}`}
                          </p>
                          <p className='text-xs text-text-muted'>
                            Protagonista: {book.kidName}
                          </p>
                          <p className='text-xs text-text-muted/70 line-clamp-1'>
                            {book.theme}
                          </p>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <p className='text-sm'>
                          {book.user.name || book.user.email || "Anónimo"}
                        </p>
                        <p className='text-xs text-text-muted'>
                          {book.user.email}
                        </p>
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <span className='inline-flex items-center gap-1'>
                          <FileText className='w-3 h-3 text-text-muted' />
                          {book._count.pages}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-center'>
                        {getStatusBadge(book.status)}
                      </td>
                      <td className='px-4 py-3 text-center text-xs text-text-muted'>
                        {formatDate(book.createdAt)}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            onClick={() => setBookDetailModal(book)}
                            className='p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 rounded transition-colors'
                            title='Ver detalles'>
                            <Eye className='w-4 h-4' />
                          </button>
                          {book.status === "COMPLETED" && (
                            <button
                              onClick={() =>
                                handleDownloadPdf(book.id, "digital")
                              }
                              disabled={downloadingPdf === `${book.id}-digital`}
                              className='p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded transition-colors disabled:opacity-50'
                              title='Descargar PDF'>
                              {downloadingPdf === `${book.id}-digital` ? (
                                <RefreshCw className='w-4 h-4 animate-spin' />
                              ) : (
                                <Download className='w-4 h-4' />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            disabled={isUpdating}
                            className='p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded transition-colors disabled:opacity-50'
                            title='Eliminar libro'>
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredBooks.length === 0 && (
                <div className='p-8 text-center text-text-muted'>
                  No se encontraron libros
                </div>
              )}
            </div>
          )}

          {/* Payments Table */}
          {activeTab === "payments" && (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-bg'>
                  <tr>
                    <th className='text-left px-4 py-3 text-sm font-medium text-text-muted'>
                      ID
                    </th>
                    <th className='text-left px-4 py-3 text-sm font-medium text-text-muted'>
                      Usuario
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Cantidad
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Créditos
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Estado
                    </th>
                    <th className='text-center px-4 py-3 text-sm font-medium text-text-muted'>
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className='hover:bg-bg/50'>
                      <td className='px-4 py-3'>
                        <p className='text-sm font-mono'>
                          {payment.id.slice(0, 12)}...
                        </p>
                      </td>
                      <td className='px-4 py-3'>
                        <p className='text-sm'>
                          {payment.user.name || payment.user.email || "Anónimo"}
                        </p>
                        <p className='text-xs text-text-muted'>
                          {payment.user.email}
                        </p>
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <span className='font-semibold'>
                          €{(payment.amount / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <span className='inline-flex items-center gap-1 text-primary font-semibold'>
                          <Coins className='w-3 h-3' />+{payment.creditsGranted}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-center'>
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className='px-4 py-3 text-center text-xs text-text-muted'>
                        {formatDate(payment.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPayments.length === 0 && (
                <div className='p-8 text-center text-text-muted'>
                  No se encontraron pagos
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {userDetailModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4'
          onClick={() => setUserDetailModal(null)}>
          <div
            className='bg-bg-light rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto'
            onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center'>
                  <Users className='w-6 h-6 text-primary' />
                </div>
                <div>
                  <h2 className='text-xl font-bold'>
                    {userDetailModal.name ||
                      userDetailModal.email ||
                      "Usuario anónimo"}
                  </h2>
                  <p className='text-sm text-text-muted'>
                    {userDetailModal.email || userDetailModal.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserDetailModal(null)}
                className='p-2 hover:bg-surface rounded-lg transition-colors'>
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* User Stats */}
            <div className='grid grid-cols-4 gap-4 mb-6'>
              <div className='bg-surface rounded-lg p-4 text-center'>
                <p className='text-2xl font-bold text-primary'>
                  {userDetailModal.credits}
                </p>
                <p className='text-xs text-text-muted'>Créditos</p>
              </div>
              <div className='bg-surface rounded-lg p-4 text-center'>
                <p className='text-2xl font-bold'>
                  {userDetailModal._count.books}
                </p>
                <p className='text-xs text-text-muted'>Libros</p>
              </div>
              <div className='bg-surface rounded-lg p-4 text-center'>
                <p className='text-2xl font-bold'>
                  {userDetailModal._count.payments}
                </p>
                <p className='text-xs text-text-muted'>Pagos</p>
              </div>
              <div className='bg-surface rounded-lg p-4 text-center'>
                <p className='text-2xl font-bold'>
                  {userDetailModal.role === "ADMIN" ? (
                    <Crown className='w-6 h-6 text-amber-500 mx-auto' />
                  ) : (
                    <Users className='w-6 h-6 text-text-muted mx-auto' />
                  )}
                </p>
                <p className='text-xs text-text-muted'>
                  {userDetailModal.role}
                </p>
              </div>
            </div>

            {/* User Info */}
            <div className='bg-surface rounded-lg p-4 mb-6'>
              <h3 className='font-semibold mb-3'>Información</h3>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <p className='text-text-muted'>ID</p>
                  <p className='font-mono text-xs'>{userDetailModal.id}</p>
                </div>
                <div>
                  <p className='text-text-muted'>Session ID</p>
                  <p className='font-mono text-xs'>
                    {userDetailModal.sessionId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className='text-text-muted'>Creado</p>
                  <p>{formatDate(userDetailModal.createdAt)}</p>
                </div>
                <div>
                  <p className='text-text-muted'>Última actualización</p>
                  <p>{formatDate(userDetailModal.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* User's Books */}
            <div className='mb-6'>
              <h3 className='font-semibold mb-3 flex items-center gap-2'>
                <Book className='w-4 h-4' />
                Libros ({getUserBooks(userDetailModal.id).length})
              </h3>
              {getUserBooks(userDetailModal.id).length > 0 ? (
                <div className='space-y-2'>
                  {getUserBooks(userDetailModal.id).map((book) => (
                    <div
                      key={book.id}
                      className='bg-surface rounded-lg p-3 flex items-center justify-between'>
                      <div>
                        <p className='font-medium'>
                          {book.title || `Libro de ${book.kidName}`}
                        </p>
                        <p className='text-xs text-text-muted'>
                          {book.theme.slice(0, 50)}...
                        </p>
                      </div>
                      <div className='flex items-center gap-3'>
                        <span className='text-xs text-text-muted'>
                          {book._count.pages} páginas
                        </span>
                        {getStatusBadge(book.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-text-muted text-sm'>
                  No ha creado ningún libro
                </p>
              )}
            </div>

            {/* User's Payments */}
            <div>
              <h3 className='font-semibold mb-3 flex items-center gap-2'>
                <CreditCard className='w-4 h-4' />
                Pagos ({getUserPayments(userDetailModal.id).length})
              </h3>
              {getUserPayments(userDetailModal.id).length > 0 ? (
                <div className='space-y-2'>
                  {getUserPayments(userDetailModal.id).map((payment) => (
                    <div
                      key={payment.id}
                      className='bg-surface rounded-lg p-3 flex items-center justify-between'>
                      <div>
                        <p className='font-medium'>
                          €{(payment.amount / 100).toFixed(2)}
                        </p>
                        <p className='text-xs text-text-muted'>
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>
                      <div className='flex items-center gap-3'>
                        <span className='text-primary font-semibold'>
                          +{payment.creditsGranted} créditos
                        </span>
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-text-muted text-sm'>
                  No ha realizado ningún pago
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className='mt-6 pt-6 border-t border-border flex gap-3'>
              <button
                onClick={() => {
                  setSelectedUser(userDetailModal.id);
                  setUserDetailModal(null);
                }}
                className='flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors'>
                Gestionar créditos
              </button>
              <button
                onClick={() => {
                  handleToggleAdmin(userDetailModal.id, userDetailModal.role);
                  setUserDetailModal(null);
                }}
                className={`flex-1 py-2 font-semibold rounded-lg transition-colors ${
                  userDetailModal.role === "ADMIN"
                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-500"
                    : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-500"
                }`}>
                {userDetailModal.role === "ADMIN"
                  ? "Quitar Admin"
                  : "Hacer Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Detail Modal */}
      {bookDetailModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4'
          onClick={() => setBookDetailModal(null)}>
          <div
            className='bg-bg-light rounded-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto'
            onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center'>
                  <Book className='w-6 h-6 text-purple-500' />
                </div>
                <div>
                  <h2 className='text-xl font-bold'>
                    {bookDetailModal.title ||
                      `Libro de ${bookDetailModal.kidName}`}
                  </h2>
                  <p className='text-sm text-text-muted'>
                    Protagonista: {bookDetailModal.kidName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBookDetailModal(null)}
                className='p-2 hover:bg-surface rounded-lg transition-colors'>
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Book Info */}
            <div className='bg-surface rounded-lg p-4 mb-6'>
              <h3 className='font-semibold mb-3'>Información del libro</h3>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <p className='text-text-muted'>ID</p>
                  <p className='font-mono text-xs'>{bookDetailModal.id}</p>
                </div>
                <div>
                  <p className='text-text-muted'>Estado</p>
                  <div className='mt-1'>
                    {getStatusBadge(bookDetailModal.status)}
                  </div>
                </div>
                <div>
                  <p className='text-text-muted'>Usuario</p>
                  <p>
                    {bookDetailModal.user.name ||
                      bookDetailModal.user.email ||
                      "Anónimo"}
                  </p>
                </div>
                <div>
                  <p className='text-text-muted'>Creado</p>
                  <p>{formatDate(bookDetailModal.createdAt)}</p>
                </div>
                <div className='col-span-2'>
                  <p className='text-text-muted'>Tema</p>
                  <p>{bookDetailModal.theme}</p>
                </div>
              </div>
            </div>

            {/* Book Stats */}
            <div className='grid grid-cols-3 gap-4 mb-6'>
              <div className='bg-surface rounded-lg p-4 text-center'>
                <p className='text-2xl font-bold text-purple-500'>
                  {bookDetailModal._count.pages}
                </p>
                <p className='text-xs text-text-muted'>Páginas</p>
              </div>
              <div className='bg-surface rounded-lg p-4 text-center'>
                <p className='text-2xl font-bold text-blue-500'>
                  {bookDetailModal.status === "COMPLETED" ? "Sí" : "No"}
                </p>
                <p className='text-xs text-text-muted'>Con imágenes</p>
              </div>
              <div className='bg-surface rounded-lg p-4 text-center'>
                <p className='text-2xl font-bold text-green-500'>
                  {bookDetailModal.status === "COMPLETED"
                    ? "Listo"
                    : "Pendiente"}
                </p>
                <p className='text-xs text-text-muted'>PDF</p>
              </div>
            </div>

            {/* Actions */}
            <div className='flex gap-3'>
              {bookDetailModal.status === "COMPLETED" && (
                <>
                  <button
                    onClick={() =>
                      handleDownloadPdf(bookDetailModal.id, "digital")
                    }
                    disabled={
                      downloadingPdf === `${bookDetailModal.id}-digital`
                    }
                    className='flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50'>
                    {downloadingPdf === `${bookDetailModal.id}-digital` ? (
                      <RefreshCw className='w-5 h-5 animate-spin' />
                    ) : (
                      <Download className='w-5 h-5' />
                    )}
                    Descargar PDF
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadPdf(bookDetailModal.id, "print")
                    }
                    disabled={downloadingPdf === `${bookDetailModal.id}-print`}
                    className='flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50'>
                    {downloadingPdf === `${bookDetailModal.id}-print` ? (
                      <RefreshCw className='w-5 h-5 animate-spin' />
                    ) : (
                      <ImageIcon className='w-5 h-5' />
                    )}
                    PDF Impresión
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  handleDeleteBook(bookDetailModal.id);
                  setBookDetailModal(null);
                }}
                disabled={isUpdating}
                className='py-3 px-6 bg-red-500/20 hover:bg-red-500/30 text-red-500 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50'>
                <Trash2 className='w-5 h-5' />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
