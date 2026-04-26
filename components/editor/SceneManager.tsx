'use client';

import { useState } from 'react';
import { Scene } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { Trash2, Star, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SceneManagerProps {
  scenes: Scene[];
  currentSceneId: string | null;
  initialSceneId: string;
}

export function SceneManager({ scenes, currentSceneId, initialSceneId }: SceneManagerProps) {
  const setCurrentScene  = useTourStore((s) => s.setCurrentScene);
  const removeScene      = useTourStore((s) => s.removeScene);
  const updateTour       = useTourStore((s) => s.updateTour);
  const updateScene      = useTourStore((s) => s.updateScene);

  const [expandedAudio, setExpandedAudio] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
        Escenas ({scenes.length})
      </h3>

      {scenes.length === 0 && (
        <p className="text-xs text-gray-600 px-1 py-4 text-center">
          Sube imágenes 360° para comenzar
        </p>
      )}

      <ul className="space-y-1">
        {scenes.map((scene) => {
          const isCurrent = scene.id === currentSceneId;
          const isInitial = scene.id === initialSceneId;

          return (
            <li key={scene.id}>
              <button
                onClick={() => setCurrentScene(scene.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-all',
                  isCurrent
                    ? 'bg-blue-600/20 border border-blue-600/40 text-blue-300'
                    : 'hover:bg-gray-800 border border-transparent text-gray-400 hover:text-gray-200'
                )}
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-14 h-7 rounded-md overflow-hidden bg-gray-800 border border-gray-700">
                  {scene.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={scene.thumbnailUrl} alt={scene.name} className="w-full h-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-cover opacity-70" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{scene.name}</p>
                  <p className="text-xs opacity-50">
                    {scene.hotspots.length} hotspot{scene.hotspots.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Set as initial scene */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTour({ initialSceneId: scene.id } as any);
                  }}
                  title={isInitial ? 'Escena inicial' : 'Establecer como inicial'}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isInitial ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'
                  )}
                >
                  <Star className="w-3.5 h-3.5" fill={isInitial ? 'currentColor' : 'none'} />
                </button>

                {/* Audio guide toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedAudio(expandedAudio === scene.id ? null : scene.id);
                  }}
                  title="Guía de audio"
                  className={cn(
                    'p-1 rounded transition-colors',
                    scene.audioGuideUrl ? 'text-blue-400' : 'text-gray-600 hover:text-blue-400'
                  )}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>

                {/* Delete */}
                {scenes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeScene(scene.id);
                    }}
                    className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
                    title="Eliminar escena"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </button>

              {/* Audio URL input — shown when expanded */}
              {expandedAudio === scene.id && (
                <div className="px-2 pb-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                  <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    <Volume2 className="w-3 h-3" /> URL de audio (narración)
                  </label>
                  <input
                    type="url"
                    value={scene.audioGuideUrl ?? ''}
                    onChange={(e) => updateScene(scene.id, { audioGuideUrl: e.target.value || undefined })}
                    placeholder="https://…/audio.mp3"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-gray-600">
                    Se reproduce automáticamente al entrar a esta escena.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
