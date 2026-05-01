'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTourAnalytics, TourAnalytics } from '@/lib/analytics';
import { getTourById } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Eye, Users, MousePointerClick,
  Calendar, FileDown, Share2, Loader2, BarChart2,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageProps { params: { tourId: string } }

export default function AnalyticsPage({ params }: PageProps) {
  const { tourId } = params;
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [analytics,   setAnalytics]   = useState<TourAnalytics | null>(null);
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

      const stats = await getTourAnalytics(tourId);
      setAnalytics(stats);
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
        {(analytics?.topScenes.length ?? 0) > 0 && (
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
                      <span className="text-xs text-gray-300 truncate font-mono">{s.sceneId.slice(0, 20)}…</span>
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
        )}

        {/* Note about table */}
        <p className="text-xs text-gray-700 text-center pb-4">
          Los datos se acumulan en la tabla <code className="text-gray-600">tour_events</code> de Supabase.
          Crea la tabla para activar el tracking completo.
        </p>
      </main>
    </div>
  );
}
