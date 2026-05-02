'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTourStore, selectCurrentScene } from '@/store/tourStore';
import { useAuth } from '@/hooks/useAuth';
import { getTourById, saveTour } from '@/lib/db';
import { HotspotType } from '@/types/tour.types';
import { ErrorBoundary }    from '@/components/ErrorBoundary';
import { ImageUploader }    from '@/components/editor/ImageUploader';
import { HotspotPanel }     from '@/components/editor/HotspotPanel';
import { SceneManager }     from '@/components/editor/SceneManager';
import { RetouchPanel }     from '@/components/editor/RetouchPanel';
import { InventoryPanel }   from '@/components/editor/InventoryPanel';
import { EmbedPanel }       from '@/components/editor/EmbedPanel';
import { FloorPlanEditor }  from '@/components/editor/FloorPlanEditor';
import { BrandingPanel }    from '@/components/editor/BrandingPanel';
import { SecurityPanel }    from '@/components/editor/SecurityPanel';
import Link from 'next/link';
import {
  ArrowRight, Info, Image, User, ShoppingCart, Plus, Upload,
  Layers, Home, Globe, ChevronLeft, ChevronRight, LayoutDashboard,
  Loader2, Map, Building2, Palette, Cloud, CloudOff, Check, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Viewer360 = dynamic(
  () => import('@/components/viewer/Viewer360').then((m) => m.Viewer360),
  { ssr: false, loading: () => <ViewerPlaceholder /> }
);

// ─── Hotspot type toolbar ─────────────────────────────────────────────────────

const HOTSPOT_TYPES: { value: HotspotType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'navigation', label: 'Navegar',  icon: <ArrowRight   className="w-4 h-4" />, color: 'bg-blue-600   hover:bg-blue-500'   },
  { value: 'info',       label: 'Info',     icon: <Info         className="w-4 h-4" />, color: 'bg-amber-600  hover:bg-amber-500'  },
  { value: 'media',      label: 'Media',    icon: <Image        className="w-4 h-4" />, color: 'bg-purple-600 hover:bg-purple-500' },
  { value: 'agent',      label: 'Agente',   icon: <User         className="w-4 h-4" />, color: 'bg-green-600   hover:bg-green-500'   },
  { value: 'product',    label: 'Producto', icon: <ShoppingCart className="w-4 h-4" />, color: 'bg-rose-600    hover:bg-rose-500'    },
  { value: 'unit',       label: 'Unidad',   icon: <Building2    className="w-4 h-4" />, color: 'bg-emerald-600 hover:bg-emerald-500' },
];

// ─── Left sidebar tabs ────────────────────────────────────────────────────────

type LeftTab  = 'scenes' | 'upload' | 'floorplan' | 'inventory' | 'branding' | 'security' | 'publish';
type RightTab = 'hotspot' | 'retouch';

const LEFT_TABS: { id: LeftTab; label: string; icon: React.ReactNode }[] = [
  { id: 'scenes',    label: 'Escenas',  icon: <Layers  className="w-3 h-3" /> },
  { id: 'upload',    label: 'Subir',    icon: <Upload  className="w-3 h-3" /> },
  { id: 'floorplan', label: 'Plano',    icon: <Map     className="w-3 h-3" /> },
  { id: 'inventory', label: 'Ventas',   icon: <Home    className="w-3 h-3" /> },
  { id: 'branding',  label: 'Marca',    icon: <Palette className="w-3 h-3" /> },
  { id: 'security',  label: 'Acceso',   icon: <Lock    className="w-3 h-3" /> },
  { id: 'publish',   label: 'Publicar', icon: <Globe   className="w-3 h-3" /> },
];

// ─── Editor page ──────────────────────────────────────────────────────────────

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    }>
      <EditorInner />
    </Suspense>
  );
}

function EditorInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const tourId       = searchParams.get('id');

  const { user } = useAuth();

  const tour              = useTourStore((s) => s.tour);
  const currentScene      = useTourStore(selectCurrentScene);
  const currentSceneId    = useTourStore((s) => s.currentSceneId);
  const selectedHotspotId = useTourStore((s) => s.selectedHotspotId);
  const viewerConfig      = useTourStore((s) => s.viewerConfig);

  const initTour     = useTourStore((s) => s.initTour);
  const loadTour     = useTourStore((s) => s.loadTour);
  const addScene     = useTourStore((s) => s.addScene);
  const updateScene  = useTourStore((s) => s.updateScene);
  const addHotspot   = useTourStore((s) => s.addHotspot);
  const navigateTo   = useTourStore((s) => s.navigateTo);
  const selectHotspot = useTourStore((s) => s.selectHotspot);

  const [addingType,   setAddingType]   = useState<HotspotType | null>(null);
  const [leftOpen,     setLeftOpen]     = useState(true);
  const [rightOpen,    setRightOpen]    = useState(true);
  const [leftTab,      setLeftTab]      = useState<LeftTab>('scenes');
  const [rightTab,     setRightTab]     = useState<RightTab>('hotspot');
  const [dbLoading,    setDbLoading]    = useState(false);
  const [saveStatus,   setSaveStatus]   = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [isMobile,     setIsMobile]     = useState(false);

  // ── Mobile detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Refs for auto-save debounce
  const autoSaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSaveRef = useRef(true); // skip first render / initial DB load

  // ── Load tour from DB when ?id= is present ────────────────────────────────
  useEffect(() => {
    if (!tourId) {
      if (!tour) initTour('Mi Tour 360°');
      return;
    }
    // Wait until auth resolves before fetching
    if (!user) return;

    setDbLoading(true);
    getTourById(tourId)
      .then((row) => {
        if (!row) {
          router.push('/dashboard');
          return;
        }
        // ── SECURITY: reject if the tour belongs to another user ────────
        if (row.user_id !== user.id) {
          console.warn('[Editor] Unauthorized: tour belongs to another user');
          router.push('/dashboard');
          return;
        }
        skipNextSaveRef.current = true; // don't auto-save the data we just loaded
        loadTour(row.data);
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setDbLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, user]);

  // ── Escape to cancel hotspot placement ───────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddingType(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Auto-save (debounced 3 s) — only for tours that exist in DB ───────────
  useEffect(() => {
    // Don't auto-save brand-new tours or if not logged in
    if (!tourId || !tour || !user) return;

    // Skip the initial load/set (when loadTour is called from DB fetch)
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    // Clear pending timer and mark as pending
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');

    autoSaveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await saveTour(tour);
        setSaveStatus('saved');
        // Reset to idle after 2 s
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 3000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  const handleImagesReady = useCallback(
    (files: Array<{ name: string; url: string; thumbnailUrl?: string }>) => {
      files.forEach(({ name, url, thumbnailUrl }) => {
        const sceneName = name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const id = addScene(url, sceneName);
        if (thumbnailUrl) updateScene(id, { thumbnailUrl });
      });
      setLeftTab('scenes');
    },
    [addScene, updateScene]
  );

  const handleHotspotAdded = useCallback(
    (sceneId: string, yaw: number, pitch: number) => {
      if (!addingType) return;
      addHotspot(sceneId, addingType, yaw, pitch);
      setAddingType(null);
    },
    [addingType, addHotspot]
  );

  if (dbLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // ── Mobile gate — editor requires desktop ─────────────────────────────────
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="text-4xl">🖥️</div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-100">Editor disponible en escritorio</h1>
          <p className="text-sm text-gray-400 max-w-xs">
            El editor 360° requiere una pantalla más grande para funcionar correctamente.
            Ábrelo desde tu computadora.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" /> Ir al dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">

      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <aside className={cn(
        'flex flex-col border-r border-gray-800 bg-gray-900 transition-all duration-300 overflow-hidden',
        leftOpen ? 'w-64' : 'w-0'
      )}>
        <div className="flex flex-col h-full min-w-64">

          {/* Tour header */}
          <div className="p-3 border-b border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              {user ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <LayoutDashboard className="w-3 h-3" /> Mis tours
                </Link>
              ) : (
                <Link href="/" className="text-sm font-bold text-gray-300">
                  Tour <span className="text-blue-400">360°</span>
                </Link>
              )}
            </div>
            <input
              type="text"
              value={tour?.title ?? ''}
              onChange={(e) => useTourStore.getState().updateTour({ title: e.target.value })}
              className="input-dark font-semibold"
              placeholder="Título del tour"
            />
          </div>

          {/* Tab nav */}
          <div className="grid grid-cols-7 border-b border-gray-800 flex-shrink-0">
            {LEFT_TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setLeftTab(id)}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
                  leftTab === id
                    ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {icon}
                <span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {leftTab === 'scenes' && (
              <SceneManager
                scenes={tour?.scenes ?? []}
                currentSceneId={currentSceneId}
                initialSceneId={tour?.initialSceneId ?? ''}
              />
            )}
            {leftTab === 'upload' && (
              <ImageUploader onImagesReady={handleImagesReady} />
            )}
            {leftTab === 'floorplan' && tour && (
              <FloorPlanEditor tour={tour} />
            )}
            {leftTab === 'inventory' && tour && (
              <InventoryPanel tour={tour} />
            )}
            {leftTab === 'branding' && tour && (
              <BrandingPanel tour={tour} />
            )}
            {leftTab === 'security' && tour && (
              <SecurityPanel tour={tour} />
            )}
            {leftTab === 'publish' && tour && (
              <EmbedPanel tour={tour} />
            )}
          </div>
        </div>
      </aside>

      {/* Left sidebar toggle */}
      <button
        onClick={() => setLeftOpen((v) => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-30 w-5 h-10 bg-gray-800 border border-gray-700 rounded-r-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        style={{ left: leftOpen ? 256 : 0 }}
      >
        {leftOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ── Main viewer area ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Hotspot toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 bg-gray-900 flex-shrink-0">
          <span className="text-xs text-gray-500 font-medium hidden sm:block">Hotspot:</span>
          <div className="flex gap-1.5 flex-wrap">
            {HOTSPOT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setAddingType((prev) => (prev === t.value ? null : t.value))}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-all',
                  t.color,
                  addingType === t.value ? 'ring-2 ring-white/50 scale-105' : 'opacity-75 hover:opacity-100'
                )}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
          {/* Right side: cancel hint + auto-save indicator */}
          <div className="ml-auto flex items-center gap-3">
            {addingType && (
              <button
                onClick={() => setAddingType(null)}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Esc para cancelar
              </button>
            )}

            {/* Auto-save status — only shown when tour is persisted in DB */}
            {tourId && saveStatus !== 'idle' && (
              <span className={cn(
                'flex items-center gap-1 text-xs transition-colors',
                saveStatus === 'pending' && 'text-gray-500',
                saveStatus === 'saving'  && 'text-blue-400',
                saveStatus === 'saved'   && 'text-green-400',
                saveStatus === 'error'   && 'text-red-400',
              )}>
                {saveStatus === 'pending' && <Cloud    className="w-3 h-3" />}
                {saveStatus === 'saving'  && <Loader2  className="w-3 h-3 animate-spin" />}
                {saveStatus === 'saved'   && <Check    className="w-3 h-3" />}
                {saveStatus === 'error'   && <CloudOff className="w-3 h-3" />}
                {saveStatus === 'pending' && 'Sin guardar'}
                {saveStatus === 'saving'  && 'Guardando…'}
                {saveStatus === 'saved'   && 'Guardado'}
                {saveStatus === 'error'   && 'Error al guardar'}
              </span>
            )}
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 relative">
          {currentScene && tour ? (
            <ErrorBoundary label="el visor 360°">
              <Viewer360
                tour={tour}
                currentScene={currentScene}
                config={{ ...viewerConfig, showTutorial: false, showMinimap: false }}
                isEditing
                addHotspotType={addingType ?? undefined}
                selectedHotspotId={selectedHotspotId}
                onNavigate={navigateTo}
                onHotspotAdded={handleHotspotAdded}
                onHotspotSelected={selectHotspot}
              />
            </ErrorBoundary>
          ) : (
            <EmptyState onUploadClick={() => { setLeftTab('upload'); setLeftOpen(true); }} />
          )}
        </div>
      </main>

      {/* ── Right sidebar ────────────────────────────────────────────────────── */}
      <aside className={cn(
        'flex flex-col border-l border-gray-800 bg-gray-900 transition-all duration-300 overflow-hidden',
        rightOpen ? 'w-64' : 'w-0'
      )}>
        <div className="min-w-64 h-full flex flex-col">

          {/* Tab nav */}
          <div className="flex border-b border-gray-800 flex-shrink-0">
            {(['hotspot', 'retouch'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-medium transition-colors',
                  rightTab === tab
                    ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {tab === 'hotspot' ? 'Hotspot' : 'Retoque'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {rightTab === 'hotspot' && (
              currentScene
                ? <HotspotPanel scene={currentScene} selectedHotspotId={selectedHotspotId} allScenes={tour?.scenes ?? []} />
                : <p className="p-4 text-xs text-gray-600">Selecciona una escena.</p>
            )}
            {rightTab === 'retouch' && (
              currentScene
                ? <RetouchPanel scene={currentScene} />
                : <p className="p-4 text-xs text-gray-600">Selecciona una escena.</p>
            )}
          </div>
        </div>
      </aside>

      {/* Right sidebar toggle */}
      <button
        onClick={() => setRightOpen((v) => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-30 w-5 h-10 bg-gray-800 border border-gray-700 rounded-l-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        style={{ right: rightOpen ? 256 : 0 }}
      >
        {rightOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
        <Upload className="w-9 h-9 text-gray-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-300 mb-2">Sin escenas aún</h2>
      <p className="text-sm text-gray-600 max-w-xs mb-6">
        Sube tus fotos 360° equirectangulares para construir el tour.
      </p>
      <button
        onClick={onUploadClick}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
      >
        <Plus className="w-4 h-4" /> Subir imágenes
      </button>
    </div>
  );
}

function ViewerPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-950">
      <Loader2 className="w-6 h-6 text-gray-700 animate-spin" />
    </div>
  );
}
