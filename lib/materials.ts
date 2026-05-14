export type MaterialCategory = string;

export interface MaterialCategoryRecord {
  id?: string;
  key: string;
  name: string;
  color?: string | null;
  sort_order?: number;
  is_system?: boolean;
}

export const DEFAULT_MATERIAL_CATEGORIES: MaterialCategoryRecord[] = [
  { key: 'precios',     name: 'Precios actuales',       color: 'blue',    sort_order: 10, is_system: true },
  { key: 'apartado',    name: 'Documentos de apartado', color: 'cyan',    sort_order: 20, is_system: true },
  { key: 'promociones', name: 'Promociones',            color: 'emerald', sort_order: 30, is_system: true },
  { key: 'descuentos',  name: 'Descuentos',             color: 'lime',    sort_order: 40, is_system: true },
  { key: 'planos',      name: 'Planos',                 color: 'amber',   sort_order: 50, is_system: true },
  { key: 'comisiones',  name: 'Comisiones',             color: 'purple',  sort_order: 60, is_system: true },
  { key: 'general',     name: 'General',                color: 'gray',    sort_order: 70, is_system: true },
];

export const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  precios:      { label: 'Precios actuales',       color: categoryColorClasses('blue') },
  apartado:     { label: 'Documentos de apartado', color: categoryColorClasses('cyan') },
  promociones:  { label: 'Promociones',            color: categoryColorClasses('emerald') },
  descuentos:   { label: 'Descuentos',             color: categoryColorClasses('lime') },
  planos:       { label: 'Planos',                 color: categoryColorClasses('amber') },
  comisiones:   { label: 'Comisiones',             color: categoryColorClasses('purple') },
  general:      { label: 'General',                color: categoryColorClasses('gray') },
};

export function categoryColorClasses(color?: string | null): string {
  const map: Record<string, string> = {
    blue:    'bg-blue-500/20 text-blue-300 border-blue-500/30',
    cyan:    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    lime:    'bg-lime-500/20 text-lime-300 border-lime-500/30',
    amber:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
    purple:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
    rose:    'bg-rose-500/20 text-rose-300 border-rose-500/30',
    gray:    'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return map[color ?? ''] ?? map.gray;
}

export function categoryLabel(categories: MaterialCategoryRecord[], key: string): string {
  return categories.find((category) => category.key === key)?.name
    ?? CATEGORY_CONFIG[key]?.label
    ?? key;
}

export function categoryClasses(categories: MaterialCategoryRecord[], key: string): string {
  const category = categories.find((item) => item.key === key);
  return categoryColorClasses(category?.color) ?? CATEGORY_CONFIG[key]?.color ?? categoryColorClasses('gray');
}

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

export async function getMaterialCategories(): Promise<MaterialCategoryRecord[]> {
  try {
    const res = await fetch('/api/material-categories');
    if (!res.ok) return DEFAULT_MATERIAL_CATEGORIES;
    const data = await res.json();
    return data.length ? data : DEFAULT_MATERIAL_CATEGORIES;
  } catch {
    return DEFAULT_MATERIAL_CATEGORIES;
  }
}

export async function createMaterialCategory(payload: {
  name: string;
  color?: string;
}): Promise<{ data?: MaterialCategoryRecord; error?: string }> {
  try {
    const res = await fetch('/api/material-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? 'No se pudo crear la categoría.' };
    return { data: json };
  } catch {
    return { error: 'Error de conexión.' };
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
