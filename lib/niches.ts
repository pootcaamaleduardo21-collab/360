import { Tour } from '@/types/tour.types';

// ─── Niche types ──────────────────────────────────────────────────────────────

export type NicheType =
  | 'residential'   // Real estate: apartments, houses, developments
  | 'hotel'         // Hotels, resorts, vacation rentals, B&Bs
  | 'automotive'    // Car dealerships, showrooms
  | 'venue'         // Event spaces, wedding halls, auditoriums
  | 'restaurant'    // Restaurants, cafes, bars, dark kitchens
  | 'education'     // Schools, universities, campuses
  | 'retail'        // Stores, boutiques, showrooms, furniture
  | 'coworking'     // Coworking spaces, office rentals
  | 'health'        // Clinics, hospitals, wellness centers
  | 'museum';       // Museums, art galleries, exhibitions

// ─── Niche config schema ─────────────────────────────────────────────────────

export interface NicheConfig {
  label: string;
  emoji: string;
  description: string;

  // Core vocabulary
  unitLabel: string;         // singular — "Unidad", "Habitación", "Vehículo"
  unitLabelPlural: string;   // plural  — "Unidades", "Habitaciones"

  // Status vocabulary (maps to PropertyStatus)
  statusLabels: {
    available:    string;    // "Disponible", "Libre", "En stock"
    sold:         string;    // "Vendido", "Ocupado", "Agotado"
    reserved:     string;    // "Reservado", "Apartado"
    'in-process': string;    // "En proceso", "En trámite", "Bajo pedido"
  };

  // Panel / UI vocabulary
  salesPanelTitle: string;   // Tab label in SalesPanel — "Viviendas", "Habitaciones"
  priceLabel:      string;   // "Precio", "Tarifa / noche", "Precio lista"
  ctaLabel:        string;   // Primary CTA — "Me interesa", "Reservar", "Agendar visita"
  ctaAdvisorLabel: string;   // WhatsApp message prefix — "Asesor", "Concierge"
  floorPlanLabel:  string;   // "Plano de unidad", "Distribución", "Ficha técnica"
  inventoryTitle:  string;   // Editor tab — "Inventario", "Catálogo", "Habitaciones"
  prototypeLabel:  string;   // "Prototipo", "Tipo de habitación", "Modelo"
  advisorLabel:    string;   // "Asesor", "Concierge", "Ejecutivo de ventas"
  overlayCountLabel: string; // "X unidades", "X habitaciones" in InventoryOverlay

  // Defaults
  defaultPOIs:      string[];  // POI categories ordered by relevance for this niche
  primaryRoomTypes: string[];  // Room types shown first in floor plan editor
}

// ─── Config per niche ─────────────────────────────────────────────────────────

export const NICHE_CONFIG: Record<NicheType, NicheConfig> = {

  residential: {
    label: 'Real Estate',
    emoji: '🏠',
    description: 'Desarrollos, departamentos, casas, locales comerciales',
    unitLabel:        'Unidad',
    unitLabelPlural:  'Unidades',
    statusLabels:     { available: 'Disponible', sold: 'Vendido', reserved: 'Reservado', 'in-process': 'En proceso' },
    salesPanelTitle:  'Viviendas',
    priceLabel:       'Precio',
    ctaLabel:         'Me interesa',
    ctaAdvisorLabel:  'Asesor',
    floorPlanLabel:   'Plano de unidad',
    inventoryTitle:   'Inventario',
    prototypeLabel:   'Prototipo',
    advisorLabel:     'Asesor inmobiliario',
    overlayCountLabel:'unidades',
    defaultPOIs:      ['school', 'mall', 'park', 'transport', 'supermarket', 'hospital'],
    primaryRoomTypes: ['recamara', 'sala', 'cocina', 'bano', 'terraza', 'garage'],
  },

  hotel: {
    label: 'Hotelería',
    emoji: '🏨',
    description: 'Hoteles, resorts, villas, B&B, renta vacacional',
    unitLabel:        'Habitación',
    unitLabelPlural:  'Habitaciones',
    statusLabels:     { available: 'Disponible', sold: 'Ocupada', reserved: 'Reservada', 'in-process': 'En mantenimiento' },
    salesPanelTitle:  'Habitaciones',
    priceLabel:       'Tarifa / noche',
    ctaLabel:         'Reservar',
    ctaAdvisorLabel:  'Concierge',
    floorPlanLabel:   'Distribución',
    inventoryTitle:   'Habitaciones',
    prototypeLabel:   'Tipo de habitación',
    advisorLabel:     'Concierge',
    overlayCountLabel:'habitaciones',
    defaultPOIs:      ['restaurant', 'beach', 'park', 'transport', 'mall', 'airport'],
    primaryRoomTypes: ['suite', 'bano', 'lobby', 'gym', 'spa', 'alberca', 'restaurante'],
  },

  automotive: {
    label: 'Automotriz',
    emoji: '🚗',
    description: 'Agencias, showrooms, distribuidores de autos',
    unitLabel:        'Vehículo',
    unitLabelPlural:  'Vehículos',
    statusLabels:     { available: 'Disponible', sold: 'Vendido', reserved: 'Apartado', 'in-process': 'En trámite' },
    salesPanelTitle:  'Inventario',
    priceLabel:       'Precio lista',
    ctaLabel:         'Solicitar cotización',
    ctaAdvisorLabel:  'Ejecutivo',
    floorPlanLabel:   'Ficha técnica',
    inventoryTitle:   'Vehículos',
    prototypeLabel:   'Modelo',
    advisorLabel:     'Ejecutivo de ventas',
    overlayCountLabel:'vehículos',
    defaultPOIs:      ['bank', 'supermarket', 'other'],
    primaryRoomTypes: ['showroom', 'oficina', 'bodega', 'recepcion'],
  },

  venue: {
    label: 'Venues / Eventos',
    emoji: '🎉',
    description: 'Salones de bodas, auditorios, jardines, terrazas',
    unitLabel:        'Espacio',
    unitLabelPlural:  'Espacios',
    statusLabels:     { available: 'Disponible', sold: 'Reservado', reserved: 'Bloqueado', 'in-process': 'En cotización' },
    salesPanelTitle:  'Espacios',
    priceLabel:       'Precio por evento',
    ctaLabel:         'Reservar fecha',
    ctaAdvisorLabel:  'Coordinador',
    floorPlanLabel:   'Plano del espacio',
    inventoryTitle:   'Espacios',
    prototypeLabel:   'Tipo de espacio',
    advisorLabel:     'Coordinador de eventos',
    overlayCountLabel:'espacios',
    defaultPOIs:      ['hotel', 'restaurant', 'transport', 'airport', 'church'],
    primaryRoomTypes: ['sala', 'terraza', 'jardin', 'lobby', 'bano', 'cocina'],
  },

  restaurant: {
    label: 'Restaurantes',
    emoji: '🍽️',
    description: 'Restaurantes, cafés, bares, rooftops, dark kitchens',
    unitLabel:        'Área',
    unitLabelPlural:  'Áreas',
    statusLabels:     { available: 'Disponible', sold: 'Ocupada', reserved: 'Reservada', 'in-process': 'En preparación' },
    salesPanelTitle:  'Áreas',
    priceLabel:       'Precio por persona',
    ctaLabel:         'Reservar mesa',
    ctaAdvisorLabel:  'Maître',
    floorPlanLabel:   'Mapa del restaurante',
    inventoryTitle:   'Áreas',
    prototypeLabel:   'Tipo de área',
    advisorLabel:     'Maître / Anfitrión',
    overlayCountLabel:'áreas',
    defaultPOIs:      ['transport', 'park', 'mall', 'hotel'],
    primaryRoomTypes: ['sala', 'terraza', 'bar', 'cocina', 'bano', 'entrada'],
  },

  education: {
    label: 'Educación',
    emoji: '🎓',
    description: 'Escuelas, universidades, campus, centros de capacitación',
    unitLabel:        'Área',
    unitLabelPlural:  'Instalaciones',
    statusLabels:     { available: 'Disponible', sold: 'Ocupada', reserved: 'Reservada', 'in-process': 'En remodelación' },
    salesPanelTitle:  'Instalaciones',
    priceLabel:       'Colegiatura desde',
    ctaLabel:         'Solicitar informes',
    ctaAdvisorLabel:  'Orientador',
    floorPlanLabel:   'Plano del edificio',
    inventoryTitle:   'Espacios',
    prototypeLabel:   'Tipo de aula',
    advisorLabel:     'Orientador vocacional',
    overlayCountLabel:'instalaciones',
    defaultPOIs:      ['transport', 'supermarket', 'park', 'restaurant', 'bank'],
    primaryRoomTypes: ['sala_conferencias', 'area_trabajo', 'gym', 'alberca', 'bano', 'lobby'],
  },

  retail: {
    label: 'Retail / Showroom',
    emoji: '🛍️',
    description: 'Tiendas, boutiques, showrooms, mueblerías, galerías comerciales',
    unitLabel:        'Producto',
    unitLabelPlural:  'Productos',
    statusLabels:     { available: 'En stock', sold: 'Agotado', reserved: 'Apartado', 'in-process': 'Bajo pedido' },
    salesPanelTitle:  'Catálogo',
    priceLabel:       'Precio',
    ctaLabel:         'Comprar / Consultar',
    ctaAdvisorLabel:  'Asesor',
    floorPlanLabel:   'Mapa de la tienda',
    inventoryTitle:   'Catálogo',
    prototypeLabel:   'Categoría',
    advisorLabel:     'Asesor de ventas',
    overlayCountLabel:'productos',
    defaultPOIs:      ['mall', 'transport', 'restaurant', 'bank'],
    primaryRoomTypes: ['showroom', 'bodega', 'oficina', 'bano', 'recepcion'],
  },

  coworking: {
    label: 'Coworking / Oficinas',
    emoji: '💼',
    description: 'Coworkings, renta de oficinas, centros de negocios',
    unitLabel:        'Espacio',
    unitLabelPlural:  'Espacios',
    statusLabels:     { available: 'Disponible', sold: 'Ocupado', reserved: 'Reservado', 'in-process': 'En contrato' },
    salesPanelTitle:  'Espacios',
    priceLabel:       'Renta mensual',
    ctaLabel:         'Agendar visita',
    ctaAdvisorLabel:  'Community Manager',
    floorPlanLabel:   'Plano del piso',
    inventoryTitle:   'Oficinas',
    prototypeLabel:   'Tipo de espacio',
    advisorLabel:     'Community Manager',
    overlayCountLabel:'espacios',
    defaultPOIs:      ['restaurant', 'transport', 'bank', 'gym', 'mall'],
    primaryRoomTypes: ['area_trabajo', 'sala_conferencias', 'oficina', 'cocina', 'terraza', 'recepcion'],
  },

  health: {
    label: 'Salud',
    emoji: '🏥',
    description: 'Clínicas, hospitales, centros de bienestar y rehabilitación',
    unitLabel:        'Consultorio',
    unitLabelPlural:  'Consultorios',
    statusLabels:     { available: 'Disponible', sold: 'Ocupado', reserved: 'Reservado', 'in-process': 'En proceso' },
    salesPanelTitle:  'Instalaciones',
    priceLabel:       'Consulta desde',
    ctaLabel:         'Agendar cita',
    ctaAdvisorLabel:  'Recepcionista',
    floorPlanLabel:   'Mapa de la clínica',
    inventoryTitle:   'Áreas',
    prototypeLabel:   'Tipo de consultorio',
    advisorLabel:     'Coordinador médico',
    overlayCountLabel:'consultorios',
    defaultPOIs:      ['transport', 'supermarket', 'bank', 'restaurant', 'park'],
    primaryRoomTypes: ['recepcion', 'sala', 'bano', 'spa', 'gym', 'entrada'],
  },

  museum: {
    label: 'Museos / Galerías',
    emoji: '🏛️',
    description: 'Museos, galerías de arte, exposiciones, sitios históricos',
    unitLabel:        'Sala',
    unitLabelPlural:  'Salas',
    statusLabels:     { available: 'Abierta', sold: 'Cerrada', reserved: 'Reservada', 'in-process': 'En montaje' },
    salesPanelTitle:  'Salas',
    priceLabel:       'Admisión',
    ctaLabel:         'Comprar boleto',
    ctaAdvisorLabel:  'Guía',
    floorPlanLabel:   'Mapa del museo',
    inventoryTitle:   'Salas',
    prototypeLabel:   'Tipo de sala',
    advisorLabel:     'Guía / Curador',
    overlayCountLabel:'salas',
    defaultPOIs:      ['restaurant', 'transport', 'park', 'other'],
    primaryRoomTypes: ['sala', 'lobby', 'terraza', 'bodega', 'bano', 'recepcion'],
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Returns the niche config for a tour, defaulting to residential. */
export function getNiche(tour: Pick<Tour, 'niche'>): NicheConfig {
  return NICHE_CONFIG[(tour.niche as NicheType) ?? 'residential'];
}

export const NICHE_LIST = Object.entries(NICHE_CONFIG) as [NicheType, NicheConfig][];
