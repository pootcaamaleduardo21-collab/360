import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  Tour,
  Scene,
  Hotspot,
  HotspotType,
  CartItem,
  ProductTag,
  ViewerConfig,
  DEFAULT_VIEWER_CONFIG,
} from '@/types/tour.types';

// ─── Editor slice ─────────────────────────────────────────────────────────────

interface EditorState {
  tour: Tour | null;
  currentSceneId: string | null;
  selectedHotspotId: string | null;
  isEditing: boolean;

  // Actions
  initTour: (title: string) => void;
  loadTour: (tour: Tour) => void;
  updateTour: (patch: Partial<Omit<Tour, 'id' | 'scenes'>>) => void;

  addScene: (imageUrl: string, name?: string) => string;
  updateScene: (sceneId: string, patch: Partial<Omit<Scene, 'id' | 'hotspots'>>) => void;
  removeScene: (sceneId: string) => void;
  setCurrentScene: (sceneId: string) => void;

  addHotspot: (sceneId: string, type: HotspotType, yaw: number, pitch: number) => string;
  updateHotspot: (sceneId: string, hotspotId: string, patch: Partial<Omit<Hotspot, 'id'>>) => void;
  removeHotspot: (sceneId: string, hotspotId: string) => void;
  selectHotspot: (hotspotId: string | null) => void;

  setEditing: (value: boolean) => void;
}

// ─── Viewer slice ─────────────────────────────────────────────────────────────

interface ViewerState {
  currentSceneId: string | null;
  previousSceneId: string | null;
  viewerConfig: ViewerConfig;
  tutorialDismissed: boolean;

  navigateTo: (sceneId: string) => void;
  updateViewerConfig: (patch: Partial<ViewerConfig>) => void;
  dismissTutorial: () => void;
}

// ─── Cart slice ───────────────────────────────────────────────────────────────

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;

  addToCart: (product: ProductTag, sceneId: string, hotspotId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
}

// ─── Combined store ───────────────────────────────────────────────────────────

type TourStore = EditorState & ViewerState & CartState;

export const useTourStore = create<TourStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ── Editor ──────────────────────────────────────────────────────────

        tour: null,
        currentSceneId: null,
        selectedHotspotId: null,
        isEditing: false,

        initTour: (title) => {
          const id = uuidv4();
          const tour: Tour = {
            id,
            title,
            scenes: [],
            initialSceneId: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set({ tour, currentSceneId: null });
        },

        loadTour: (tour) => set({ tour, currentSceneId: tour.initialSceneId }),

        updateTour: (patch) =>
          set((s) => ({
            tour: s.tour
              ? { ...s.tour, ...patch, updatedAt: new Date().toISOString() }
              : null,
          })),

        addScene: (imageUrl, name) => {
          const id = uuidv4();
          const scene: Scene = {
            id,
            name: name ?? `Escena ${(get().tour?.scenes.length ?? 0) + 1}`,
            imageUrl,
            hotspots: [],
          };
          set((s) => {
            const scenes = [...(s.tour?.scenes ?? []), scene];
            const isFirst = scenes.length === 1;
            return {
              tour: s.tour
                ? {
                    ...s.tour,
                    scenes,
                    initialSceneId: isFirst ? id : s.tour.initialSceneId,
                    updatedAt: new Date().toISOString(),
                  }
                : null,
              currentSceneId: isFirst ? id : s.currentSceneId,
            };
          });
          return id;
        },

        updateScene: (sceneId, patch) =>
          set((s) => ({
            tour: s.tour
              ? {
                  ...s.tour,
                  scenes: s.tour.scenes.map((sc) =>
                    sc.id === sceneId ? { ...sc, ...patch } : sc
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : null,
          })),

        removeScene: (sceneId) =>
          set((s) => {
            if (!s.tour) return {};
            const scenes = s.tour.scenes.filter((sc) => sc.id !== sceneId);
            const newCurrentId =
              s.currentSceneId === sceneId
                ? (scenes[0]?.id ?? null)
                : s.currentSceneId;
            return {
              tour: {
                ...s.tour,
                scenes,
                initialSceneId:
                  s.tour.initialSceneId === sceneId
                    ? (scenes[0]?.id ?? '')
                    : s.tour.initialSceneId,
                updatedAt: new Date().toISOString(),
              },
              currentSceneId: newCurrentId,
            };
          }),

        setCurrentScene: (sceneId) => set({ currentSceneId: sceneId }),

        addHotspot: (sceneId, type, yaw, pitch) => {
          const id = uuidv4();
          const hotspot: Hotspot = {
            id,
            type,
            label: type === 'navigation' ? 'Ir a escena' : 'Punto de interés',
            yaw,
            pitch,
          };
          set((s) => ({
            tour: s.tour
              ? {
                  ...s.tour,
                  scenes: s.tour.scenes.map((sc) =>
                    sc.id === sceneId
                      ? { ...sc, hotspots: [...sc.hotspots, hotspot] }
                      : sc
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : null,
            selectedHotspotId: id,
          }));
          return id;
        },

        updateHotspot: (sceneId, hotspotId, patch) =>
          set((s) => ({
            tour: s.tour
              ? {
                  ...s.tour,
                  scenes: s.tour.scenes.map((sc) =>
                    sc.id === sceneId
                      ? {
                          ...sc,
                          hotspots: sc.hotspots.map((h) =>
                            h.id === hotspotId ? { ...h, ...patch } : h
                          ),
                        }
                      : sc
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : null,
          })),

        removeHotspot: (sceneId, hotspotId) =>
          set((s) => ({
            tour: s.tour
              ? {
                  ...s.tour,
                  scenes: s.tour.scenes.map((sc) =>
                    sc.id === sceneId
                      ? {
                          ...sc,
                          hotspots: sc.hotspots.filter((h) => h.id !== hotspotId),
                        }
                      : sc
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : null,
            selectedHotspotId:
              s.selectedHotspotId === hotspotId ? null : s.selectedHotspotId,
          })),

        selectHotspot: (hotspotId) => set({ selectedHotspotId: hotspotId }),

        setEditing: (value) => set({ isEditing: value }),

        // ── Viewer ─────────────────────────────────────────────────────────

        previousSceneId: null,
        viewerConfig: DEFAULT_VIEWER_CONFIG,
        tutorialDismissed: false,

        navigateTo: (sceneId) =>
          set((s) => ({
            previousSceneId: s.currentSceneId,
            currentSceneId: sceneId,
            selectedHotspotId: null,
          })),

        updateViewerConfig: (patch) =>
          set((s) => ({ viewerConfig: { ...s.viewerConfig, ...patch } })),

        dismissTutorial: () => set({ tutorialDismissed: true }),

        // ── Cart ───────────────────────────────────────────────────────────

        items: [],
        isCartOpen: false,

        addToCart: (product, sceneId, hotspotId) =>
          set((s) => {
            const existing = s.items.find((i) => i.product.productId === product.productId);
            if (existing) {
              return {
                items: s.items.map((i) =>
                  i.product.productId === product.productId
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
                ),
              };
            }
            return {
              items: [...s.items, { product, quantity: 1, sceneId, hotspotId }],
            };
          }),

        removeFromCart: (productId) =>
          set((s) => ({
            items: s.items.filter((i) => i.product.productId !== productId),
          })),

        updateQuantity: (productId, quantity) =>
          set((s) => ({
            items:
              quantity <= 0
                ? s.items.filter((i) => i.product.productId !== productId)
                : s.items.map((i) =>
                    i.product.productId === productId ? { ...i, quantity } : i
                  ),
          })),

        clearCart: () => set({ items: [] }),
        toggleCart: () => set((s) => ({ isCartOpen: !s.isCartOpen })),
      }),
      {
        name: 'tour360-store',
        // Only persist viewer preferences and cart, not the full tour (managed separately)
        partialize: (s) => ({
          viewerConfig: s.viewerConfig,
          tutorialDismissed: s.tutorialDismissed,
          items: s.items,
        }),
      }
    )
  )
);

// ── Selectors ──────────────────────────────────────────────────────────────────

export const selectCurrentScene = (s: TourStore): Scene | null =>
  s.tour?.scenes.find((sc) => sc.id === s.currentSceneId) ?? null;

export const selectSelectedHotspot = (s: TourStore): Hotspot | null => {
  const scene = selectCurrentScene(s);
  if (!scene || !s.selectedHotspotId) return null;
  return scene.hotspots.find((h) => h.id === s.selectedHotspotId) ?? null;
};

export const selectCartTotal = (s: TourStore): number =>
  s.items.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
