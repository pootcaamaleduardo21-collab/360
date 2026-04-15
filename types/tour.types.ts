// ─── Hotspot ──────────────────────────────────────────────────────────────────

export type HotspotType =
  | 'navigation' // Go to another scene
  | 'info'       // Text/rich-text tooltip
  | 'media'      // Image / video / audio modal
  | 'agent'      // Real estate agent card
  | 'product';   // E-commerce tag (quote cart)

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

  // Visual overrides
  iconColor?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export interface ColorAdjustments {
  brightness: number; // -100 to +100, default 0
  contrast: number;   // -100 to +100, default 0
  saturation: number; // -100 to +100, default 0
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
  initialYaw?: number;    // Starting camera direction
  initialPitch?: number;
}

// ─── Floor plan / Minimap ─────────────────────────────────────────────────────

export interface FloorPlanMarker {
  sceneId: string;
  x: number; // Percentage (0-100) on floor plan image
  y: number;
  label?: string;
}

// ─── Tour ─────────────────────────────────────────────────────────────────────

export type PropertyStatus = 'available' | 'sold' | 'reserved';

export interface PropertyUnit {
  id: string;
  label: string;         // e.g. "Apt 3A"
  status: PropertyStatus;
  price?: number;
  area?: number;         // m²
  sceneId?: string;      // Links to tour scene
}

export interface Tour {
  id: string;
  title: string;
  description?: string;
  scenes: Scene[];
  initialSceneId: string;

  // Floor plan / minimap
  floorPlanUrl?: string;
  floorPlanMarkers?: FloorPlanMarker[];

  // Real estate inventory
  units?: PropertyUnit[];

  // Branding
  brandColor?: string;
  logoUrl?: string;

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
