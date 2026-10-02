"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface DailyPoint {
  date: string;
  drafts: number;
  payments: number;
  revenueCents: number;
}

interface MetricsResponse {
  days: number;
  since: string;
  until: string;
  funnel: {
    draftsCreated: number;
    draftsWithLeadEmail: number;
    checkoutsStarted: number;
    paymentsCompleted: number;
    revenueCents: number;
    booksUnlocked: number;
    booksCompleted: number;
    booksError: number;
    booksStuckGenerating: number;
  };
  conversion: {
    draftToPayment: number | null;
    paymentToCompleted: number | null;
    draftToLead: number | null;
    checkoutToPayment: number | null;
  };
  print: {
    byStatus: Record<string, number>;
    paidOrders: number;
    revenueCents: number;
  };
  economics: {
    estimated: boolean;
    note: string;
    revenueEur: number;
    revenueNetOfVatEur: number;
    stripeFeesEur: number;
    openAiCostEur: number;
    grossMarginEur: number;
    grossMarginPct: number | null;
  };
  daily: DailyPoint[];
}

const RANGES = [7, 30, 90] as const;

const PRINT_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagado",
  IN_PRODUCTION: "En producción",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELED: "Cancelado",
};

const eur = (value: number) =>
  value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

const pct = (value: number | null) =>
  value === null
    ? "—"
    : value.toLocaleString("es-ES", {
        style: "percent",
        maximumFractionDigits: 1,
      });

const shortDate = (isoDay: string) => {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
};

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={`bg-bg border rounded-lg p-3 ${
        tone === "warn" ? "border-red-500/50" : "border-border"
      }`}>
      <p className='text-[10px] sm:text-xs text-text-muted'>{label}</p>
      <p className='text-lg sm:text-2xl font-bold tabular-nums'>{value}</p>
      {hint && <p className='text-[10px] sm:text-xs text-text-muted'>{hint}</p>}
    </div>
  );
}

// Barras diarias de una sola serie. Una gráfica por medida (sin doble eje).
function DailyBars({
  title,
  data,
  valueOf,
  formatValue = (v) => String(v),
}: {
  title: string;
  data: DailyPoint[];
  valueOf: (p: DailyPoint) => number;
  formatValue?: (v: number) => string;
}) {
  const width = 600;
  const height = 120;
  const padTop = 8;
  const padBottom = 18;
  const plotH = height - padTop - padBottom;
  const max = Math.max(1, ...data.map(valueOf));
  const slot = width / Math.max(1, data.length);
  const barW = Math.max(1, Math.min(18, slot - 2));
  const total = data.reduce((acc, p) => acc + valueOf(p), 0);
  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;

  return (
    <figure className='bg-bg border border-border rounded-lg p-3'>
      <figcaption className='flex items-baseline justify-between text-xs sm:text-sm mb-2'>
        <span className='font-medium'>{title}</span>
        <span className='text-text-muted'>
          Máx. diario {formatValue(max === 1 && total === 0 ? 0 : max)}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className='w-full h-28'
        role='img'
        aria-label={`${title}: ${formatValue(total)} en total entre ${first ? shortDate(first) : ""} y ${last ? shortDate(last) : ""}`}
        preserveAspectRatio='none'>
        <line
          x1={0}
          x2={width}
          y1={padTop + plotH}
          y2={padTop + plotH}
          stroke='var(--border)'
          strokeWidth={1}
          vectorEffect='non-scaling-stroke'
        />
        {data.map((p, i) => {
          const v = valueOf(p);
          const h = v === 0 ? 0 : Math.max(2, (v / max) * plotH);
          const x = i * slot + (slot - barW) / 2;
          return (
            <g key={p.date} className='group'>
              {/* Zona de hover más grande que la barra */}
              <rect
                x={i * slot}
                y={0}
                width={slot}
                height={padTop + plotH}
                fill='transparent'
                className='group-hover:fill-white/5'>
                <title>{`${shortDate(p.date)}: ${formatValue(v)}`}</title>
              </rect>
              {h > 0 && (
                <rect
                  x={x}
                  y={padTop + plotH - h}
                  width={barW}
                  height={h}
                  rx={Math.min(4, barW / 2)}
                  fill='var(--primary)'
                  pointerEvents='none'
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className='flex justify-between text-[10px] text-text-muted mt-1'>
        <span>{first ? shortDate(first) : ""}</span>
        <span>{last ? shortDate(last) : ""}</span>
      </div>
    </figure>
  );
}

export default function FunnelPanel() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Petición resuelta más reciente; "cargando" = la actual aún no ha llegado
  const [settled, setSettled] = useState<{
    key: string;
    error: string | null;
  } | null>(null);
  const requestKey = `${days}:${reloadKey}`;
  const loading = settled?.key !== requestKey;
  const error = loading ? null : settled?.error ?? null;

  useEffect(() => {
    let cancelled = false;
    const key = `${days}:${reloadKey}`;
    fetch(`/api/admin/metrics?days=${days}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Error al cargar métricas");
        return json as MetricsResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setSettled({ key, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setSettled({ key, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [days, reloadKey]);

  const f = data?.funnel;
  const c = data?.conversion;
  const e = data?.economics;

  return (
    <div className='p-3 sm:p-4 space-y-4'>
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div
          className='inline-flex bg-bg border border-border rounded-lg p-0.5'
          role='group'
          aria-label='Rango de días'>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                days === r
                  ? "bg-primary text-white"
                  : "text-text-muted hover:text-text"
              }`}>
              {r} días
            </button>
          ))}
        </div>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          className='p-1.5 bg-bg border border-border hover:bg-border rounded-lg transition-colors disabled:opacity-50'
          title='Recargar'>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className='p-3 rounded-lg bg-red-500/10 text-red-500 text-sm'>
          {error}
        </div>
      )}

      {!data && loading && (
        <div className='p-8 text-center text-text-muted'>Cargando métricas…</div>
      )}

      {f && c && e && data && (
        <div className={loading ? "opacity-60 transition-opacity" : ""}>
          {/* Embudo */}
          <h3 className='text-xs font-semibold uppercase tracking-wide text-text-muted mb-2'>
            Embudo · últimos {data.days} días
          </h3>
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4'>
            <Kpi label='Borradores creados' value={f.draftsCreated} />
            <Kpi
              label='Con email (lead)'
              value={f.draftsWithLeadEmail}
              hint={`${pct(c.draftToLead)} de borradores`}
            />
            <Kpi label='Checkouts iniciados' value={f.checkoutsStarted} />
            <Kpi
              label='Pagos completados'
              value={f.paymentsCompleted}
              hint={`${pct(c.checkoutToPayment)} de checkouts`}
            />
            <Kpi label='Ingresos digitales' value={eur(f.revenueCents / 100)} />
            <Kpi label='Libros desbloqueados' value={f.booksUnlocked} />
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4'>
            <Kpi
              label='Borrador → pago'
              value={pct(c.draftToPayment)}
              hint='pagos / borradores'
            />
            <Kpi
              label='Pago → completado'
              value={pct(c.paymentToCompleted)}
              hint='completados / desbloqueados'
            />
            <Kpi label='Libros completados' value={f.booksCompleted} />
            <Kpi
              label='Libros en error'
              value={f.booksError}
              tone={f.booksError > 0 ? "warn" : "default"}
            />
            <Kpi
              label='Atascados generando'
              value={f.booksStuckGenerating}
              hint='> 15 min, ahora mismo'
              tone={f.booksStuckGenerating > 0 ? "warn" : "default"}
            />
            <Kpi
              label='Ingresos impresos'
              value={eur(data.print.revenueCents / 100)}
              hint={`${data.print.paidOrders} pedidos pagados`}
            />
          </div>

          {/* Economía estimada */}
          <h3 className='text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1'>
            <AlertTriangle className='w-3 h-3 text-amber-500' />
            Margen bruto estimado (digital)
          </h3>
          <div className='grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-1'>
            <Kpi label='Ingresos sin IVA' value={eur(e.revenueNetOfVatEur)} />
            <Kpi label='Comisión Stripe' value={`− ${eur(e.stripeFeesEur)}`} />
            <Kpi label='Coste OpenAI' value={`− ${eur(e.openAiCostEur)}`} />
            <Kpi
              label='Margen bruto'
              value={eur(e.grossMarginEur)}
              tone={e.grossMarginEur < 0 ? "warn" : "default"}
            />
            <Kpi label='Margen %' value={pct(e.grossMarginPct)} />
          </div>
          <p className='text-[10px] sm:text-xs text-text-muted mb-4'>{e.note}</p>

          {/* Pedidos impresos por estado */}
          <h3 className='text-xs font-semibold uppercase tracking-wide text-text-muted mb-2'>
            Pedidos impresos por estado
          </h3>
          <div className='flex flex-wrap gap-2 mb-4'>
            {Object.entries(data.print.byStatus).map(([status, count]) => (
              <span
                key={status}
                className='px-2 py-1 bg-bg border border-border rounded text-xs'>
                {PRINT_STATUS_LABELS[status] ?? status}:{" "}
                <strong className='tabular-nums'>{count}</strong>
              </span>
            ))}
          </div>

          {/* Serie diaria */}
          <div className='flex items-center justify-between mb-2'>
            <h3 className='text-xs font-semibold uppercase tracking-wide text-text-muted'>
              Serie diaria
            </h3>
            <button
              onClick={() => setShowTable((s) => !s)}
              className='text-xs text-primary hover:underline'>
              {showTable ? "Ver gráfica" : "Ver tabla"}
            </button>
          </div>

          {showTable ? (
            <div className='overflow-x-auto max-h-80 overflow-y-auto border border-border rounded-lg'>
              <table className='w-full text-sm'>
                <thead className='bg-bg sticky top-0'>
                  <tr>
                    <th className='text-left px-3 py-2 font-medium text-text-muted'>
                      Día
                    </th>
                    <th className='text-right px-3 py-2 font-medium text-text-muted'>
                      Borradores
                    </th>
                    <th className='text-right px-3 py-2 font-medium text-text-muted'>
                      Pagos
                    </th>
                    <th className='text-right px-3 py-2 font-medium text-text-muted'>
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {[...data.daily].reverse().map((p) => (
                    <tr key={p.date}>
                      <td className='px-3 py-1.5'>{shortDate(p.date)}</td>
                      <td className='px-3 py-1.5 text-right tabular-nums'>
                        {p.drafts}
                      </td>
                      <td className='px-3 py-1.5 text-right tabular-nums'>
                        {p.payments}
                      </td>
                      <td className='px-3 py-1.5 text-right tabular-nums'>
                        {eur(p.revenueCents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
              <DailyBars
                title='Borradores por día'
                data={data.daily}
                valueOf={(p) => p.drafts}
              />
              <DailyBars
                title='Pagos completados por día'
                data={data.daily}
                valueOf={(p) => p.payments}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
