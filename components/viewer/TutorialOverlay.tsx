'use client';

import { MousePointer2, ZoomIn, Layers, X } from 'lucide-react';

interface TutorialOverlayProps {
  onDismiss: () => void;
}

const TIPS = [
  {
    icon: MousePointer2,
    title: 'Navega el espacio',
    desc: 'Haz clic y arrastra para explorar la habitación en 360°.',
  },
  {
    icon: ZoomIn,
    title: 'Zoom',
    desc: 'Usa la rueda del ratón o el pellizco en móvil para hacer zoom.',
  },
  {
    icon: Layers,
    title: 'Puntos de interés',
    desc: 'Haz clic en los íconos para ver información, fotos o navegar.',
  },
];

export function TutorialOverlay({ onDismiss }: TutorialOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="max-w-sm w-full mx-4 text-center">
        <h2 className="text-white text-2xl font-bold mb-2">Bienvenido al Tour</h2>
        <p className="text-white/60 text-sm mb-8">Conoce cómo explorar este espacio</p>

        <div className="space-y-4 mb-8">
          {TIPS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 text-left">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600/80 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">{title}</p>
                <p className="text-white/60 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
        >
          Comenzar exploración
        </button>
        <button
          onClick={onDismiss}
          className="mt-3 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          No mostrar de nuevo
        </button>
      </div>
    </div>
  );
}
