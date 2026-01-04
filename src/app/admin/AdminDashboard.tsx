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
} from "lucide-react";

interface UserData {
  id: string;
  email: string | null;
  name: string | null;
  credits: number;
  role: "USER" | "ADMIN";
  createdAt: Date;
  _count: {
    books: number;
    payments: number;
  };
}

interface AdminDashboardProps {
  users: UserData[];
  stats: {
    totalUsers: number;
    totalBooks: number;
    totalPayments: number;
    totalRevenue: number;
  };
}

export default function AdminDashboard({ users, stats }: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(10);
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase())
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
    if (!confirm(`¿Seguro que quieres ${currentRole === "ADMIN" ? "quitar" : "dar"} permisos de admin?`)) {
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

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-bg-light border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/editor"
              className="p-2 rounded-lg bg-surface hover:bg-border transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-500" />
              <h1 className="text-xl font-bold">Panel de Administración</h1>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Book className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">
              <span className="text-primary">Libros</span>
              <span className="text-secondary">IA</span>
            </span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Usuarios</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Book className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Libros creados</p>
                <p className="text-2xl font-bold">{stats.totalBooks}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Pagos</p>
                <p className="text-2xl font-bold">{stats.totalPayments}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Ingresos</p>
                <p className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-bold">Usuarios</h2>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por email, nombre o ID..."
                className="pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:border-primary outline-none w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">
                    Usuario
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-text-muted">
                    Créditos
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-text-muted">
                    Libros
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-text-muted">
                    Pagos
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-text-muted">
                    Rol
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-muted">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-bg/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">
                          {user.name || user.email || "Usuario anónimo"}
                        </p>
                        <p className="text-xs text-text-muted">
                          {user.email || user.id.slice(0, 12) + "..."}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-primary">
                        {user.credits}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user._count.books}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user._count.payments}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-medium rounded">
                          <Crown className="w-3 h-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-surface text-text-muted text-xs rounded">
                          Usuario
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {selectedUser === user.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={creditAmount}
                              onChange={(e) =>
                                setCreditAmount(parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 bg-bg border border-border rounded text-center text-sm"
                            />
                            <button
                              onClick={() =>
                                handleAddCredits(user.id, creditAmount)
                              }
                              disabled={isUpdating}
                              className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleAddCredits(user.id, -creditAmount)
                              }
                              disabled={isUpdating}
                              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedUser(null)}
                              className="p-1.5 bg-surface hover:bg-border rounded"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedUser(user.id)}
                              className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium rounded transition-colors"
                            >
                              Créditos
                            </button>
                            <button
                              onClick={() => handleToggleAdmin(user.id, user.role)}
                              disabled={isUpdating}
                              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                                user.role === "ADMIN"
                                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-500"
                                  : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-500"
                              }`}
                            >
                              {user.role === "ADMIN" ? "Quitar Admin" : "Hacer Admin"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-text-muted">
              No se encontraron usuarios
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
