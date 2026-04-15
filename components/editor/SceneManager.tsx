'use client';

import { Scene } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { Trash2, Plus, GripVertical, Star } from 'lucide-react';
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
