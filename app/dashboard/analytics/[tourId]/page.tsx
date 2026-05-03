'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getTourAnalytics, getHotspotAnalytics, getUnitAnalytics, getConversionFunnel,
  groupHotspotsByType,
  TourAnalytics, HotspotStat, UnitStat, FunnelStep,
} from '@/lib/analytics';
import { getTourById } from '@/lib/db';
import type { Tour } from '@/types/tour.types';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Eye, MousePointerClick,
  Calendar, FileDown, Share2, Loader2, BarChart2,
  TrendingUp, Building2, ArrowDown, Home, Info, Navigation,
  Image as ImageIcon, User, ShoppingCart, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface PageProps { params: { tourId: string } }

export default function AnalyticsPage({ params }: PageProps) {
  const { tourId } = params;
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [analytics,   setAnalytics]   = useState<TourAnalytics | null>(null);
  const [hotspots,    setHotspots]    = useState<HotspotStat[]>([]);
  const [unitStats,   setUnitStats]   = useState<UnitStat[]>([]);
  const [funnel,      setFunnel]      = useState<FunnelStep[]>([]);
  const [tourData,    setTourData]    = useState<Tour | null>(null);
  const [tourTitle,   setTourTitle]   = useState('');
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth/login'); return; }

    const load = async () => {
      // ── SECURITY: verify tour belongs to current user before loading analytics
      const tourRow = await getTourById(tourId).catch(() => null);
      if (!tourRow || tourRow.user_id !== user.id) {
        router.push('/dashboard');
        return;
      }

      const [stats, hotspotStats, unitData, funnelData] = await Promise.all([
        getTourAnalytics(tourId),
        getHotspotAnalytics(tourId),
        getUnitAnalytics(tourId),
        getConversionFunnel(tourId),
      ]);
      setAnalytics(stats);
      setHotspots(hotspotStats);
      setUnitStats(unitData);
      setFunnel(funnelData);
      setTourData(tourRow.data);
      setTourTitle(tourRow.title);
      setLoading(false);
    };
    load();
  }, [tourId, user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  const ec = analytics?.eventCounts;

  const statCards = [
    { label: 'Vistas totales',    value: analytics?.totalViews ?? 0,   icon: <Eye            className="w-5 h-5" />, color: 'text-blue-400'   },
    { label: 'Escenas visitadas', value: ec?.scene_view ?? 0,          icon: <TrendingUp     className="w-5 h-5" />, color: 'text-purple-400' },
    { label: 'Unidades vistas',   value: ec?.unit_click ?? 0,          icon: <MousePointerClick className="w-5 h-5" />, color: 'text-emerald-400'},
    { label: 'Citas solicitadas', value: ec?.booking_request ?? 0,     icon: <Calendar       className="w-5 h-5" />, color: 'text-amber-400'  },
    { label: 'Brochures',         value: ec?.brochure_download ?? 0,   icon: <FileDown       className="w-5 h-5" />, color: 'text-rose-400'   },
    { label: 'Compartidos',       value: ec?.share_click ?? 0,         icon: <Share2         className="w-5 h-5" />, color: 'text-cyan-400'   },
  ];

  const maxDay = Math.max(...(analytics?.last30Days.map((d) => d.count) ?? [1]), 1);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Mis tours
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-gray-200 font-medium truncate">{tourTitle}</span>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            Analytics · últimos 30 días
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-2"
            >
              <span className={cn('flex-shrink-0', card.color)}>{card.icon}</span>
              <span className="text-2xl font-black text-white">{card.value.toLocaleString()}</span>
              <span className="text-xs text-gray-500 leading-tight">{card.label}</span>
            </div>
          ))}
        </div>

        {/* Daily activity chart */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Actividad diaria (30 días)
          </h2>

          {analytics?.last30Days.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-600 gap-2">
              <BarChart2 className="w-8 h-8" />
              <p className="text-sm">Sin datos aún. Los eventos se registrarán cuando el tour sea visitado.</p>
            </div>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {analytics!.last30Days.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 min-w-0 group relative flex flex-col justify-end"
                >
                  <div
                    className="w-full bg-blue-500/60 hover:bg-blue-400 rounded-t transition-colors"
                    style={{ height: `${Math.round((d.count / maxDay) * 100)}%`, minHeight: 2 }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap shadow z-10">
                    {d.date.slice(5)}: {d.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top scenes */}
        {(analytics?.topScenes.length ?? 0) > 0 && (() => {
          // Build sceneId → name map from tour data
          const sceneNames = new Map<string, string>();
          tourData?.scenes.forEach((s) => sceneNames.set(s.id, s.name));
          return (
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" /> Escenas más visitadas
              </h2>
              <ul className="space-y-2">
                {analytics!.topScenes.map((s, i) => (
                  <li key={s.sceneId} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-300 truncate font-medium">
                          {sceneNames.get(s.sceneId) ?? s.sceneId.slice(0, 16) + '…'}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{s.count} visitas</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(s.count / analytics!.topScenes[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        {/* Hotspot analytics */}
        {hotspots.length > 0 && (() => {
          // Build a label map: hotspotId → label
          const labelMap = new Map<string, string>();
          tourData?.scenes.forEach((s) => {
            s.hotspots.forEach((h) => labelMap.set(h.id, h.label || h.type));
          });
          const maxClicks = hotspots[0]?.count ?? 1;
          return (
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-teal-400" /> Hotspots más clickeados (30 días)
              </h2>
              <ul className="space-y-2">
                {hotspots.map((h, i) => (
                  <li key={h.hotspotId} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-300 truncate font-medium">
                          {labelMap.get(h.hotspotId) ?? h.hotspotId.slice(0, 16) + '…'}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{h.count} clicks</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${(h.count / maxClicks) * 100}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        {/* ── Conversion funnel ─────────────────────────────────────────── */}
        {funnel.length > 0 && funnel[0].count > 0 && (() => {
          const maxCount = funnel[0].count || 1;
          const FUNNEL_COLORS = [
            'bg-blue-500',
            'bg-indigo-500',
            'bg-violet-500',
            'bg-purple-500',
            'bg-pink-500',
          ];
          return (
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <ArrowDown className="w-4 h-4 text-blue-400" /> Embudo de conversión (30 días)
              </h2>
              <div className="space-y-3">
                {funnel.map((step, i) => {
                  const pct     = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
                  const prevPct = i > 0 && funnel[i - 1].count > 0
                    ? Math.round((step.count / funnel[i - 1].count) * 100)
                    : null;
                  return (
                    <div key={step.event} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-medium">{step.label}</span>
                        <div className="flex items-center gap-2">
                          {prevPct !== null && (
                            <span className="text-gray-600 text-[10px]">↳ {prevPct}% del anterior</span>
                          )}
                          <span className="text-white font-bold tabular-nums">{step.count.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', FUNNEL_COLORS[i] ?? 'bg-blue-500')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ── Unit engagement ───────────────────────────────────────────── */}
        {unitStats.length > 0 && tourData && (() => {
          // Build maps for lookup
          const unitMap    = new Map(tourData.units?.map((u) => [u.id, u]) ?? []);
          const protoMap   = new Map(tourData.unitPrototypes?.map((p) => [p.id, p]) ?? []);
          const maxClicks  = unitStats[0]?.count ?? 1;

          // Group by prototype
          const protoStats: Record<string, { name: string; count: number; units: number }> = {};
          for (const { unitId, count } of unitStats) {
            const unit      = unitMap.get(unitId);
            const protoId   = unit?.prototypeId ?? '__none__';
            const protoName = protoId !== '__none__'
              ? (protoMap.get(protoId)?.name ?? 'Sin prototipo')
              : 'Sin prototipo';
            if (!protoStats[protoId]) protoStats[protoId] = { name: protoName, count: 0, units: 0 };
            protoStats[protoId].count += count;
            protoStats[protoId].units += 1;
          }
          const protoArr = Object.values(protoStats).sort((a, b) => b.count - a.count);
          const hasProtos = tourData.unitPrototypes && tourData.unitPrototypes.length > 0;

          return (
            <>
              {/* By prototype */}
              {hasProtos && protoArr.length > 0 && (
                <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                  <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" /> Interés por prototipo (30 días)
                  </h2>
                  <ul className="space-y-2">
                    {protoArr.map((p) => {
                      const pct = (p.count / protoArr[0].count) * 100;
                      return (
                        <li key={p.name} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-gray-300 font-medium truncate">{p.name}</span>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-[10px] text-gray-600">{p.units} unidad{p.units !== 1 ? 'es' : ''}</span>
                                <span className="text-xs text-gray-400 font-bold">{p.count} vistas</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* By unit */}
              <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-400" /> Unidades más vistas (30 días)
                </h2>
                <ul className="space-y-2">
                  {unitStats.slice(0, 10).map(({ unitId, count }, i) => {
                    const unit = unitMap.get(unitId);
                    const pct  = (count / maxClicks) * 100;
                    const STATUS_DOT: Record<string, string> = {
                      available: 'bg-emerald-400',
                      reserved:  'bg-amber-400',
                      sold:      'bg-red-400',
                      'in-process': 'bg-blue-400',
                    };
                    return (
                      <li key={unitId} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {unit && (
                                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOT[unit.status] ?? 'bg-gray-500')} />
                              )}
                              <span className="text-xs text-gray-300 font-medium truncate">
                                {unit?.label ?? unitId.slice(0, 12) + '…'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2 font-bold">{count}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          );
        })()}

        {/* ── Hotspot type breakdown ────────────────────────────────────── */}
        {hotspots.length > 0 && tourData && (() => {
          const typeStats  = groupHotspotsByType(hotspots, tourData.scenes);
          if (typeStats.length === 0) return null;
          const maxT = typeStats[0].count;

          const TYPE_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
            navigation: { label: 'Navegación',  color: 'bg-blue-500',    Icon: Navigation    },
            info:       { label: 'Información', color: 'bg-amber-500',   Icon: Info          },
            media:      { label: 'Media',       color: 'bg-purple-500',  Icon: ImageIcon     },
            agent:      { label: 'Agente',      color: 'bg-green-500',   Icon: User          },
            product:    { label: 'Producto',    color: 'bg-rose-500',    Icon: ShoppingCart  },
            unit:       { label: 'Unidad',      color: 'bg-emerald-500', Icon: Building2     },
            map:        { label: 'Mapa / POI',  color: 'bg-red-500',     Icon: MapPin        },
          };

          return (
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-violet-400" /> Hotspots por tipo (30 días)
              </h2>
              <ul className="space-y-2">
                {typeStats.map(({ type, count }) => {
                  const meta = TYPE_META[type] ?? { label: type, color: 'bg-gray-500', Icon: Info };
                  const pct  = (count / maxT) * 100;
                  return (
                    <li key={type} className="flex items-center gap-3">
                      <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0', meta.color)}>
                        <meta.Icon className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-300 font-medium">{meta.label}</span>
                          <span className="text-xs text-gray-400 font-bold flex-shrink-0 ml-2">{count} clicks</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', meta.color)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })()}

        {/* Note about table */}
        <p className="text-xs text-gray-700 text-center pb-4">
          Los datos se acumulan en la tabla <code className="text-gray-600">tour_events</code> de Supabase.
          Crea la tabla para activar el tracking completo.
        </p>
      </main>
    </div>
  );
}
