'use client';

import { useRef, useState } from 'react';
import { Scene } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { Trash2, Star, Volume2, Upload, X, Loader2 } from 'lucide-react';
import { uploadAsset } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface SceneManagerProps {
  scenes: Scene[];
  currentSceneId: string | null;
  initialSceneId: string;
}

const LANG_LABELS: Record<string, string> = { es: 'Español', en: 'English' };

export function SceneManager({ scenes, currentSceneId, initialSceneId }: SceneManagerProps) {
  const setCurrentScene  = useTourStore((s) => s.setCurrentScene);
  const removeScene      = useTourStore((s) => s.removeScene);
  const updateTour       = useTourStore((s) => s.updateTour);
  const updateScene      = useTourStore((s) => s.updateScene);
  const tour             = useTourStore((s) => s.tour);

  const [expandedAudio, setExpandedAudio] = useState<string | null>(null);
  const [uploading,     setUploading]     = useState<Record<string, boolean>>({});  // sceneId → bool
  const [activeLang,    setActiveLang]    = useState<Record<string, string>>({});   // sceneId → lang
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const uploadingForRef                   = useRef<string | null>(null); // sceneId being uploaded

  const handleAudioUpload = async (sceneId: string, file: File) => {
    if (!tour) return;
    setUploading((v) => ({ ...v, [sceneId]: true }));
    try {
      const { url } = await uploadAsset(tour.id, file);
      const lang = activeLang[sceneId] ?? 'es';
      const scene = scenes.find((s) => s.id === sceneId);
      if (lang === 'es' || !scene?.audioGuideUrls) {
        // Primary URL — always set audioGuideUrl for backwards compat
        updateScene(sceneId, {
          audioGuideUrl: url,
          audioGuideUrls: { ...(scene?.audioGuideUrls ?? {}), [lang]: url },
        });
      } else {
        updateScene(sceneId, {
          audioGuideUrls: { ...(scene.audioGuideUrls ?? {}), [lang]: url },
        });
      }
    } catch {
      // fail silently — user can paste URL manually
    } finally {
      setUploading((v) => ({ ...v, [sceneId]: false }));
    }
  };

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

              {/* Audio guide panel — shown when expanded */}
              {expandedAudio === scene.id && (
                <div className="px-2 pb-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {/* Language tabs */}
                  <div className="flex gap-1">
                    {['es', 'en'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveLang((v) => ({ ...v, [scene.id]: lang }))}
                        className={cn(
                          'px-2 py-0.5 text-[10px] rounded-md font-semibold uppercase transition-colors',
                          (activeLang[scene.id] ?? 'es') === lang
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                        )}
                      >
                        {LANG_LABELS[lang]}
                      </button>
                    ))}
                  </div>

                  {/* Upload button + URL display */}
                  {(() => {
                    const lang = activeLang[scene.id] ?? 'es';
                    const currentUrl = scene.audioGuideUrls?.[lang] ?? (lang === 'es' ? scene.audioGuideUrl : undefined);
                    return (
                      <div className="space-y-1.5">
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && uploadingForRef.current) {
                              handleAudioUpload(uploadingForRef.current, file);
                            }
                            e.target.value = '';
                          }}
                        />
                        <button
                          onClick={() => {
                            uploadingForRef.current = scene.id;
                            fileInputRef.current?.click();
                          }}
                          disabled={uploading[scene.id]}
                          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-blue-600/20 border border-blue-600/40 text-blue-400 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                        >
                          {uploading[scene.id]
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Subiendo…</>
                            : <><Upload className="w-3 h-3" /> Subir MP3 ({LANG_LABELS[lang]})</>}
                        </button>
                        {currentUrl && (
                          <div className="flex items-center gap-1.5">
                            <Volume2 className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            <p className="text-[10px] text-gray-400 truncate flex-1">{currentUrl.split('/').pop()}</p>
                            <button
                              onClick={() => {
                                const lang2 = activeLang[scene.id] ?? 'es';
                                const updated = { ...(scene.audioGuideUrls ?? {}) };
                                delete updated[lang2];
                                updateScene(scene.id, {
                                  audioGuideUrl: lang2 === 'es' ? undefined : scene.audioGuideUrl,
                                  audioGuideUrls: Object.keys(updated).length ? updated : undefined,
                                });
                              }}
                              className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-600">
                          Se reproduce al entrar a esta escena. Soporta MP3, WAV, OGG.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
