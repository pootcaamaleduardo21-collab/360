'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getLeadsForUser, Lead } from '@/lib/leads';
import { listUserTours } from '@/lib/db';
import { MessageSquare, Phone, Mail, Clock, Inbox, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface TourOption { id: string; title: string }

export function LeadsPanel() {
  const { user } = useAuth();
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [tours,   setTours]   = useState<TourOption[]>([]);
  const [filter,  setFilter]  = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [leadsData, toursData] = await Promise.all([
        getLeadsForUser(),
        listUserTours(),
      ]);
      setLeads(leadsData);
      setTours(toursData.map((t) => ({ id: t.id, title: t.title })));
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = filter === 'all' ? leads : leads.filter((l) => l.tour_id === filter);

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + filter */}
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
        {tours.length > 1 && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-300 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">Todos los tours</option>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Inbox className="w-10 h-10 text-gray-700" />
          <p className="text-sm text-gray-500">Aún no hay leads.</p>
          <p className="text-xs text-gray-600 max-w-xs">
            Activa el botón de contacto en el editor (pestaña "Acceso") para que los visitantes puedan enviarte su información.
          </p>
        </div>
      )}

      {/* Leads list */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((lead) => {
            const tourTitle = tours.find((t) => t.id === lead.tour_id)?.title ?? 'Tour';
            return (
              <div key={lead.id}
                className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors space-y-2"
              >
                {/* Name + tour */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{lead.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tourTitle}</p>
                  </div>
                  <Link
                    href={`/viewer/${lead.tour_id}`}
                    target="_blank"
                    className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
                    title="Ver tour"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Contact info */}
                <div className="flex flex-wrap gap-3">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`}
                      className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      <Phone className="w-3 h-3" /> {lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`}
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Mail className="w-3 h-3" /> {lead.email}
                    </a>
                  )}
                </div>

                {/* Message */}
                {lead.message && (
                  <p className="text-xs text-gray-400 bg-gray-800/60 rounded-lg px-3 py-2 leading-relaxed">
                    {lead.message}
                  </p>
                )}

                {/* Timestamp */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <Clock className="w-3 h-3" />
                  {fmt(lead.created_at)}
                  {lead.scene_id && (
                    <span className="ml-1 px-1.5 py-0.5 bg-gray-800 rounded text-[10px] font-mono">
                      escena: {lead.scene_id.slice(0, 8)}
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
