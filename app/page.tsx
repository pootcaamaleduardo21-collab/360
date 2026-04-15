import Link from 'next/link';
import { ArrowRight, Globe, Layers, ShoppingCart, MapPin, Code2 } from 'lucide-react';

const FEATURES = [
  {
    icon: Globe,
    title: 'Visor 360° inmersivo',
    desc: 'Renderizado WebGL con Three.js. Pan, tilt y zoom fluido con soporte táctil.',
  },
  {
    icon: Layers,
    title: 'Editor de hotspots',
    desc: 'Agrega puntos de interés con un clic: navegación, info, media, agentes y productos.',
  },
  {
    icon: MapPin,
    title: 'Mapa de recorrido',
    desc: 'Minimap flotante con plano de planta para orientar al visitante en tiempo real.',
  },
  {
    icon: ShoppingCart,
    title: 'Carrito inmersivo',
    desc: 'Etiqueta objetos dentro del tour para cotización directa desde el visor.',
  },
  {
    icon: Code2,
    title: 'Embebible en cualquier sitio',
    desc: 'Genera un snippet de iframe con un clic y publica en tu web o CRM.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <span className="text-lg font-bold tracking-tight">
          Tour <span className="text-blue-400">360°</span>
        </span>
        <Link
          href="/editor"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm font-medium rounded-xl transition-colors"
        >
          Abrir editor <ArrowRight className="w-4 h-4" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28 max-w-3xl mx-auto">
        <span className="mb-4 px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-semibold uppercase tracking-wider border border-blue-600/30">
          MVP · Real Estate &amp; Arquitectura
        </span>
        <h1 className="text-5xl font-bold leading-tight mb-5 text-balance">
          Tours virtuales 360°<br />
          <span className="text-blue-400">profesionales</span>, sin código
        </h1>
        <p className="text-lg text-gray-400 mb-8 max-w-xl">
          Sube tus fotos equirectangulares, agrega hotspots interactivos y comparte un tour
          inmersivo que se embebe en cualquier sitio web.
        </p>
        <Link
          href="/editor"
          className="flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 font-semibold rounded-2xl transition-colors text-base shadow-lg shadow-blue-600/25"
        >
          Crear mi primer tour <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-100">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
