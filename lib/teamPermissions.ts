import type { User } from '@supabase/supabase-js';

export const ADMIN_PERMISSIONS = [
  'manage_tours',
  'view_leads',
  'view_crm',
  'view_analytics',
  'manage_sales_hub',
  'manage_team',
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, { label: string; desc: string }> = {
  manage_tours:     { label: 'Tours',         desc: 'Crear, editar, publicar y eliminar recorridos.' },
  view_leads:       { label: 'Leads',         desc: 'Consultar prospectos capturados en los tours.' },
  view_crm:         { label: 'CRM',           desc: 'Ver inventario, unidades y seguimiento comercial.' },
  view_analytics:   { label: 'Analytics',     desc: 'Revisar visitas, actividad y métricas de tours.' },
  manage_sales_hub: { label: 'Kit comercial', desc: 'Subir materiales y publicar novedades del equipo.' },
  manage_team:      { label: 'Equipo',        desc: 'Invitar asesores. Solo el dueño puede crear admins.' },
};

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermission[] = [...ADMIN_PERMISSIONS];

export function normalizeAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AdminPermission =>
    typeof item === 'string' && (ADMIN_PERMISSIONS as readonly string[]).includes(item)
  );
}

export function getUserAdminPermissions(user: User | null): AdminPermission[] {
  if (!user) return [];
  return normalizeAdminPermissions(user.user_metadata?.team_permissions);
}

export function isSubscriptionOwner(user: User | null): boolean {
  if (!user) return false;
  return !user.user_metadata?.invited_by;
}

export function hasAdminPermission(user: User | null, permission: AdminPermission): boolean {
  if (!user) return false;
  if (isSubscriptionOwner(user)) return true;
  return getUserAdminPermissions(user).includes(permission);
}
