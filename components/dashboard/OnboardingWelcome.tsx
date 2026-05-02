'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Upload, MousePointerClick, Share2,
  ArrowRight, X, Sparkles,
} from 'lucide-react';

interface OnboardingWelcomeProps {
  userName?: string;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: <Upload className="w-6 h-6" />,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    title: 'Sube tu imagen 360°',
    desc: 'Arrastra una foto equirectangular (2:1) al editor. Soporta JPG y PNG.',
  },
  {
    icon: <MousePointerClick className="w-6 h-6" />,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    title: 'Agrega hotspots',
    desc: 'Haz clic en cualquier punto del visor para agregar navegación, info, productos o unidades.',
  },
  {
    icon: <Share2 className="w-6 h-6" />,
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    title: 'Publica y comparte',
    desc: 'Un link embebible y código QR listos al instante. Tus clientes entran sin instalar nada.',
  },
];

export function OnboardingWelcome({ userName, onDismiss }: OnboardingWelcomeProps) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/15 via-gray-900 to-indigo-600/10 border border-blue-500/20 p-6 sm:p-8 mb-8">

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 60%)' }} />

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-800 text-gray-600 hover:text-gray-400 transition-colors z-10"
        title="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">
              Bienvenido{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Crea tu primer tour virtual en menos de 10 minutos — sin código, sin instalaciones.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-3 gap-4">
          {STEPS.map((step, i) => (
            <div key={i} className="flex sm:flex-col items-start gap-3 p-4 rounded-2xl bg-gray-900/60 border border-gray-800">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${step.color}`}>
                {step.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Paso {i + 1}</span>
                </div>
                <p className="text-sm font-bold text-white leading-snug">{step.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/editor"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-colors text-sm shadow-lg shadow-blue-600/25"
          >
            Crear mi primer tour
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Ya sé cómo funciona, omitir
          </button>
        </div>
      </div>
    </div>
  );
}
