import Link from 'next/link';
import {
  ArrowRight, Globe, Layers, MapPin, ShoppingCart, Code2,
  Shield, BarChart2, Calendar, Volume2, Users, Star,
  CheckCircle, ChevronRight, Play, Zap, Lock,
  Building2, Hotel, Car, Utensils, GraduationCap, Dumbbell,
} from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const NICHES = [
  { icon: Building2,     label: 'Inmobiliario',   color: 'text-blue-400'   },
  { icon: Hotel,         label: 'Hotelería',       color: 'text-purple-400' },
  { icon: Car,           label: 'Automotriz',      color: 'text-amber-400'  },
  { icon: Utensils,      label: 'Restaurantes',    color: 'text-rose-400'   },
  { icon: GraduationCap, label: 'Educación',       color: 'text-emerald-400'},
  { icon: Dumbbell,      label: 'Salud & Fitness', color: 'text-cyan-400'   },
  { icon: ShoppingCart,  label: 'Retail',          color: 'text-orange-400' },
  { icon: Users,         label: 'Coworking',       color: 'text-indigo-400' },
];

const FEATURES = [
  { icon: Globe,      title: 'Visor 360° inmersivo',      desc: 'WebGL con Three.js. Pan, tilt y zoom fluido con soporte táctil y VR.', color: 'bg-blue-500/10 text-blue-400' },
  { icon: Layers,     title: 'Hotspots interactivos',     desc: 'Navegar, info, media, agentes, productos y unidades en un clic.', color: 'bg-purple-500/10 text-purple-400' },
  { icon: MapPin,     title: 'Plano + minimap',           desc: 'Plano de planta interactivo con hotspots de cuarto y minimap flotante.', color: 'bg-emerald-500/10 text-emerald-400' },
  { icon: BarChart2,  title: 'Analytics en tiempo real',  desc: 'Tracking de visitas, escenas, clics a unidades y solicitudes de cita.', color: 'bg-amber-500/10 text-amber-400' },
  { icon: Shield,     title: 'Protección por contraseña', desc: 'Acceso privado con hash SHA-256. Ideal para preventa y clientes VIP.', color: 'bg-rose-500/10 text-rose-400' },
  { icon: Calendar,   title: 'Agendas integradas',        desc: 'WhatsApp, email o Calendly directo desde el tour. Cero fricción.', color: 'bg-cyan-500/10 text-cyan-400' },
  { icon: Volume2,    title: 'Guía de audio',             desc: 'Narración automática por escena. Sube tu MP3 y listo.', color: 'bg-indigo-500/10 text-indigo-400' },
  { icon: Code2,      title: 'Embebible en cualquier web', desc: 'iFrame con un clic, QR descargable y URL compartible.', color: 'bg-teal-500/10 text-teal-400' },
];

const STEPS = [
  { n: '01', title: 'Sube tus fotos 360°',     desc: 'Arrastra tus imágenes equirectangulares. Conversión automática si vienen de tu cámara.' },
  { n: '02', title: 'Personaliza el recorrido', desc: 'Agrega hotspots, plano, inventario, audio y branding en minutos desde el editor visual.' },
  { n: '03', title: 'Publica y comparte',       desc: 'Obtén un link, QR o código de embed. Analytics activos desde el primer visitante.' },
];

const PRICING = [
  {
    name:    'Starter',
    price:   'Gratis',
    period:  '',
    desc:    'Para probar la plataforma.',
    color:   'border-gray-700',
    badge:   '',
    cta:     'Empezar gratis',
    ctaStyle:'bg-gray-800 hover:bg-gray-700 text-white',
    features:[
      '1 tour activo',
      '5 escenas por tour',
      'Hotspots básicos',
      'Link público',
    ],
  },
  {
    name:    'Pro',
    price:   '$49',
    period:  '/mes',
    desc:    'Para equipos y profesionales.',
    color:   'border-blue-500',
    badge:   'Más popular',
    cta:     'Comenzar Pro',
    ctaStyle:'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30',
    features:[
      '20 tours activos',
      'Escenas ilimitadas',
      'Analytics completo',
      'Protección por contraseña',
      'Booking integrado',
      'Guía de audio',
      'Inventario inmobiliario',
      'QR + iFrame embed',
    ],
  },
  {
    name:    'Enterprise',
    price:   '$149',
    period:  '/mes',
    desc:    'Para agencias y desarrolladoras.',
    color:   'border-purple-500/50',
    badge:   '',
    cta:     'Hablar con ventas',
    ctaStyle:'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40',
    features:[
      'Tours ilimitados',
      'Múltiples usuarios',
      'White-label (dominio propio)',
      'Webhooks a CRM',
      'Dashboard multi-cuenta',
      'Soporte prioritario',
      'SLA garantizado',
      'Facturación CFDI',
    ],
  },
];

const TESTIMONIALS = [
  { name: 'Daniela Fuentes', role: 'Directora Comercial — Vista Mar', avatar: 'D', text: 'Cerramos 3 unidades en preventa gracias al tour. Los compradores desde CDMX firmaron sin visitar el proyecto.' },
  { name: 'Roberto Sánchez', role: 'Broker independiente', avatar: 'R', text: 'Antes tardaba semanas en producir un recorrido. Ahora lo tengo listo en una tarde y lo comparto por WhatsApp.' },
  { name: 'Ana Martínez', role: 'Gerente — Hotel Cielo', avatar: 'A', text: 'Nuestras reservas online subieron 40% después de publicar el tour del lobby y las habitaciones.' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <span className="text-xl font-black tracking-tight select-none">
              Tour <span className="text-blue-400">360°</span>
            </span>
            <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
              <a href="#features" className="hover:text-white transition-colors">Funciones</a>
              <a href="#pricing"  className="hover:text-white transition-colors">Precios</a>
              <a href="#niches"   className="hover:text-white transition-colors">Nichos</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login"
              className="hidden sm:block px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/demo"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-400 border border-blue-500/40 rounded-xl hover:bg-blue-500/10 transition-colors">
              <Play className="w-3.5 h-3.5 fill-current" /> Demo en vivo
            </Link>
            <Link href="/auth/register"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20">
              Empezar gratis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-3xl" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
                <Zap className="w-3 h-3" />
                10 nichos · Listo para producción
              </div>

              <h1 className="text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight mb-6">
                Tours virtuales
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                  360° que venden
                </span>
              </h1>

              <p className="text-lg text-gray-400 leading-relaxed mb-8 max-w-lg">
                Crea, personaliza y publica tours inmersivos en minutos. Con hotspots,
                inventario, analytics, booking y guía de audio integrados.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link href="/demo"
                  className="flex items-center gap-2 px-6 py-3.5 border border-gray-700 hover:border-blue-500/50 text-white font-semibold rounded-2xl transition-all hover:bg-blue-500/5 text-sm">
                  <Play className="w-4 h-4 text-blue-400 fill-current" />
                  Ver demo interactivo
                </Link>
                <Link href="/auth/register"
                  className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-colors text-sm shadow-lg shadow-blue-600/25">
                  Empezar gratis — sin tarjeta
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Social proof mini row */}
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="flex -space-x-2">
                  {['D','R','A','M','J'].map((l, i) => (
                    <div key={i}
                      className="w-8 h-8 rounded-full border-2 border-gray-950 flex items-center justify-center text-xs font-bold"
                      style={{ background: ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'][i] }}>
                      {l}
                    </div>
                  ))}
                </div>
                <span><strong className="text-gray-300">+200</strong> profesionales ya usan la plataforma</span>
              </div>
            </div>

            {/* Right — live viewer mockup */}
            <div className="relative hidden lg:block">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 blur-2xl scale-105" />

              <div className="relative rounded-3xl bg-gray-900 border border-gray-700/50 overflow-hidden shadow-2xl">
                {/* Browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-700/50">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  <div className="flex-1 mx-4 py-1 px-3 rounded-md bg-gray-700/50 text-xs text-gray-500 font-mono">
                    tour360.app/viewer/vista-mar
                  </div>
                </div>

                {/* Simulated 360° view */}
                <div className="relative h-72 overflow-hidden">
                  {/* Gradient sphere simulation */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-blue-900/40 to-slate-800" />
                  <div className="absolute inset-0"
                    style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(99,102,241,0.1) 0%, transparent 50%)' }} />

                  {/* Simulated floor */}
                  <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-gray-900/80 to-transparent" />

                  {/* Hotspot pins */}
                  <HotspotPin x="28%" y="45%" label="Cocina" color="bg-blue-500" pulse />
                  <HotspotPin x="68%" y="38%" label="Recámara" color="bg-blue-500" />
                  <HotspotPin x="50%" y="60%" label="Vista marina" color="bg-emerald-500" pulse />

                  {/* Unit badge */}
                  <div className="absolute top-4 right-4 flex flex-col gap-1.5">
                    <UnitBadge label="Apt 3A" status="Disponible" color="bg-emerald-500" />
                    <UnitBadge label="Apt 3B" status="Reservado"  color="bg-amber-500" />
                    <UnitBadge label="PH-1"   status="Disponible" color="bg-emerald-500" />
                  </div>

                  {/* Scene label */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-black/60 backdrop-blur-sm text-white/80 text-xs font-medium rounded-full">
                      Sala principal
                    </span>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50 bg-gray-800/30">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    3 / 8 escenas
                  </div>
                  <div className="flex gap-2">
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">4 disponibles</div>
                    <div className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold">Explorar →</div>
                  </div>
                </div>
              </div>

              {/* Floating stat cards */}
              <StatCard className="-bottom-4 -left-8" label="Visitas hoy" value="47" icon="📈" />
              <StatCard className="-top-6 -right-4" label="Citas agendadas" value="3" icon="📅" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Niche strip ──────────────────────────────────────────────────── */}
      <section id="niches" className="border-y border-gray-800/50 py-8 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-gray-600 uppercase tracking-widest mb-6">
            Funciona para cualquier industria
          </p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {NICHES.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-2 group cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center group-hover:border-gray-600 transition-colors">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className="text-[11px] text-gray-500 font-medium text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Plataforma completa</span>
          <h2 className="text-4xl font-black mt-2 mb-4">Todo lo que necesitas, ya incluido</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Sin plugins, sin configuración. Cada función está lista desde el primer día.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title}
              className="p-5 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-all hover:shadow-xl hover:shadow-black/20 group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-100 mb-2 text-sm leading-snug">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-900/40 border-y border-gray-800/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Tan simple como parece</span>
            <h2 className="text-4xl font-black mt-2">De cero a publicado en minutos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} className="relative flex flex-col gap-4">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-gray-700 to-transparent -z-10 translate-x-4" />
                )}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-blue-600/30">
                  {n}
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-gray-700 text-white font-semibold rounded-2xl transition-colors text-sm">
              <Play className="w-4 h-4 text-blue-400 fill-current" />
              Ver el flujo completo en el demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Lo que dicen nuestros clientes</span>
          <h2 className="text-4xl font-black mt-2">Resultados reales</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ name, role, avatar, text }) => (
            <div key={name}
              className="p-6 rounded-2xl bg-gray-900 border border-gray-800 flex flex-col gap-4">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />
                ))}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed flex-1">"{text}"</p>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
                  {avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <p className="text-xs text-gray-500">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-gray-900/40 border-y border-gray-800/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Precios transparentes</span>
            <h2 className="text-4xl font-black mt-2 mb-4">Elige tu plan</h2>
            <p className="text-gray-400">Sin contratos. Cancela cuando quieras.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PRICING.map(({ name, price, period, desc, color, badge, cta, ctaStyle, features }) => (
              <div key={name}
                className={`relative p-6 rounded-3xl bg-gray-900 border-2 ${color} flex flex-col gap-5`}>
                {badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-600/30">
                    {badge}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-400">{name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-black text-white">{price}</span>
                    {period && <span className="text-gray-500 text-sm">{period}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{desc}</p>
                </div>
                <Link href="/auth/register"
                  className={`w-full py-3 rounded-2xl text-sm font-semibold text-center transition-colors ${ctaStyle}`}>
                  {cta}
                </Link>
                <ul className="space-y-2.5">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────────── */}
      <section className="py-24 max-w-4xl mx-auto px-6 text-center">
        <div className="relative p-12 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.2) 0%, transparent 60%)' }} />
          <div className="relative">
            <h2 className="text-4xl font-black mb-4">
              Tu primer tour en<br />
              <span className="text-blue-400">menos de 10 minutos</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Sin instalaciones, sin configuraciones complejas. Solo sube tus fotos y empieza a vender.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/auth/register"
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-colors text-base shadow-xl shadow-blue-600/30">
                Crear cuenta gratis <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/demo"
                className="flex items-center gap-2 px-8 py-4 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white font-semibold rounded-2xl transition-colors text-base">
                <Play className="w-4 h-4 fill-current text-blue-400" /> Ver demo primero
              </Link>
            </div>
            <p className="mt-6 text-xs text-gray-600">
              Sin tarjeta de crédito · Cancela cuando quieras · Soporte en español
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <span className="text-xl font-black">Tour <span className="text-blue-400">360°</span></span>
              <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
                La plataforma de tours virtuales más completa para inmobiliarias, hoteles, restaurantes y más.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Producto</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-white transition-colors">Funciones</a></li>
                <li><a href="#pricing"  className="hover:text-white transition-colors">Precios</a></li>
                <li><Link href="/demo"  className="hover:text-white transition-colors">Demo en vivo</Link></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors">Registro</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Nichos</p>
              <ul className="space-y-2 text-sm text-gray-500">
                {NICHES.slice(0, 5).map(({ label }) => (
                  <li key={label}><span className="cursor-default">{label}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <span>© {new Date().getFullYear()} Tour 360° · Hecho con ♥ en México</span>
            <div className="flex items-center gap-4">
              <Lock className="w-3 h-3" />
              <span>Todos los datos cifrados · SHA-256</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HotspotPin({ x, y, label, color, pulse }: { x: string; y: string; label: string; color: string; pulse?: boolean }) {
  return (
    <div className="absolute flex flex-col items-center gap-1" style={{ left: x, top: y, transform: 'translate(-50%,-50%)' }}>
      <div className={`relative w-5 h-5 rounded-full ${color} flex items-center justify-center shadow-lg`}>
        {pulse && <div className={`absolute inset-0 rounded-full ${color} animate-ping opacity-60`} />}
        <ChevronRight className="w-2.5 h-2.5 text-white" />
      </div>
      <span className="px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-medium rounded-md whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

function UnitBadge({ label, status, color }: { label: string; status: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-[10px] text-white font-medium">{label}</span>
      <span className="text-[9px] text-gray-400">{status}</span>
    </div>
  );
}

function StatCard({ className, label, value, icon }: { className: string; label: string; value: string; icon: string }) {
  return (
    <div className={`absolute ${className} px-4 py-3 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl flex items-center gap-3`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-lg font-black text-white leading-none">{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
