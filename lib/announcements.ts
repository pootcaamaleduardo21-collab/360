export type AnnouncementType = 'announcement' | 'news' | 'motivation';

export const ANNOUNCEMENT_TYPE_CONFIG: Record<AnnouncementType, { label: string; color: string; icon: string }> = {
  announcement: { label: 'Aviso',       color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',    icon: '📢' },
  news:         { label: 'Noticia',     color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: '🗞️' },
  motivation:   { label: 'Motivación',  color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',  icon: '⚡' },
};

export interface TeamAnnouncement {
  id:         string;
  admin_id:   string;
  title:      string;
  message:    string;
  type:       AnnouncementType;
  pinned:     boolean;
  created_at: string;
}

export async function getAnnouncements(): Promise<TeamAnnouncement[]> {
  try {
    const res = await fetch('/api/announcements');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createAnnouncement(payload: {
  title:   string;
  message: string;
  type:    AnnouncementType;
  pinned?: boolean;
}): Promise<{ data?: TeamAnnouncement; error?: string }> {
  try {
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? 'Error al publicar.' };
    return { data: json };
  } catch {
    return { error: 'Error de conexión.' };
  }
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function togglePin(id: string, pinned: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/api/announcements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
