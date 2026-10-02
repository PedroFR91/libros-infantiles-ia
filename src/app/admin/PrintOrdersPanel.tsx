"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Save, ExternalLink } from "lucide-react";

type PrintOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED";

interface ShippingAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  state?: string | null;
  country?: string | null;
}

interface PrintOrderData {
  id: string;
  createdAt: string;
  amount: number;
  status: PrintOrderStatus;
  email: string | null;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: ShippingAddress | null;
  provider: string | null;
  providerOrderId: string | null;
  trackingUrl: string | null;
  notes: string | null;
  book: { id: string; title: string | null; kidName: string };
  user: { id: string; email: string | null };
}

const STATUS_OPTIONS: { value: PrintOrderStatus; label: string }[] = [
  { value: "PENDING_PAYMENT", label: "Pendiente de pago" },
  { value: "PAID", label: "Pagado" },
  { value: "IN_PRODUCTION", label: "En producción" },
  { value: "SHIPPED", label: "Enviado" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "CANCELED", label: "Cancelado" },
];

const STATUS_STYLES: Record<PrintOrderStatus, string> = {
  PENDING_PAYMENT: "bg-gray-500/20 text-gray-400",
  PAID: "bg-amber-500/20 text-amber-500",
  IN_PRODUCTION: "bg-blue-500/20 text-blue-500",
  SHIPPED: "bg-purple-500/20 text-purple-500",
  DELIVERED: "bg-green-500/20 text-green-500",
  CANCELED: "bg-red-500/20 text-red-500",
};

function formatAddress(a: ShippingAddress | null): string[] {
  if (!a) return ["—"];
  const cityLine = [a.postal_code, a.city].filter(Boolean).join(" ");
  const regionLine = [a.state, a.country].filter(Boolean).join(", ");
  const lines = [a.line1, a.line2, cityLine, regionLine].filter(
    (l): l is string => Boolean(l && l.trim()),
  );
  return lines.length ? lines : ["—"];
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function OrderRow({
  order,
  onSaved,
}: {
  order: PrintOrderData;
  onSaved: (order: PrintOrderData) => void;
}) {
  const [status, setStatus] = useState<PrintOrderStatus>(order.status);
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const dirty =
    status !== order.status ||
    trackingUrl !== (order.trackingUrl ?? "") ||
    notes !== (order.notes ?? "");

  const handleSave = async () => {
    if (
      status === "SHIPPED" &&
      order.status !== "SHIPPED" &&
      !trackingUrl.trim() &&
      !confirm(
        "Vas a marcarlo como enviado sin enlace de seguimiento: no se avisará al cliente. ¿Continuar?",
      )
    ) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/print-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          status,
          trackingUrl: trackingUrl.trim(),
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: json.error || "Error al guardar" });
        return;
      }
      onSaved(json.order);
      if (json.emailSent) {
        setMessage({ ok: true, text: "Guardado · email de envío mandado" });
      } else if (json.emailSkippedReason) {
        setMessage({ ok: false, text: `Guardado · ${json.emailSkippedReason}` });
      } else {
        setMessage({ ok: true, text: "Guardado" });
      }
    } catch {
      setMessage({ ok: false, text: "Error al guardar" });
    } finally {
      setSaving(false);
    }
  };

  const recipientEmail = order.email || order.user.email;

  return (
    <tr className='hover:bg-bg/50 align-top'>
      <td className='px-3 py-3 text-xs text-text-muted whitespace-nowrap'>
        {formatDate(order.createdAt)}
        <p className='font-mono text-[10px] mt-1'>{order.id.slice(0, 10)}…</p>
        <p className='text-text font-semibold mt-1'>
          €{(order.amount / 100).toFixed(2)}
        </p>
      </td>
      <td className='px-3 py-3 min-w-40'>
        <p className='font-medium text-sm'>
          {order.book.title || `Libro de ${order.book.kidName}`}
        </p>
        <p className='text-xs text-text-muted'>
          Protagonista: {order.book.kidName}
        </p>
        <div className='flex flex-col gap-1 mt-2'>
          <a
            href={`/api/books/${order.book.id}/print-files?part=interior`}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 text-xs text-primary hover:underline'>
            <Download className='w-3 h-3' />
            Interior (PDF)
          </a>
          <a
            href={`/api/books/${order.book.id}/print-files?part=cover`}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 text-xs text-primary hover:underline'>
            <Download className='w-3 h-3' />
            Cubierta (PDF)
          </a>
        </div>
      </td>
      <td className='px-3 py-3 min-w-50 text-sm'>
        <p className='font-medium'>{order.shippingName || "—"}</p>
        <address className='not-italic text-xs text-text-muted leading-relaxed'>
          {formatAddress(order.shippingAddress).map((line, i) => (
            <span key={i} className='block'>
              {line}
            </span>
          ))}
        </address>
        {recipientEmail && (
          <p className='text-xs text-text-muted mt-1 break-all'>
            {recipientEmail}
          </p>
        )}
      </td>
      <td className='px-3 py-3 text-sm whitespace-nowrap'>
        {order.shippingPhone ? (
          <a href={`tel:${order.shippingPhone}`} className='hover:underline'>
            {order.shippingPhone}
          </a>
        ) : (
          "—"
        )}
      </td>
      <td className='px-3 py-3'>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PrintOrderStatus)}
          aria-label='Estado del pedido'
          className={`px-2 py-1 rounded text-xs font-medium border border-border outline-none focus:border-primary ${STATUS_STYLES[status]}`}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className='bg-bg text-text'>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className='px-3 py-3 min-w-55'>
        <div className='flex items-center gap-1'>
          <input
            type='url'
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder='https://…'
            aria-label='URL de seguimiento'
            className='w-full px-2 py-1 bg-bg border border-border rounded text-xs focus:border-primary outline-none'
          />
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='p-1 text-text-muted hover:text-text'
              title='Abrir seguimiento'>
              <ExternalLink className='w-3.5 h-3.5' />
            </a>
          )}
        </div>
        {order.provider && (
          <p className='text-[10px] text-text-muted mt-1'>
            {order.provider}
            {order.providerOrderId ? ` · ${order.providerOrderId}` : ""}
          </p>
        )}
      </td>
      <td className='px-3 py-3 min-w-50'>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={2000}
          aria-label='Notas internas'
          placeholder='Notas internas'
          className='w-full px-2 py-1 bg-bg border border-border rounded text-xs focus:border-primary outline-none resize-y'
        />
      </td>
      <td className='px-3 py-3 text-right'>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className='inline-flex items-center gap-1 px-2 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded transition-colors disabled:opacity-40'>
          {saving ? (
            <RefreshCw className='w-3.5 h-3.5 animate-spin' />
          ) : (
            <Save className='w-3.5 h-3.5' />
          )}
          Guardar
        </button>
        {message && (
          <p
            className={`text-[10px] mt-1 max-w-35 ml-auto ${
              message.ok ? "text-green-500" : "text-amber-500"
            }`}>
            {message.text}
          </p>
        )}
      </td>
    </tr>
  );
}

export default function PrintOrdersPanel() {
  const [orders, setOrders] = useState<PrintOrderData[]>([]);
  const [statusFilter, setStatusFilter] = useState<PrintOrderStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/print-orders${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar pedidos");
      setOrders(json.orders);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = (updated: PrintOrderData) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
    );
  };

  return (
    <div>
      <div className='p-3 sm:p-4 flex items-center gap-2 flex-wrap border-b border-border'>
        <label className='text-xs text-text-muted' htmlFor='print-status-filter'>
          Estado
        </label>
        <select
          id='print-status-filter'
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as PrintOrderStatus | "")
          }
          className='px-2 py-1.5 bg-bg border border-border rounded-lg text-xs sm:text-sm focus:border-primary outline-none'>
          <option value=''>Todos</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className='p-1.5 bg-bg border border-border hover:bg-border rounded-lg transition-colors disabled:opacity-50'
          title='Recargar'>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className='m-3 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm'>
          {error}
        </div>
      )}

      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-bg'>
            <tr>
              <th className='text-left px-3 py-3 text-sm font-medium text-text-muted'>
                Fecha
              </th>
              <th className='text-left px-3 py-3 text-sm font-medium text-text-muted'>
                Libro
              </th>
              <th className='text-left px-3 py-3 text-sm font-medium text-text-muted'>
                Destinatario
              </th>
              <th className='text-left px-3 py-3 text-sm font-medium text-text-muted'>
                Teléfono
              </th>
              <th className='text-left px-3 py-3 text-sm font-medium text-text-muted'>
                Estado
              </th>
              <th className='text-left px-3 py-3 text-sm font-medium text-text-muted'>
                Seguimiento
              </th>
              <th className='text-left px-3 py-3 text-sm font-medium text-text-muted'>
                Notas
              </th>
              <th className='text-right px-3 py-3 text-sm font-medium text-text-muted'>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onSaved={handleSaved}
              />
            ))}
          </tbody>
        </table>
        {!loading && orders.length === 0 && !error && (
          <div className='p-8 text-center text-text-muted'>
            No hay pedidos impresos
          </div>
        )}
      </div>
    </div>
  );
}
