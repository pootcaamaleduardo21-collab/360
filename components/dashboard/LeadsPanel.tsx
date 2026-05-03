'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getLeadsForUser, Lead } from '@/lib/leads';
import { listUserTours, getTourById } from '@/lib/db';
import {
  MessageSquare, Phone, Mail, Clock, Inbox, ExternalLink,
  MessageCircle, Download, Star, MapPin, Search, Filter,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourOption { id: string; title: string }
interface SceneMap   { [tourId: string]: Map<string, string> }   // sceneId → sceneName

// ─── Lead scoring ─────────────────────────────────────────────────────────────
// Simple heuristic: more data filled = hotter lead

function leadScore(lead: Lead): number {
  let score = 0;
  if (lead.phone)   score += 3;  // Phone = high intent (can call/WhatsApp directly)
  if (lead.email)   score += 2;
  if (lead.message && lead.message.trim().length > 10) score += 2;
  if (lead.phone && lead.email) score += 1; // Both = very serious
  return Math.min(score, 8);
}

function ScoreBadge({ score }: { score: number }) {
  const pct = score / 8;
  const color = pct >= 0.75 ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
              : pct >= 0.5  ? 'text-amber-400  bg-amber-500/15  border-amber-500/30'
              :                'text-gray-500   bg-gray-800      border-gray-700';
  const label = pct >= 0.75 ? 'Caliente' : pct >= 0.5 ? 'Tibio' : 'Frío';
  return (
    <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0', color)}>
      <Star className="w-2.5 h-2.5" /> {label}
    </span>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportLeadsCSV(leads: Lead[], tours: TourOption[], sceneMaps: SceneMap) {
  const headers = ['Nombre', 'Teléfono', 'Email', 'Mensaje', 'Tour', 'Escena', 'Fecha', 'Puntaje'];
  const rows = leads.map((l) => {
    const tour  = tours.find((t) => t.id === l.tour_id)?.title ?? l.tour_id;
    const scene = l.scene_id ? (sceneMaps[l.tour_id]?.get(l.scene_id) ?? l.scene_id) : '';
    const date  = new Date(l.created_at).toLocaleString('es-MX');
    const score = leadScore(l);
    return [l.name, l.phone ?? '', l.email ?? '', l.message ?? '', tour, scene, date, String(score)];
  });
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadsPanel() {
  const { user } = useAuth();
  const [leads,     setLeads]     = useState<Lead[]>([]);
  const [tours,     setTours]     = useState<TourOption[]>([]);
  const [sceneMaps, setSceneMaps] = useState<SceneMap>({});
  const [filter,    setFilter]    = useState<string>('all');
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [leadsData, toursData] = await Promise.all([
        getLeadsForUser(),
        listUserTours(),
      ]);
      setLeads(leadsData);
      setTours(toursData.map((t) => ({ id: t.id, title: t.title })));

      // Fetch scene names for tours that have leads
      const tourIdsWithLeads = [...new Set(leadsData.map((l) => l.tour_id))];
      const maps: SceneMap = {};
      await Promise.all(
        tourIdsWithLeads.map(async (id) => {
          const row = await getTourById(id).catch(() => null);
          if (row) {
            maps[id] = new Map(row.data.scenes.map((s) => [s.id, s.name]));
          }
        })
      );
      setSceneMaps(maps);
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = leads
    .filter((l) => filter === 'all' || l.tour_id === filter)
    .filter((l) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        (l.phone  ?? '').includes(q) ||
        (l.email  ?? '').toLowerCase().includes(q) ||
        (l.message ?? '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => leadScore(b) - leadScore(a)); // hottest first

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-teal-400" />
          <h2 className="text-base font-bold text-white">Leads capturados</h2>
          {filtered.length > 0 && (
            <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 text-xs font-semibold rounded-full">
              {filtered.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {leads.length > 0 && (
            <button
              onClick={() => exportLeadsCSV(filtered, tours, sceneMaps)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Filters bar */}
      {leads.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono, email…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Tour filter */}
          {tours.length > 1 && (
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-300 outline-none focus:border-blue-500 transition-colors appearance-none"
              >
                <option value="all">Todos los tours</option>
                {tours.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Inbox className="w-10 h-10 text-gray-700" />
          <p className="text-sm text-gray-500">
            {leads.length === 0 ? 'Aún no hay leads.' : 'Sin resultados para esta búsqueda.'}
          </p>
          {leads.length === 0 && (
            <p className="text-xs text-gray-600 max-w-xs">
              Activa el botón de contacto en el editor (pestaña "Acceso") para que los visitantes puedan enviarte su información.
            </p>
          )}
        </div>
      )}

      {/* Leads list — sorted by score */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((lead) => {
            const tourTitle  = tours.find((t) => t.id === lead.tour_id)?.title ?? 'Tour';
            const sceneName  = lead.scene_id ? (sceneMaps[lead.tour_id]?.get(lead.scene_id) ?? null) : null;
            const score      = leadScore(lead);
            const waPhone    = lead.phone?.replace(/\D/g, '');
            const waText     = encodeURIComponent(
              `Hola ${lead.name}, te escribo sobre el tour virtual "${tourTitle}". ¿Sigues interesado/a?`
            );

            return (
              <div
                key={lead.id}
                className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors space-y-2.5"
              >
                {/* Top row: name + score + actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                      <ScoreBadge score={score} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{tourTitle}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {waPhone && (
                      <a
                        href={`https://wa.me/${waPhone}?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-[11px] font-semibold transition-colors"
                        title="Contactar por WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}
                    <Link
                      href={`/viewer/${lead.tour_id}`}
                      target="_blank"
                      className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-600 hover:text-gray-300 transition-colors"
                      title="Ver tour"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Contact info */}
                <div className="flex flex-wrap gap-3">
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      <Phone className="w-3 h-3" /> {lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Mail className="w-3 h-3" /> {lead.email}
                    </a>
                  )}
                </div>

                {/* Message */}
                {lead.message && (
                  <p className="text-xs text-gray-400 bg-gray-800/60 rounded-lg px-3 py-2 leading-relaxed">
                    "{lead.message}"
                  </p>
                )}

                {/* Footer: scene + timestamp */}
                <div className="flex items-center gap-3 text-[11px] text-gray-600 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {fmt(lead.created_at)}
                  </span>
                  {sceneName && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px]">
                      <MapPin className="w-2.5 h-2.5 text-gray-500" />
                      {sceneName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
