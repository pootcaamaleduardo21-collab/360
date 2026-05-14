export type MaterialCategory = 'precios' | 'apartado' | 'promociones' | 'descuentos' | 'planos' | 'comisiones' | 'general';

export const CATEGORY_CONFIG: Record<MaterialCategory, { label: string; color: string }> = {
  precios:      { label: 'Precios actuales',       color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  apartado:     { label: 'Documentos de apartado', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  promociones:  { label: 'Promociones',            color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  descuentos:   { label: 'Descuentos',             color: 'bg-lime-500/20 text-lime-300 border-lime-500/30' },
  planos:       { label: 'Planos',                 color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  comisiones:   { label: 'Comisiones',             color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  general:      { label: 'General',                color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

export interface TeamMaterial {
  id:          string;
  admin_id:    string;
  name:        string;
  description: string | null;
  category:    MaterialCategory;
  file_name:   string;
  file_size:   number | null;
  file_type:   string | null;
  created_at:  string;
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1_048_576)   return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function fileIcon(mimeType: string | null): string {
  if (!mimeType) return '📄';
  if (mimeType === 'application/pdf')                         return '📕';
  if (mimeType.startsWith('image/'))                         return '🖼️';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))                      return '📊';
  return '📄';
}

/** Fetch all materials visible to the current user. */
export async function getMaterials(): Promise<TeamMaterial[]> {
  try {
    const res = await fetch('/api/materials');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/** Upload a file and create a material record. */
export async function uploadMaterial(payload: {
  file:         File;
  name:         string;
  description?: string;
  category:     MaterialCategory;
}): Promise<{ data?: TeamMaterial; error?: string }> {
  try {
    const form = new FormData();
    form.append('file',        payload.file);
    form.append('name',        payload.name);
    form.append('category',    payload.category);
    if (payload.description) form.append('description', payload.description);

    const res = await fetch('/api/materials', { method: 'POST', body: form });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? 'Error al subir el archivo.' };
    return { data: json };
  } catch {
    return { error: 'Error de conexión.' };
  }
}

/** Get a short-lived signed download URL for a material. */
export async function getDownloadUrl(id: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/materials/${id}`);
    if (!res.ok) return null;
    const { url } = await res.json();
    return url ?? null;
  } catch {
    return null;
  }
}

/** Delete a material (admin only). */
export async function deleteMaterial(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
