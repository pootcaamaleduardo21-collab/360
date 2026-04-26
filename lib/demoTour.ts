/**
 * DEMO TOUR — static data (no uuidv4 to avoid SSR/CSR hydration mismatch)
 *
 * Images used (all 4096×2048 equirectangular, CORS: access-control-allow-origin: *):
 *  INTERIOR — Pannellum BMA demo (Baltimore Museum of Art interior)
 *    https://pannellum.org/images/bma-1.jpg
 *
 *  EXTERIOR  — A-Frame CDN (Sechelt BC, Canada: coastal landscape, equirectangular)
 *    https://cdn.aframe.io/360-image-gallery-boilerplate/img/sechelt.jpg
 *
 *  TERRACE — A-Frame CDN (San Francisco city skyline panorama)
 *    https://cdn.aframe.io/360-image-gallery-boilerplate/img/city.jpg
 */

import { Tour } from '@/types/tour.types';

const IMG_INTERIOR =
  'https://pannellum.org/images/bma-1.jpg';

const IMG_EXTERIOR =
  'https://cdn.aframe.io/360-image-gallery-boilerplate/img/sechelt.jpg';

const IMG_TERRACE =
  'https://cdn.aframe.io/360-image-gallery-boilerplate/img/city.jpg';

// Static scene IDs
const S1 = 'demo-scene-sala';
const S2 = 'demo-scene-jardin';
const S3 = 'demo-scene-terraza';

export const DEMO_TOUR: Tour = {
  id:             'demo',
  title:          'Penthouse Vista Mar — Demo',
  description:    'Tour virtual interactivo de demostración. Navega las escenas, consulta el inventario y agenda una cita.',
  niche:          'residential',
  initialSceneId: S1,
  brandColor:     '#2563eb',
  brandName:      'Vista Mar Desarrollos',
  tagline:        'Vive en las alturas',
  currency:       'MXN',
  listingType:    'sale',
  createdAt:      '2025-01-01T00:00:00.000Z',
  updatedAt:      '2025-01-01T00:00:00.000Z',

  salesAdvisor: {
    name:  'Carlos Reyes',
    phone: '5215512345678',
    email: 'carlos@vistamar.mx',
    title: 'Asesor inmobiliario senior',
  },

  bookingEnabled: true,
  bookingConfig: {
    method:   'whatsapp',
    phone:    '5215512345678',
    ctaLabel: 'Agendar visita',
  },

  units: [
    {
      id:        'demo-unit-1',
      label:     'PH-A · Piso 14',
      status:    'available',
      price:     8_500_000,
      area:      210,
      bedrooms:  4,
      bathrooms: 4,
      floor:     14,
      sceneId:   S1,
      orientation: 'Vista al mar',
      description: 'Penthouse con doble altura, terraza privada de 80 m² y jacuzzi.',
    },
    {
      id:        'demo-unit-2',
      label:     'PH-B · Piso 14',
      status:    'reserved',
      price:     7_900_000,
      area:      185,
      bedrooms:  3,
      bathrooms: 3,
      floor:     14,
      orientation: 'Vista al jardín',
    },
    {
      id:        'demo-unit-3',
      label:     'Apt 1203',
      status:    'available',
      price:     4_200_000,
      area:      110,
      bedrooms:  3,
      bathrooms: 2,
      floor:     12,
      sceneId:   S3,
    },
    {
      id:        'demo-unit-4',
      label:     'Apt 1102',
      status:    'in-process',
      price:     3_800_000,
      area:      95,
      bedrooms:  2,
      bathrooms: 2,
      floor:     11,
    },
    {
      id:        'demo-unit-5',
      label:     'Apt 801',
      status:    'sold',
      price:     3_200_000,
      area:      85,
      bedrooms:  2,
      bathrooms: 2,
      floor:     8,
    },
  ],

  gallery: [
    { id: 'demo-g1', type: 'image', url: IMG_INTERIOR, title: 'Área social' },
    { id: 'demo-g2', type: 'image', url: IMG_EXTERIOR, title: 'Jardín & Alberca' },
    { id: 'demo-g3', type: 'image', url: IMG_TERRACE,  title: 'Terraza Panorámica' },
  ],

  pointsOfInterest: [
    { id: 'demo-p1', label: 'Colegio Americano',  category: 'school',    distance: '5 min' },
    { id: 'demo-p2', label: 'Centro Comercial',   category: 'mall',      distance: '8 min' },
    { id: 'demo-p3', label: 'Hospital Ángeles',   category: 'hospital',  distance: '10 min' },
    { id: 'demo-p4', label: 'Playa pública',       category: 'beach',     distance: '3 min' },
  ],

  scenes: [
    // ── Escena 1: Sala / Área social ──────────────────────────────────────
    {
      id:           S1,
      name:         'Sala & Área Social',
      imageUrl:     IMG_INTERIOR,
      initialYaw:   0,
      initialPitch: 0,
      hotspots: [
        {
          id:            'demo-h1',
          type:          'navigation',
          label:         'Ver Jardín',
          yaw:           60,
          pitch:         -8,
          targetSceneId: S2,
          iconColor:     '#10b981',
        },
        {
          id:            'demo-h2',
          type:          'navigation',
          label:         'Terraza',
          yaw:           -120,
          pitch:         -5,
          targetSceneId: S3,
          iconColor:     '#f59e0b',
        },
        {
          id:       'demo-h3',
          type:     'info',
          label:    'Acabados premium',
          yaw:      -20,
          pitch:    -10,
          infoText: 'Pisos de mármol Calacatta, techos de 3.20 m de altura y ventanales de piso a techo con vidrio templado de doble acristalamiento.',
        },
        {
          id:       'demo-h4',
          type:     'info',
          label:    'Cocina italiana',
          yaw:      170,
          pitch:    0,
          infoText: 'Cocina integral Boffi con electrodomésticos Sub-Zero y Wolf integrados. Isla central de 3 m con cubierta de cuarzo.',
        },
        {
          id:      'demo-h5',
          type:    'unit',
          label:   'PH-A disponible',
          yaw:     90,
          pitch:   5,
          unitId:  'demo-unit-1',
          iconColor: '#2563eb',
        },
      ],
    },

    // ── Escena 2: Jardín & Alberca ────────────────────────────────────────
    {
      id:           S2,
      name:         'Jardín & Alberca',
      imageUrl:     IMG_EXTERIOR,
      initialYaw:   0,
      initialPitch: -5,
      hotspots: [
        {
          id:            'demo-h6',
          type:          'navigation',
          label:         'Regresar a Sala',
          yaw:           180,
          pitch:         -8,
          targetSceneId: S1,
          iconColor:     '#6366f1',
        },
        {
          id:            'demo-h7',
          type:          'navigation',
          label:         'Ir a Terraza',
          yaw:           -40,
          pitch:         -5,
          targetSceneId: S3,
          iconColor:     '#f59e0b',
        },
        {
          id:       'demo-h8',
          type:     'info',
          label:    'Alberca infinity',
          yaw:      10,
          pitch:    -15,
          infoText: 'Alberca infinity de 25 m con vista al mar. Abierta 6 am – 10 pm. Temperatura regulada automáticamente.',
        },
        {
          id:       'demo-h9',
          type:     'info',
          label:    'Área de asadores',
          yaw:      80,
          pitch:    0,
          infoText: 'Asadores profesionales Weber con zona de comedor exterior para 20 personas. Disponible para reserva en la app del edificio.',
        },
      ],
    },

    // ── Escena 3: Terraza / Vista panorámica ──────────────────────────────
    {
      id:           S3,
      name:         'Terraza Panorámica',
      imageUrl:     IMG_TERRACE,
      initialYaw:   0,
      initialPitch: 0,
      hotspots: [
        {
          id:            'demo-h10',
          type:          'navigation',
          label:         'Volver a Sala',
          yaw:           -30,
          pitch:         -8,
          targetSceneId: S1,
          iconColor:     '#6366f1',
        },
        {
          id:            'demo-h11',
          type:          'navigation',
          label:         'Ver Jardín',
          yaw:           90,
          pitch:         -5,
          targetSceneId: S2,
          iconColor:     '#10b981',
        },
        {
          id:      'demo-h12',
          type:    'unit',
          label:   'Apt 1203',
          yaw:     0,
          pitch:   5,
          unitId:  'demo-unit-3',
          iconColor: '#2563eb',
        },
      ],
    },
  ],
};
