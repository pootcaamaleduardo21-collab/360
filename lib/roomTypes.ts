import { RoomType } from '@/types/tour.types';

export interface RoomConfig {
  label: string;
  color: string;  // hex
  emoji: string;  // unicode emoji used as the map pin icon
  niche: string[]; // which niches this room type applies to
}

export const ROOM_CONFIG: Record<RoomType, RoomConfig> = {
  // ── Residential ──────────────────────────────────────────────────────────────
  sala:             { label: 'Sala',                 color: '#3b82f6', emoji: '🛋️', niche: ['residential', 'hotel'] },
  cocina:           { label: 'Cocina',               color: '#f59e0b', emoji: '🍳', niche: ['residential', 'hotel'] },
  recamara:         { label: 'Recámara',             color: '#8b5cf6', emoji: '🛏️', niche: ['residential'] },
  bano:             { label: 'Baño',                 color: '#06b6d4', emoji: '🚿', niche: ['residential', 'hotel', 'commercial'] },
  comedor:          { label: 'Comedor',              color: '#10b981', emoji: '🍽️', niche: ['residential', 'hotel'] },
  oficina:          { label: 'Oficina',              color: '#6366f1', emoji: '💼', niche: ['residential', 'commercial', 'coworking'] },
  terraza:          { label: 'Terraza',              color: '#84cc16', emoji: '🌿', niche: ['residential', 'hotel'] },
  entrada:          { label: 'Entrada',              color: '#f97316', emoji: '🚪', niche: ['residential', 'commercial', 'hotel'] },
  estudio:          { label: 'Estudio',              color: '#ec4899', emoji: '📚', niche: ['residential', 'coworking'] },
  garage:           { label: 'Garage',               color: '#78716c', emoji: '🚗', niche: ['residential'] },
  jardin:           { label: 'Jardín',               color: '#22c55e', emoji: '🌳', niche: ['residential', 'hotel'] },
  alberca:          { label: 'Alberca / Piscina',    color: '#38bdf8', emoji: '🏊', niche: ['residential', 'hotel'] },
  lavanderia:       { label: 'Lavandería',           color: '#a3a3a3', emoji: '👕', niche: ['residential', 'hotel'] },
  bodega:           { label: 'Bodega',               color: '#a16207', emoji: '📦', niche: ['residential', 'commercial'] },
  // ── Hotel ────────────────────────────────────────────────────────────────────
  lobby:            { label: 'Lobby',                color: '#f43f5e', emoji: '🏨', niche: ['hotel', 'commercial'] },
  suite:            { label: 'Suite',                color: '#7c3aed', emoji: '👑', niche: ['hotel'] },
  gym:              { label: 'Gimnasio',             color: '#dc2626', emoji: '💪', niche: ['hotel', 'commercial'] },
  spa:              { label: 'Spa',                  color: '#db2777', emoji: '🧖', niche: ['hotel'] },
  restaurante:      { label: 'Restaurante',          color: '#ea580c', emoji: '🍴', niche: ['hotel', 'commercial'] },
  bar:              { label: 'Bar',                  color: '#b45309', emoji: '🍹', niche: ['hotel', 'commercial'] },
  // ── Commercial / Coworking ───────────────────────────────────────────────────
  sala_conferencias:{ label: 'Sala de conferencias', color: '#0891b2', emoji: '📽️', niche: ['commercial', 'coworking'] },
  area_trabajo:     { label: 'Área de trabajo',      color: '#0284c7', emoji: '🖥️', niche: ['coworking'] },
  recepcion:        { label: 'Recepción',            color: '#0369a1', emoji: '🛎️', niche: ['hotel', 'commercial', 'coworking'] },
  // ── Generic ──────────────────────────────────────────────────────────────────
  otro:             { label: 'Otro',                 color: '#9ca3af', emoji: '📍', niche: ['residential', 'hotel', 'commercial', 'coworking'] },
};

export const ROOM_TYPES_BY_NICHE: Record<string, RoomType[]> = {
  residential: ['sala', 'cocina', 'recamara', 'bano', 'comedor', 'estudio', 'terraza', 'entrada', 'garage', 'jardin', 'alberca', 'lavanderia', 'bodega', 'otro'],
  hotel:       ['lobby', 'suite', 'recamara', 'sala', 'bano', 'restaurante', 'bar', 'gym', 'spa', 'alberca', 'terraza', 'jardin', 'recepcion', 'lavanderia', 'otro'],
  commercial:  ['recepcion', 'sala_conferencias', 'oficina', 'bano', 'lobby', 'restaurante', 'gym', 'bodega', 'terraza', 'otro'],
  coworking:   ['area_trabajo', 'sala_conferencias', 'oficina', 'estudio', 'recepcion', 'cocina', 'terraza', 'bano', 'otro'],
};
