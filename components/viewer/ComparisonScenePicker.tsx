'use client';

import { Scene } from '@/types/tour.types';
import { X, Check } from 'lucide-react';

interface ComparisonScenePickerProps {
  scenes: Scene[];
  currentSceneId: string | null;
  label: string;           // "Panel A" or "Panel B"
  onSelect: (sceneId: string) => void;
  onClose: () => void;
}

export function ComparisonScenePicker({
  scenes,
  currentSceneId,
  label,
  onSelect,
  onClose,
}: ComparisonScenePickerProps) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-h-[60%] bg-gray-900 border-t border-gray-700 rounded-t-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <p className="text-sm font-semibold text-white">
            Seleccionar escena — <span className="text-blue-400">{label}</span>
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scene grid */}
        <div className="overflow-y-auto p-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {scenes.map((scene) => {
            const isActive = scene.id === currentSceneId;
            return (
              <button
                key={scene.id}
                onClick={() => { onSelect(scene.id); onClose(); }}
                className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                  isActive ? 'border-blue-500' : 'border-transparent hover:border-gray-600'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scene.thumbnailUrl ?? scene.imageUrl}
                  alt={scene.name}
                  className="w-full aspect-video object-cover"
                />
                {isActive && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-1">
                  <p className="text-[10px] text-white truncate">{scene.name}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
