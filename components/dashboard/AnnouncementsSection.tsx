'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Megaphone, Plus, X, Pin, PinOff, Trash2, Loader2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAnnouncements, createAnnouncement, deleteAnnouncement, togglePin,
  ANNOUNCEMENT_TYPE_CONFIG,
  type TeamAnnouncement, type AnnouncementType,
} from '@/lib/announcements';

const TYPES = Object.entries(ANNOUNCEMENT_TYPE_CONFIG) as [AnnouncementType, { label: string; color: string; icon: string }][];

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateForm({ onCreated }: { onCreated: (a: TeamAnnouncement) => void }) {
  const [title,   setTitle]   = useState('');
  const [message, setMessage] = useState('');
  const [type,    setType]    = useState<AnnouncementType>('announcement');
  const [pinned,  setPinned]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSaving(true);
    setError(null);
    const result = await createAnnouncement({ title: title.trim(), message: message.trim(), type, pinned });
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onCreated(result.data!);
    setTitle('');
    setMessage('');
    setType('announcement');
    setPinned(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-5 rounded-2xl bg-gray-900 border border-gray-800">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nueva publicación</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 font-medium">Título *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="¡Nuevo récord de ventas este mes!"
            className="w-full px-3 py-2 text-sm rounded-xl bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 font-medium">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AnnouncementType)}
            className="w-full px-3 py-2 text-sm rounded-xl bg-gray-800 border border-gray-700 text-gray-200 outline-none focus:border-blue-500 transition-colors"
          >
            {TYPES.map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-gray-500 font-medium">Mensaje *</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Escribe aquí tu aviso, noticia o frase motivacional para el equipo…"
          className="w-full px-3 py-2 text-sm rounded-xl bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setPinned((v) => !v)}
            className={cn(
              'w-8 h-4 rounded-full transition-colors relative',
              pinned ? 'bg-amber-500' : 'bg-gray-700'
            )}
          >
            <div className={cn(
              'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
              pinned ? 'translate-x-4' : 'translate-x-0.5'
            )} />
          </div>
          <span className="text-xs text-gray-400">Fijar al inicio</span>
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !title.trim() || !message.trim()}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {saving ? 'Publicando…' : 'Publicar'}
      </button>
    </form>
  );
}

// ─── Announcement card ────────────────────────────────────────────────────────

function AnnouncementCard({
  item, isAdmin, onDeleted, onTogglePin,
}: {
  item:          TeamAnnouncement;
  isAdmin:       boolean;
  onDeleted:     (id: string) => void;
  onTogglePin:   (id: string, pinned: boolean) => void;
}) {
  const [deleting,  setDeleting]  = useState(false);
  const [pinning,   setPinning]   = useState(false);
  const cfg = ANNOUNCEMENT_TYPE_CONFIG[item.type];

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar esta publicación? No se puede deshacer.`)) return;
    setDeleting(true);
    const ok = await deleteAnnouncement(item.id);
    setDeleting(false);
    if (ok) onDeleted(item.id);
  };

  const handlePin = async () => {
    setPinning(true);
    const ok = await togglePin(item.id, !item.pinned);
    setPinning(false);
    if (ok) onTogglePin(item.id, !item.pinned);
  };

  const date = new Date(item.created_at).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className={cn(
      'relative p-4 rounded-2xl border transition-colors',
      item.pinned
        ? 'bg-amber-500/5 border-amber-500/25'
        : 'bg-gray-900 border-gray-800 hover:border-gray-700'
    )}>
      {item.pinned && (
        <span className="absolute top-3 right-3 text-amber-400 opacity-60">
          <Pin className="w-3.5 h-3.5" />
        </span>
      )}

      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-200">{item.title}</p>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', cfg.color)}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1.5 leading-relaxed whitespace-pre-wrap">{item.message}</p>
          <p className="text-[11px] text-gray-600 mt-2">{date}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-800">
          <button
            onClick={handlePin}
            disabled={pinning}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border disabled:opacity-40',
              item.pinned
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
            )}
          >
            {pinning ? <Loader2 className="w-3 h-3 animate-spin" /> : item.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            {item.pinned ? 'Desfijar' : 'Fijar'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors disabled:opacity-40"
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function AnnouncementsSection({ isAdmin }: { isAdmin: boolean }) {
  const [items,      setItems]      = useState<TeamAnnouncement[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await getAnnouncements());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (a: TeamAnnouncement) => {
    setItems((prev) => {
      const next = [a, ...prev];
      return next.sort((x, y) => (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0));
    });
    setShowForm(false);
  };

  const handleDeleted = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const handleTogglePin = (id: string, pinned: boolean) => {
    setItems((prev) => {
      const next = prev.map((i) => i.id === id ? { ...i, pinned } : i);
      return next.sort((x, y) => (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0));
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-400" />
            Novedades
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Avisos, noticias y mensajes motivacionales para tu equipo.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
              showForm
                ? 'bg-gray-800 text-gray-300 border border-gray-700'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            )}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancelar' : 'Nueva publicación'}
          </button>
        )}
      </div>

      {/* Create form */}
      {isAdmin && showForm && <CreateForm onCreated={handleCreated} />}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Sin publicaciones aún</p>
            {isAdmin && (
              <p className="text-xs text-gray-600 mt-1">
                Comparte avisos importantes, actualizaciones o frases motivacionales con tu equipo.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <AnnouncementCard
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onDeleted={handleDeleted}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
