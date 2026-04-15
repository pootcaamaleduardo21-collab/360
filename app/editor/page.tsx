'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTourStore, selectCurrentScene } from '@/store/tourStore';
import { HotspotType } from '@/types/tour.types';
import { ImageUploader } from '@/components/editor/ImageUploader';
import { HotspotPanel } from '@/components/editor/HotspotPanel';
import { SceneManager } from '@/components/editor/SceneManager';
import { RetouchPanel } from '@/components/editor/RetouchPanel';
import {
  ArrowRight,
  Info,
  Image,
  User,
  ShoppingCart,
  Plus,
  Upload,
  Code2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Three.js viewer must be client-only (no SSR)
const Viewer360 = dynamic(
  () => import('@/components/viewer/Viewer360').then((m) => m.Viewer360),
  { ssr: false, loading: () => <ViewerPlaceholder /> }
);

// ─── Hotspot type picker config ───────────────────────────────────────────────

const HOTSPOT_TYPES: { value: HotspotType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'navigation', label: 'Navegar',      icon: <ArrowRight   className="w-4 h-4" />, color: 'bg-blue-600 hover:bg-blue-500' },
  { value: 'info',       label: 'Info',         icon: <Info         className="w-4 h-4" />, color: 'bg-amber-600 hover:bg-amber-500' },
  { value: 'media',      label: 'Media',        icon: <Image        className="w-4 h-4" />, color: 'bg-purple-600 hover:bg-purple-500' },
  { value: 'agent',      label: 'Agente',       icon: <User         className="w-4 h-4" />, color: 'bg-green-600 hover:bg-green-500' },
  { value: 'product',    label: 'Producto',     icon: <ShoppingCart className="w-4 h-4" />, color: 'bg-rose-600 hover:bg-rose-500' },
];

// ─── Editor page ──────────────────────────────────────────────────────────────

export default function EditorPage() {
  const tour              = useTourStore((s) => s.tour);
  const currentScene      = useTourStore(selectCurrentScene);
  const currentSceneId    = useTourStore((s) => s.currentSceneId);
  const selectedHotspotId = useTourStore((s) => s.selectedHotspotId);
  const viewerConfig      = useTourStore((s) => s.viewerConfig);

  const initTour          = useTourStore((s) => s.initTour);
  const addScene          = useTourStore((s) => s.addScene);
  const addHotspot        = useTourStore((s) => s.addHotspot);
  const navigateTo        = useTourStore((s) => s.navigateTo);
  const selectHotspot     = useTourStore((s) => s.selectHotspot);

  const [addingType,    setAddingType]    = useState<HotspotType | null>(null);
  const [leftOpen,      setLeftOpen]      = useState(true);
  const [rightOpen,     setRightOpen]     = useState(true);
  const [activeTab,     setActiveTab]     = useState<'scenes' | 'upload'>('scenes');
  const [rightTab,      setRightTab]      = useState<'hotspot' | 'retouch'>('hotspot');
  const [showEmbedCode, setShowEmbedCode] = useState(false);

  // Initialize a new tour on first load
  useEffect(() => {
    if (!tour) initTour('Mi Tour 360°');
  }, [tour, initTour]);

  const handleImagesReady = (files: Array<{ name: string; url: string; thumbnailUrl?: string }>) => {
    files.forEach(({ name, url, thumbnailUrl }) => {
      const sceneName = name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const sceneId = addScene(url, sceneName);
      if (thumbnailUrl) {
        useTourStore.getState().updateScene(sceneId, { thumbnailUrl });
      }
    });
    setActiveTab('scenes');
  };

  const handleHotspotAdded = (sceneId: string, yaw: number, pitch: number) => {
    if (!addingType) return;
    addHotspot(sceneId, addingType, yaw, pitch);
    setAddingType(null); // deactivate placement mode after adding one
  };

  const embedCode = tour
    ? `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/viewer/${tour.id}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`
    : '';

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'flex flex-col border-r border-gray-800 bg-gray-900 transition-all duration-300 overflow-hidden',
          leftOpen ? 'w-64' : 'w-0'
        )}
      >
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4 min-w-64">
          {/* Tour title */}
          <div className="pt-1">
            <input
              type="text"
              value={tour?.title ?? ''}
              onChange={(e) => useTourStore.getState().updateTour({ title: e.target.value })}
              className="input-dark text-base font-semibold"
              placeholder="Título del tour"
            />
          </div>

          {/* Tabs: Scenes / Upload */}
          <div className="flex rounded-xl overflow-hidden border border-gray-700">
            {(['scenes', 'upload'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-2 text-xs font-medium transition-colors',
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {tab === 'scenes' ? (
                  <span className="flex items-center justify-center gap-1"><Layers className="w-3 h-3" /> Escenas</span>
                ) : (
                  <span className="flex items-center justify-center gap-1"><Upload className="w-3 h-3" /> Subir</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'scenes' && (
            <SceneManager
              scenes={tour?.scenes ?? []}
              currentSceneId={currentSceneId}
              initialSceneId={tour?.initialSceneId ?? ''}
            />
          )}

          {activeTab === 'upload' && (
            <ImageUploader onImagesReady={handleImagesReady} />
          )}
        </div>

        {/* Bottom actions */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <Link
            href={tour ? `/viewer/${tour.id}` : '#'}
            target="_blank"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Previsualizar
          </Link>
          <button
            onClick={() => setShowEmbedCode((v) => !v)}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" /> Código de embed
          </button>
          {showEmbedCode && (
            <textarea
              readOnly
              value={embedCode}
              className="input-dark text-xs font-mono h-20 resize-none"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          )}
        </div>
      </aside>

      {/* Toggle left sidebar */}
      <button
        onClick={() => setLeftOpen((v) => !v)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-5 h-10 bg-gray-800 border border-gray-700 rounded-r-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        style={{ left: leftOpen ? 256 : 0 }}
      >
        {leftOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ── Main viewer area ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 bg-gray-900 flex-shrink-0">
          <span className="text-xs text-gray-500 font-medium">Agregar hotspot:</span>
          <div className="flex gap-1.5">
            {HOTSPOT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() =>
                  setAddingType((prev) => (prev === t.value ? null : t.value))
                }
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all',
                  t.color,
                  addingType === t.value
                    ? 'ring-2 ring-white/50 scale-105'
                    : 'opacity-80 hover:opacity-100'
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          {addingType && (
            <button
              onClick={() => setAddingType(null)}
              className="ml-auto text-xs text-gray-500 hover:text-white transition-colors"
            >
              Cancelar (Esc)
            </button>
          )}
        </div>

        {/* Viewer */}
        <div className="flex-1 relative">
          {currentScene && tour ? (
            <Viewer360
              tour={tour}
              currentScene={currentScene}
              config={{ ...viewerConfig, showTutorial: false, showMinimap: false }}
              isEditing
              addHotspotType={addingType ?? undefined}
              selectedHotspotId={selectedHotspotId}
              onNavigate={(sceneId) => navigateTo(sceneId)}
              onHotspotAdded={handleHotspotAdded}
              onHotspotSelected={(id) => selectHotspot(id)}
            />
          ) : (
            <EmptyState onUploadClick={() => setActiveTab('upload')} />
          )}
        </div>
      </main>

      {/* ── Right sidebar (hotspot editor) ───────────────────────────────── */}
      <aside
        className={cn(
          'flex flex-col border-l border-gray-800 bg-gray-900 transition-all duration-300 overflow-hidden',
          rightOpen ? 'w-64' : 'w-0'
        )}
      >
        <div className="min-w-64 overflow-y-auto scrollbar-thin flex-1 flex flex-col">
          {/* Right sidebar tabs */}
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

          {rightTab === 'hotspot' && (
            currentScene ? (
              <HotspotPanel
                scene={currentScene}
                selectedHotspotId={selectedHotspotId}
                allScenes={tour?.scenes ?? []}
              />
            ) : (
              <p className="p-4 text-xs text-gray-600">Selecciona una escena.</p>
            )
          )}

          {rightTab === 'retouch' && (
            currentScene ? (
              <RetouchPanel scene={currentScene} />
            ) : (
              <p className="p-4 text-xs text-gray-600">Selecciona una escena.</p>
            )
          )}
        </div>
      </aside>

      {/* Toggle right sidebar */}
      <button
        onClick={() => setRightOpen((v) => !v)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-5 h-10 bg-gray-800 border border-gray-700 rounded-l-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        style={{ right: rightOpen ? 256 : 0 }}
      >
        {rightOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
        <Upload className="w-9 h-9 text-gray-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-300 mb-2">Sin escenas aún</h2>
      <p className="text-sm text-gray-600 max-w-xs mb-6">
        Sube tus fotos 360° equirectangulares para comenzar a construir tu tour virtual.
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
      <div className="text-gray-600 text-sm animate-pulse">Inicializando visor…</div>
    </div>
  );
}
