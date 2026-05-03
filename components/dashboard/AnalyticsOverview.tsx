'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listUserTours, type TourSummary } from '@/lib/db';
import { getLeadsForUser, type Lead } from '@/lib/leads';
import {
  BarChart2, Eye, MessageSquare, Globe, TrendingUp,
  ArrowRight, Lock, Unlock, Loader2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  if (d < 7)   return `Hace ${d} días`;
  if (d < 30)  return `Hace ${Math.floor(d / 7)} sem.`;
  return `Hace ${Math.floor(d / 30)} mes.`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-900 border border-gray-800">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-white leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsOverview() {
  const [tours,   setTours]   = useState<TourSummary[]>([]);
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listUserTours(), getLeadsForUser()])
      .then(([t, l]) => { setTours(t); setLeads(l); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const totalViews     = tours.reduce((a, t) => a + t.view_count, 0);
  const published      = tours.filter((t) => t.is_published).length;
  const totalLeads     = leads.length;

  // Leads in the last 7 days
  const week = Date.now() - 7 * 86_400_000;
  const recentLeads = leads.filter((l) => new Date(l.created_at).getTime() > week).length;

  // Tours sorted by views (desc)
  const ranked = [...tours].sort((a, b) => b.view_count - a.view_count);

  // Lead counts per tour
  const leadsByTour = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.tour_id] = (acc[l.tour_id] ?? 0) + 1;
    return acc;
  }, {});

  // ── Conversion rate (leads / views) ──────────────────────────────────────
  const convRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : '—';

  return (
    <div className="space-y-8">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-gray-100">Analytics global</h1>
        <p className="text-sm text-gray-500 mt-1">
          Resumen de rendimiento de todos tus tours virtuales.
        </p>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Vistas totales"
          value={fmtNum(totalViews)}
          icon={<Eye className="w-5 h-5 text-blue-400" />}
          color="bg-blue-500/10"
        />
        <StatCard
          label="Leads totales"
          value={fmtNum(totalLeads)}
          sub={recentLeads > 0 ? `+${recentLeads} esta semana` : undefined}
          icon={<MessageSquare className="w-5 h-5 text-emerald-400" />}
          color="bg-emerald-500/10"
        />
        <StatCard
          label="Tours publicados"
          value={`${published}/${tours.length}`}
          icon={<Globe className="w-5 h-5 text-violet-400" />}
          color="bg-violet-500/10"
        />
        <StatCard
          label="Tasa de conversión"
          value={convRate === '—' ? '—' : `${convRate}%`}
          sub="leads / vistas"
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
          color="bg-amber-500/10"
        />
      </div>

      {/* ── Tours table ───────────────────────────────────────────────────── */}
      {tours.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
            <BarChart2 className="w-7 h-7 text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium">No hay tours aún</p>
          <p className="text-sm text-gray-600">Crea tu primer tour para ver estadísticas aquí.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-5">Tour</div>
            <div className="col-span-2 text-right">Vistas</div>
            <div className="col-span-2 text-right">Leads</div>
            <div className="col-span-2 text-right hidden sm:block">Conv.</div>
            <div className="col-span-1" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-800/60 bg-gray-950">
            {ranked.map((tour, i) => {
              const tourLeads = leadsByTour[tour.id] ?? 0;
              const conv = tour.view_count > 0
                ? ((tourLeads / tour.view_count) * 100).toFixed(1) + '%'
                : '—';

              // Bar width relative to top tour
              const maxViews = ranked[0]?.view_count ?? 1;
              const barPct   = maxViews > 0 ? (tour.view_count / maxViews) * 100 : 0;

              return (
                <div
                  key={tour.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center hover:bg-gray-900/50 transition-colors group relative"
                >
                  {/* Rank + title */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-gray-700 w-5 flex-shrink-0 text-center">
                      {i + 1}
                    </span>

                    {/* Thumbnail */}
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-gray-800 overflow-hidden border border-gray-700">
                      {tour.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={tour.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Globe className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate leading-tight">
                        {tour.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {tour.is_published
                          ? <Unlock className="w-3 h-3 text-emerald-500" />
                          : <Lock   className="w-3 h-3 text-gray-600"   />}
                        <span className="text-[11px] text-gray-600">
                          {tour.is_published ? 'Publicado' : 'Borrador'} · {relativeTime(tour.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Views + bar */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-gray-200">{fmtNum(tour.view_count)}</span>
                    {/* Mini bar */}
                    <div className="mt-1 h-1 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500/60 transition-all"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Leads */}
                  <div className="col-span-2 text-right">
                    <span className={cn(
                      'text-sm font-bold',
                      tourLeads > 0 ? 'text-emerald-400' : 'text-gray-600'
                    )}>
                      {fmtNum(tourLeads)}
                    </span>
                  </div>

                  {/* Conversion */}
                  <div className="col-span-2 text-right hidden sm:block">
                    <span className="text-sm text-gray-500">{conv}</span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end">
                    <Link
                      href={`/dashboard/analytics/${tour.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 whitespace-nowrap"
                      title="Ver analytics detallado"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick links to per-tour analytics ─────────────────────────────── */}
      {tours.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tours.slice(0, 6).map((tour) => (
            <Link
              key={tour.id}
              href={`/dashboard/analytics/${tour.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {tour.title}
            </Link>
          ))}
          {tours.length > 6 && (
            <span className="flex items-center px-3 py-1.5 text-xs text-gray-600">
              +{tours.length - 6} más
            </span>
          )}
        </div>
      )}
    </div>
  );
}
