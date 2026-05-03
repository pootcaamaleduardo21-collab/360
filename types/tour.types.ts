// ─── Hotspot ──────────────────────────────────────────────────────────────────

export type HotspotType =
  | 'navigation' // Go to another scene
  | 'info'       // Text/rich-text tooltip
  | 'media'      // Image / video / audio modal
  | 'agent'      // Real estate agent card
  | 'product'    // E-commerce tag (quote cart)
  | 'unit';      // Property/sales unit (real estate, hotels, coworking…)

export interface HotspotMedia {
  type: 'image' | 'video' | 'audio';
  url: string;
  title?: string;
  description?: string;
}

export interface AgentInfo {
  name: string;
  title?: string;
  phone: string;
  email: string;
  photoUrl?: string;
  agency?: string;
  website?: string;
}

export interface ProductTag {
  productId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  sku?: string;
}

export interface Hotspot {
  id: string;
  type: HotspotType;
  label: string;

  // Spherical coordinates (degrees)
  yaw: number;   // horizontal — 0° is front, +90° right, -90° left, ±180° back
  pitch: number; // vertical — 0° is horizon, +90° up, -90° down

  // Per-type payloads
  targetSceneId?: string;  // 'navigation'
  infoText?: string;       // 'info'
  media?: HotspotMedia;    // 'media'
  agent?: AgentInfo;       // 'agent'
  product?: ProductTag;    // 'product'
  unitId?: string;         // 'unit' → references PropertyUnit.id

  // Visual overrides
  iconColor?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export interface ColorAdjustments {
  brightness: number;   // -100 to +100, default 0
  contrast: number;     // -100 to +100, default 0
  saturation: number;   // -100 to +100, default 0
  temperature?: number; // -100 (cool/blue) to +100 (warm/amber), default 0
  vignette?: number;    // 0 (none) to 100 (strong dark edges)
}

// ─── Scene measurements ───────────────────────────────────────────────────────

export interface SceneMeasurements {
  width?: number;    // meters
  length?: number;   // meters
  height?: number;   // meters (ceiling height)
  area?: number;     // m² — can be set manually or auto-calculated from width × length
  label?: string;    // e.g. "Recámara principal", "Suite Deluxe"
}

export interface Scene {
  id: string;
  name: string;
  imageUrl: string;       // Equirectangular (2:1 ratio) image URL or blob URL
  thumbnailUrl?: string;
  hotspots: Hotspot[];
  colorAdjustments?: ColorAdjustments;
  nadirEnabled?: boolean;
  nadirLogoUrl?: string;
  nadirPatchColor?: string;   // Background fill color (default '#ffffff')
  nadirPatchRadius?: number;  // Radius as fraction of image height (default 0.085)
  originalImageUrl?: string;  // Pre-patch URL — used to restore or re-apply with new settings
  initialYaw?: number;    // Starting camera direction
  initialPitch?: number;
  audioGuideUrl?: string;                   // Auto-play narration when entering this scene
  audioGuideUrls?: Record<string, string>;  // Multi-language: { es: '...', en: '...' }
  measurements?: SceneMeasurements;         // Room/space dimensions shown in viewer
}

// ─── Floor plan / Minimap ─────────────────────────────────────────────────────

export type RoomType =
  // Residential
  | 'sala' | 'cocina' | 'recamara' | 'bano' | 'comedor'
  | 'oficina' | 'terraza' | 'entrada' | 'estudio'
  | 'garage' | 'jardin' | 'alberca' | 'lavanderia' | 'bodega'
  // Hotel
  | 'lobby' | 'suite' | 'gym' | 'spa' | 'restaurante' | 'bar'
  // Commercial / Coworking
  | 'sala_conferencias' | 'area_trabajo' | 'recepcion'
  | 'otro';

export interface FloorPlanMarker {
  sceneId: string;
  x: number;       // Percentage (0-100) on floor plan image
  y: number;
  label?: string;
  roomType?: RoomType;
}

// ─── Points of Interest ───────────────────────────────────────────────────────

export type POICategory =
  | 'school' | 'mall' | 'hospital' | 'restaurant'
  | 'transport' | 'park' | 'gym' | 'supermarket' | 'bank'
  | 'church' | 'beach' | 'airport' | 'hotel' | 'other';

export interface PointOfInterest {
  id: string;
  label: string;
  category: POICategory;
  distance?: string;    // "5 min", "2.3 km"
  description?: string;
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;           // Direct URL or YouTube/Vimeo embed URL
  thumbnail?: string;    // Optional preview image for videos
  title?: string;
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export interface BookingConfig {
  method: 'whatsapp' | 'email' | 'calendly';
  phone?: string;           // WhatsApp international format
  email?: string;           // mailto recipient
  calendlyUrl?: string;     // Calendly embed/redirect URL
  ctaLabel?: string;        // Button label override
}

// ─── Social / Branding ───────────────────────────────────────────────────────

export interface SocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  whatsapp?: string;    // General contact (not advisor-specific)
  youtube?: string;
  tiktok?: string;
}

// ─── Tour ─────────────────────────────────────────────────────────────────────

export type PropertyStatus = 'available' | 'sold' | 'reserved' | 'in-process';

// Single customizable amenity / feature (kitchen, pool, parking, etc.)
export interface UnitAmenity {
  id: string;
  label: string;
  icon?: string; // emoji: "🍳", "🏊", "🅿️" …
}

// Reusable unit template — units inherit bedrooms, floor plan, amenities from here
export interface UnitPrototype {
  id: string;
  name: string;          // e.g. "Tipo A — 2 Rec", "Suite Junior"
  area?: number;         // m²
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  description?: string;
  floorPlanUrl?: string;
  amenities?: UnitAmenity[];
  priceFrom?: number;
}

export interface PropertyUnit {
  id: string;
  label: string;         // e.g. "Apt 3A", "Office 12", "Suite 302"
  status: PropertyStatus;
  price?: number;
  currency?: string;     // overrides tour.currency
  area?: number;         // m² — overrides prototype
  bedrooms?: number;     // overrides prototype
  bathrooms?: number;    // overrides prototype
  parking?: number;      // overrides prototype
  floor?: number;
  orientation?: string;  // "Norte", "Sur-Oriente", "Garden view"
  description?: string;  // overrides prototype
  floorPlanUrl?: string; // overrides prototype floor plan
  amenities?: UnitAmenity[]; // overrides prototype amenities
  prototypeId?: string;  // links to UnitPrototype
  sceneId?: string;      // links to interior 360° scene
}

// Sales advisor contact — used for WhatsApp CTAs
export interface SalesAdvisor {
  name: string;
  phone: string;         // WhatsApp: international format e.g. +5215512345678
  email?: string;
  photoUrl?: string;
  title?: string;        // "Asesor Inmobiliario"
  company?: string;
}

export interface Tour {
  id: string;
  title: string;
  description?: string;
  niche?: string;             // NicheType — string to avoid circular imports
  scenes: Scene[];
  initialSceneId: string;

  // Floor plan / minimap
  floorPlanUrl?: string;
  floorPlanMarkers?: FloorPlanMarker[];

  // Sales plan — unit inventory, prototypes, advisor
  units?: PropertyUnit[];
  unitPrototypes?: UnitPrototype[];
  salesAdvisor?: SalesAdvisor;
  currency?: string;          // Default currency: 'MXN', 'USD', 'EUR' …
  listingType?: 'sale' | 'rent' | 'mixed';

  // Sales panel content
  gallery?: GalleryItem[];
  brochureUrl?: string;           // PDF or image URL
  brochureFilename?: string;
  pointsOfInterest?: PointOfInterest[];

  // Branding
  brandColor?: string;
  brandName?: string;             // Company / developer name
  tagline?: string;
  logoUrl?: string;
  socialLinks?: SocialLinks;

  // Access control
  passwordEnabled?: boolean;
  passwordHash?: string;   // SHA-256 hex of the access password

  // Lead capture
  leadCaptureEnabled?: boolean;
  leadCaptureLabel?: string;   // CTA button label override (default: "Solicitar información")

  // Booking / appointment scheduling
  bookingEnabled?: boolean;
  bookingConfig?: BookingConfig;

  // Meta
  createdAt: string;
  updatedAt: string;
}

// ─── Cart (E-commerce / Quote) ────────────────────────────────────────────────

export interface CartItem {
  product: ProductTag;
  quantity: number;
  sceneId: string;
  hotspotId: string;
}

// ─── Viewer configuration ─────────────────────────────────────────────────────

export interface ViewerConfig {
  autoRotate: boolean;
  autoRotateSpeed: number; // degrees per second
  fov: number;             // degrees (initial field of view)
  minFov: number;
  maxFov: number;
  showControls: boolean;
  showMinimap: boolean;
  showTutorial: boolean;
}

export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
  autoRotate: false,
  autoRotateSpeed: 5,
  fov: 75,
  minFov: 30,
  maxFov: 100,
  showControls: true,
  showMinimap: true,
  showTutorial: true,
};
