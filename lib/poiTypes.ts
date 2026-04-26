import { POICategory } from '@/types/tour.types';

export interface POIConfig {
  label: string;
  emoji: string;
  color: string;
}

export const POI_CONFIG: Record<POICategory, POIConfig> = {
  school:      { label: 'Escuela / Universidad', emoji: '🏫', color: '#3b82f6' },
  mall:        { label: 'Centro comercial',       emoji: '🛒', color: '#f59e0b' },
  hospital:    { label: 'Hospital / Clínica',     emoji: '🏥', color: '#ef4444' },
  restaurant:  { label: 'Restaurante / Café',     emoji: '🍴', color: '#f97316' },
  transport:   { label: 'Transporte público',     emoji: '🚇', color: '#8b5cf6' },
  park:        { label: 'Parque / Área verde',    emoji: '🌳', color: '#22c55e' },
  gym:         { label: 'Gimnasio / Deporte',     emoji: '💪', color: '#dc2626' },
  supermarket: { label: 'Supermercado',           emoji: '🛍️', color: '#84cc16' },
  bank:        { label: 'Banco / ATM',            emoji: '🏦', color: '#0891b2' },
  church:      { label: 'Iglesia / Templo',       emoji: '⛪', color: '#6366f1' },
  beach:       { label: 'Playa / Lago',           emoji: '🏖️', color: '#38bdf8' },
  airport:     { label: 'Aeropuerto',             emoji: '✈️', color: '#475569' },
  hotel:       { label: 'Hotel',                  emoji: '🏨', color: '#be185d' },
  other:       { label: 'Otro',                   emoji: '📍', color: '#9ca3af' },
};
