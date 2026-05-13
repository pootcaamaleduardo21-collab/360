'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTourStore, selectCurrentScene } from '@/store/tourStore';
import { useAuth } from '@/hooks/useAuth';
import { getUserRole } from '@/lib/roles';
import { getTourById, saveTour, createTour } from '@/lib/db';
import { HotspotType } from '@/types/tour.types';
import { ErrorBoundary }    from '@/components/ErrorBoundary';
import { ImageUploader }    from '@/components/editor/ImageUploader';
import { HotspotPanel }     from '@/components/editor/HotspotPanel';
import { SceneManager }     from '@/components/editor/SceneManager';
import { RetouchPanel }     from '@/components/editor/RetouchPanel';
import { EmbedPanel }       from '@/components/editor/EmbedPanel';
import { FloorPlanEditor }  from '@/components/editor/FloorPlanEditor';
import { BrandingPanel }    from '@/components/editor/BrandingPanel';
import { SecurityPanel }      from '@/components/editor/SecurityPanel';
import { MeasurementsPanel }  from '@/components/editor/MeasurementsPanel';
import { MediaPanel }         from '@/components/editor/MediaPanel';
import { NavPanelEditor }     from '@/components/editor/NavPanelEditor';
import { InventoryPanel }    from '@/components/editor/InventoryPanel';
import Link from 'next/link';
import {
  ArrowRight, Info, Image, User, ShoppingCart, Plus, Upload,
  Layers, Globe, ChevronLeft, ChevronRight, LayoutDashboard,
  Loader2, Map, Building2, Palette, Cloud, CloudOff, Check, Lock,
  Ruler, Film, Sparkles,
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

type LeftTab  = 'scenes' | 'upload' | 'floorplan' | 'medidas' | 'media' | 'inventory' | 'branding' | 'navpanel' | 'security' | 'publish';
type RightTab = 'hotspot' | 'retouch';

// Grouped tabs: content group + config group
const TAB_GROUPS: {
  label: string;
  tabs: { id: LeftTab; label: string; icon: React.ReactNode; minRole?: 'admin' | 'super_admin' }[];
}[] = [
  {
    label: 'Contenido',
    tabs: [
      { id: 'scenes',    label: 'Escenas',   icon: <Layers  className="w-4 h-4" /> },
      { id: 'upload',    label: 'Subir',     icon: <Upload  className="w-4 h-4" />, minRole: 'admin' },
      { id: 'floorplan', label: 'Plano',     icon: <Map     className="w-4 h-4" />, minRole: 'admin' },
      { id: 'medidas',   label: 'Medidas',   icon: <Ruler     className="w-4 h-4" />, minRole: 'admin' },
      { id: 'media',     label: 'Galería',   icon: <Film      className="w-4 h-4" />, minRole: 'admin' },
      { id: 'inventory', label: 'Inventario', icon: <Building2 className="w-4 h-4" />, minRole: 'admin' },
    ],
  },
  {
    label: 'Configuración',
    tabs: [
      { id: 'branding',  label: 'Marca',     icon: <Palette className="w-4 h-4" />, minRole: 'admin' },
      { id: 'navpanel',  label: 'Panel Nav', icon: <Layers  className="w-4 h-4" />, minRole: 'admin' },
      { id: 'security',  label: 'Acceso / IA', icon: <Lock  className="w-4 h-4" />, minRole: 'admin' },
      { id: 'publish',   label: 'Compartir', icon: <Globe   className="w-4 h-4" /> },
    ],
  },
];

// Flat list for filter / lookup
const ALL_LEFT_TABS = TAB_GROUPS.flatMap((g) => g.tabs);

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
  const role = getUserRole(user);
  const isAdvisor = role === 'advisor';

  // Filter tabs by role — advisors only see Scenes (read) + Compartir
  const LEFT_TABS = ALL_LEFT_TABS.filter(
    (t) => !t.minRole || role === 'super_admin' || role === 'admin'
  );

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

  // ── Auto-save (debounced 3 s) — works for both existing and new tours ───────
  // Ref so the timeout callback can read the latest tourId without stale closure
  const tourIdRef  = useRef(tourId);
  const tourRef    = useRef(tour);
  useEffect(() => { tourIdRef.current = tourId; }, [tourId]);
  useEffect(() => { tourRef.current   = tour;   }, [tour]);

  const performSave = useCallback(async () => {
    const currentTour = tourRef.current;
    if (!currentTour || !user) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus('saving');
    try {
      if (tourIdRef.current) {
        await saveTour(currentTour);
      } else {
        const newId = await createTour(currentTour);
        router.replace(`/editor?id=${newId}`);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [user, router]);

  useEffect(() => {
    if (!tour || !user) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (tour.scenes.length === 0) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');

    autoSaveTimer.current = setTimeout(performSave, 3000);

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
        'flex flex-col border-r border-gray-800 bg-gray-900 transition-all duration-300 overflow-hidden flex-shrink-0',
        leftOpen ? 'w-72' : 'w-0'
      )}>
        <div className="flex flex-col h-full min-w-72">

          {/* Tour header */}
          <div className="px-4 pt-3 pb-3 border-b border-gray-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              {user ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors font-medium"
                >
                  <LayoutDashboard className="w-3 h-3" /> Mis tours
                </Link>
              ) : (
                <span className="text-sm font-black text-gray-300">
                  Eleva<span className="text-blue-400">360</span>
                </span>
              )}
              {/* Save status + manual save button */}
              <div className="flex items-center gap-1.5">
                {saveStatus !== 'idle' && (
                  <span className={cn(
                    'flex items-center gap-1 text-[11px] transition-colors',
                    saveStatus === 'pending' && 'text-gray-500',
                    saveStatus === 'saving'  && 'text-blue-400',
                    saveStatus === 'saved'   && 'text-emerald-400',
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
                <button
                  onClick={performSave}
                  disabled={saveStatus === 'saving'}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all',
                    saveStatus === 'saving'
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : saveStatus === 'error'
                      ? 'bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30'
                      : saveStatus === 'pending'
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-900/50'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                  )}
                  title="Guardar ahora"
                >
                  {saveStatus === 'saving'
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Cloud className="w-3 h-3" />}
                  Guardar
                </button>
              </div>
            </div>
            <input
              type="text"
              value={tour?.title ?? ''}
              onChange={(e) => useTourStore.getState().updateTour({ title: e.target.value })}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2 text-sm font-semibold text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Título del tour"
            />
          </div>

          {/* Tab nav — grouped vertical list */}
          <nav className="flex-shrink-0 px-2 py-2 border-b border-gray-800/80 space-y-0.5">
            {LEFT_TABS.filter((t) => !t.minRole || role === 'super_admin' || role === 'admin').reduce<React.ReactNode[]>((acc, tab, i, arr) => {
              // Insert group label before first tab of each group
              const groupForTab = TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === tab.id));
              const isFirstInGroup = groupForTab?.tabs[0].id === tab.id;
              const prevTab = arr[i - 1];
              const groupForPrev = prevTab ? TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === prevTab.id)) : null;
              const isNewGroup = isFirstInGroup && groupForTab !== groupForPrev;

              if (isNewGroup && i > 0) {
                acc.push(<div key={`div-${tab.id}`} className="my-1.5 border-t border-gray-800" />);
              }
              if (isFirstInGroup) {
                acc.push(
                  <p key={`label-${tab.id}`} className="px-3 pt-1 pb-0.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                    {groupForTab?.label}
                  </p>
                );
              }

              acc.push(
                <button
                  key={tab.id}
                  onClick={() => setLeftTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                    leftTab === tab.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'
                  )}
                >
                  <span className={cn(
                    'flex-shrink-0 transition-colors',
                    leftTab === tab.id ? 'text-blue-400' : 'text-gray-600'
                  )}>
                    {tab.icon}
                  </span>
                  {tab.label}
                  {leftTab === tab.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  )}
                </button>
              );
              return acc;
            }, [])}
          </nav>

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
            {leftTab === 'medidas' && (
              <MeasurementsPanel />
            )}
            {leftTab === 'media' && tour && (
              <MediaPanel tour={tour} />
            )}
            {leftTab === 'inventory' && tour && (
              <InventoryPanel tour={tour} />
            )}
            {leftTab === 'branding' && tour && (
              <BrandingPanel tour={tour} />
            )}
            {leftTab === 'navpanel' && tour && (
              <NavPanelEditor tour={tour} />
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
        style={{ left: leftOpen ? 288 : 0 }}
      >
        {leftOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ── Main viewer area ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Hotspot toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 bg-gray-900 flex-shrink-0">
          {isAdvisor ? (
            <span className="text-xs text-amber-400/80 font-medium flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Vista de asesor — solo lectura
            </span>
          ) : (
            <>
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
            </>
          )}
          {/* Right side: cancel hint */}
          <div className="ml-auto flex items-center gap-3">
            {addingType && (
              <button
                onClick={() => setAddingType(null)}
                className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <span className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono">Esc</span>
                cancelar
              </button>
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
                onSetStartView={(yaw, pitch) => {
                  if (currentSceneId) updateScene(currentSceneId, { initialYaw: yaw, initialPitch: pitch });
                }}
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
    <div className="flex flex-col items-center justify-center h-full text-center p-10">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 flex items-center justify-center">
          <Upload className="w-12 h-12 text-blue-500/60" />
        </div>
        {/* Floating badge */}
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-gray-200 mb-2">Crea tu tour 360°</h2>
      <p className="text-sm text-gray-500 max-w-sm mb-8 leading-relaxed">
        Sube tus fotos equirectangulares (2:1) para empezar.<br />
        Luego agrega hotspots, plano y mucho más.
      </p>

      {/* Steps */}
      <div className="grid grid-cols-3 gap-4 max-w-md mb-8 text-left">
        {[
          { n: '1', text: 'Sube imágenes 360°', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { n: '2', text: 'Agrega hotspots', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
          { n: '3', text: 'Publica y comparte', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
        ].map(({ n, text, color }) => (
          <div key={n} className={`rounded-2xl border p-3 ${color}`}>
            <span className="text-xs font-black opacity-60">Paso {n}</span>
            <p className="text-xs font-semibold mt-1 leading-snug">{text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onUploadClick}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-colors shadow-lg shadow-blue-600/25 text-sm"
      >
        <Upload className="w-4 h-4" /> Subir imágenes 360°
      </button>
      <p className="text-xs text-gray-600 mt-3">JPG · PNG · Equirectangular 2:1</p>
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
