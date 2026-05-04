'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabase } from '@/lib/supabase';
import { listUserTours } from '@/lib/db';
import { getUserRole, ROLE_LABELS } from '@/lib/roles';
import {
  ArrowLeft, User, KeyRound, Loader2, CheckCircle, AlertCircle,
  Globe, Palette, Shield, FileText, CreditCard, Zap, Crown,
  ChevronDown, ChevronRight, ExternalLink, LogOut, Trash2,
  Building2, Phone, MessageCircle, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Lang, VIEWER_STRINGS, getStoredLang, storeLang } from '@/lib/i18n';

// ─── Shared field wrapper ─────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Section({
  icon, title, subtitle, children,
}: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 flex-shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// ─── Accordion (for legal) ────────────────────────────────────────────────────

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800/50 transition-colors"
      >
        {title}
        {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs text-gray-500 leading-relaxed space-y-2 border-t border-gray-800 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Plan config ──────────────────────────────────────────────────────────────

const PLANS = {
  starter:    { name: 'Starter',    color: 'text-gray-300',   bg: 'bg-gray-700',          icon: <Zap   className="w-4 h-4" />, maxTours: 1,  maxScenes: 5  },
  pro:        { name: 'Pro',        color: 'text-blue-300',   bg: 'bg-blue-600/20',        icon: <Crown className="w-4 h-4" />, maxTours: 20, maxScenes: -1 },
  enterprise: { name: 'Enterprise', color: 'text-purple-300', bg: 'bg-purple-600/20',      icon: <Shield className="w-4 h-4" />, maxTours: -1, maxScenes: -1 },
} as const;

type PlanKey = keyof typeof PLANS;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // Profile form
  const [fullName,  setFullName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [company,   setCompany]   = useState('');
  const [whatsapp,  setWhatsapp]  = useState('');
  const [bio,       setBio]       = useState('');
  const [title,     setTitle]     = useState('');

  // Password
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Preferences
  const [lang,  setLangState]  = useState<Lang>('es');
  const [theme, setTheme]      = useState<'dark' | 'light' | 'system'>('dark');

  // Stats
  const [tourCount, setTourCount] = useState<number | null>(null);

  // UI
  const [saving,    setSaving]    = useState(false);
  const [pwSaving,  setPwSaving]  = useState(false);
  const [success,   setSuccess]   = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  // Load user data
  useEffect(() => {
    if (!user) return;
    const m = user.user_metadata ?? {};
    setFullName(m.full_name    ?? '');
    setPhone(m.phone           ?? '');
    setCompany(m.company       ?? '');
    setWhatsapp(m.whatsapp     ?? '');
    setBio(m.bio               ?? '');
    setTitle(m.advisor_title   ?? '');
    setTheme((m.theme          ?? 'dark') as 'dark' | 'light' | 'system');
    setLangState(getStoredLang());

    // Fetch tour count
    listUserTours().then((t) => setTourCount(t.length)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  const role    = getUserRole(user);
  // super_admin always gets Enterprise view; admins without explicit plan → starter
  const rawPlan = user?.user_metadata?.plan as PlanKey | undefined;
  const plan: PlanKey = rawPlan ?? (role === 'super_admin' ? 'enterprise' : 'starter');
  const planCfg = PLANS[plan] ?? PLANS.starter;

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const initials = (fullName || user?.email || 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const flash = (msg: string, type: 'ok' | 'err' = 'ok') => {
    if (type === 'ok') { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); }
    else setError(msg);
  };

  // ── Save profile ────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await getSupabase().auth.updateUser({
        data: {
          full_name:     fullName.trim()  || undefined,
          phone:         phone.trim()     || undefined,
          company:       company.trim()   || undefined,
          whatsapp:      whatsapp.trim()  || undefined,
          bio:           bio.trim()       || undefined,
          advisor_title: title.trim()     || undefined,
        },
      });
      if (err) throw err;
      flash('Perfil actualizado correctamente.');
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Error al guardar.', 'err');
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) { flash('Mínimo 8 caracteres.', 'err'); return; }
    if (newPw !== confirmPw) { flash('Las contraseñas no coinciden.', 'err'); return; }
    setPwSaving(true);
    setError(null);
    try {
      const { error: err } = await getSupabase().auth.updateUser({ password: newPw });
      if (err) throw err;
      setNewPw(''); setConfirmPw('');
      flash('Contraseña actualizada.');
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Error al cambiar contraseña.', 'err');
    } finally {
      setPwSaving(false);
    }
  };

  // ── Save preferences ────────────────────────────────────────────────────────
  const handleSavePrefs = async () => {
    storeLang(lang);
    try {
      await getSupabase().auth.updateUser({ data: { theme } });
      flash('Preferencias guardadas.');
    } catch {
      flash('Preferencias guardadas localmente.');
    }
  };

  // ── Delete account ──────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      '¿Eliminar tu cuenta permanentemente? Se perderán todos tus tours, leads y datos. Esta acción no se puede deshacer.'
    );
    if (confirmed) {
      alert('Para eliminar tu cuenta contáctanos en soporte@eleva360.app');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-gray-200">Configuración</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Avatar header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0 select-none">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-100 truncate">{fullName || 'Sin nombre'}</p>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            <span className={cn(
              'inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
              role === 'super_admin' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : role === 'admin'     ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              :                       'bg-gray-800 border-gray-700 text-gray-400'
            )}>
              {ROLE_LABELS[role]}
            </span>
          </div>
        </div>

        {/* ── Global feedback ───────────────────────────────────────────────── */}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-400">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-400">✕</button>
          </div>
        )}

        {/* ── Plan & uso ────────────────────────────────────────────────────── */}
        <Section
          icon={<CreditCard className="w-4 h-4" />}
          title="Plan y uso"
          subtitle="Tu suscripción actual y consumo de recursos."
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold border', planCfg.bg,
                plan === 'pro' ? 'border-blue-500/40 text-blue-300'
                : plan === 'enterprise' ? 'border-purple-500/40 text-purple-300'
                : 'border-gray-700 text-gray-300'
              )}>
                {planCfg.icon}
                Plan {planCfg.name}
              </div>
              <p className="text-xs text-gray-600 mt-1.5">Miembro desde {memberSince}</p>
            </div>
            {plan === 'starter' && (
              <Link href="/#pricing"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex-shrink-0">
                <Zap className="w-3.5 h-3.5" /> Actualizar plan
              </Link>
            )}
          </div>

          {/* Usage bars */}
          <div className="space-y-3">
            <UsageBar
              label="Tours activos"
              used={tourCount ?? 0}
              max={planCfg.maxTours}
            />
          </div>

          {/* Plan features */}
          <div className="mt-5 pt-4 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Incluye tu plan</p>
            <div className="grid grid-cols-2 gap-2">
              {getPlanFeatures(plan).map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Datos personales ──────────────────────────────────────────────── */}
        <Section
          icon={<User className="w-4 h-4" />}
          title="Datos personales"
          subtitle="Información que aparece en tus tours y tarjeta de asesor."
        >
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre completo">
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="María García" className="input-dark" autoComplete="name" />
              </Field>
              <Field label="Cargo / Título" hint="Visible en tu tarjeta de asesor dentro del tour.">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Asesor Inmobiliario" className="input-dark" />
              </Field>
              <Field label="Teléfono">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 999 123 4567" className="input-dark" autoComplete="tel" />
              </Field>
              <Field label="WhatsApp" hint="Para el botón de contacto en el tour.">
                <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+5219991234567" className="input-dark" />
              </Field>
              <Field label="Empresa / Agencia" hint="Aparece junto a tu nombre en los tours.">
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                  placeholder="Inmobiliaria XYZ" className="input-dark" />
              </Field>
            </div>
            <Field label="Biografía" hint="Descripción breve en tu tarjeta de asesor.">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder="Especialista en propiedades residenciales con 10 años de experiencia…"
                rows={3} className="input-dark resize-none" />
            </Field>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Guardando…' : 'Guardar perfil'}
            </button>
          </form>
        </Section>

        {/* ── Preferencias ──────────────────────────────────────────────────── */}
        <Section
          icon={<Palette className="w-4 h-4" />}
          title="Preferencias"
          subtitle="Idioma y apariencia de la plataforma."
        >
          <div className="space-y-5">
            {/* Language */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                Idioma de la interfaz del visor
              </p>
              <p className="text-xs text-gray-600">El idioma que verán los visitantes en los botones del recorrido.</p>
              <div className="flex gap-2">
                {([
                  { code: 'es' as Lang, label: '🇲🇽 Español' },
                  { code: 'en' as Lang, label: '🇺🇸 English' },
                ] as const).map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => setLangState(code)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                      lang === code
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="space-y-2 pt-4 border-t border-gray-800">
              <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-500" />
                Tema
              </p>
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: 'dark',   label: '🌑 Oscuro',  note: 'Activo' },
                  { key: 'light',  label: '☀️ Claro',   note: 'Próximamente' },
                  { key: 'system', label: '💻 Sistema',  note: 'Próximamente' },
                ] as const).map(({ key, label, note }) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    disabled={key !== 'dark'}
                    className={cn(
                      'flex flex-col items-start px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50',
                      theme === key
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    )}
                  >
                    {label}
                    {key !== 'dark' && (
                      <span className="text-[10px] text-gray-600 mt-0.5">{note}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSavePrefs}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors text-sm">
              Guardar preferencias
            </button>
          </div>
        </Section>

        {/* ── Cambiar contraseña ────────────────────────────────────────────── */}
        <Section
          icon={<KeyRound className="w-4 h-4" />}
          title="Cambiar contraseña"
        >
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nueva contraseña">
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Mínimo 8 caracteres" className="input-dark" autoComplete="new-password" minLength={8} />
              </Field>
              <Field label="Confirmar contraseña">
                <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repite la contraseña" className="input-dark" autoComplete="new-password" />
              </Field>
            </div>
            <button type="submit" disabled={pwSaving || !newPw}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm">
              {pwSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {pwSaving ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </Section>

        {/* ── Legal ─────────────────────────────────────────────────────────── */}
        <Section
          icon={<FileText className="w-4 h-4" />}
          title="Legal"
          subtitle="Términos, privacidad y políticas de Eleva360."
        >
          <div className="space-y-2">
            <Accordion title="📄 Términos y Condiciones de Uso">
              <p>Eleva360 es una plataforma SaaS para la creación y publicación de tours virtuales 360°. Al usar la plataforma aceptas estos términos.</p>
              <p><strong className="text-gray-400">Uso permitido:</strong> Crear tours para usos comerciales y personales legítimos. Prohibido contenido ilegal, engañoso o que viole derechos de terceros.</p>
              <p><strong className="text-gray-400">Propiedad intelectual:</strong> Conservas todos los derechos sobre las imágenes y contenidos que subas. Nos otorgas licencia de uso limitado para operar el servicio.</p>
              <p><strong className="text-gray-400">Disponibilidad:</strong> Nos esforzamos por mantener la plataforma disponible 24/7 pero no garantizamos uptime del 100%.</p>
              <p><strong className="text-gray-400">Cancelación:</strong> Puedes cancelar tu suscripción en cualquier momento desde tu panel de cuenta. No se realizan reembolsos por períodos parciales.</p>
              <p className="text-gray-700">Versión vigente: enero 2025 · soporte@eleva360.app</p>
            </Accordion>

            <Accordion title="🔒 Aviso de Privacidad">
              <p>En Eleva360 nos comprometemos a proteger tus datos personales de conformidad con la Ley Federal de Protección de Datos Personales (México).</p>
              <p><strong className="text-gray-400">Datos que recopilamos:</strong> Nombre, correo electrónico, datos de facturación, imágenes de tours, y datos de visitantes que interactúan con tus tours (leads, analíticas).</p>
              <p><strong className="text-gray-400">Uso de datos:</strong> Operar y mejorar la plataforma, enviarte notificaciones de tu cuenta, análisis agregados de uso.</p>
              <p><strong className="text-gray-400">Terceros:</strong> Supabase (base de datos), Resend (email), Anthropic (IA), ElevenLabs (voz). Todos con acuerdos de confidencialidad.</p>
              <p><strong className="text-gray-400">Tus derechos ARCO:</strong> Acceso, Rectificación, Cancelación y Oposición. Escríbenos a privacidad@eleva360.app</p>
              <p><strong className="text-gray-400">Retención:</strong> Tus datos se conservan mientras tengas cuenta activa. Al eliminar tu cuenta, los datos se borran en un plazo de 30 días.</p>
              <p className="text-gray-700">Responsable: Eleva360 · privacidad@eleva360.app</p>
            </Accordion>

            <Accordion title="🍪 Política de Cookies">
              <p>Eleva360 usa cookies esenciales para el funcionamiento de la sesión y cookies de analítica anónima (sin datos personales).</p>
              <p><strong className="text-gray-400">Cookies esenciales:</strong> Sesión de autenticación (Supabase). Necesarias para el funcionamiento.</p>
              <p><strong className="text-gray-400">Cookies de analítica:</strong> Conteo de visitas anónimas a tours. No se usa Google Analytics.</p>
              <p>Puedes desactivar cookies no esenciales desde la configuración de tu navegador sin afectar el funcionamiento principal.</p>
            </Accordion>

            <Accordion title="💳 Política de Cancelación y Reembolsos">
              <p>Puedes cancelar tu suscripción en cualquier momento. El acceso a funciones Pro se mantiene hasta el final del período pagado.</p>
              <p><strong className="text-gray-400">Reembolsos:</strong> No se realizan reembolsos por períodos ya cobrados, excepto en caso de fallo grave del servicio.</p>
              <p><strong className="text-gray-400">Datos al cancelar:</strong> Tus tours y datos permanecen disponibles por 30 días después de la cancelación para que puedas exportarlos.</p>
              <p>Para solicitar reembolso excepcional: soporte@eleva360.app</p>
            </Accordion>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-800">
            <a href="mailto:soporte@eleva360.app"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <ExternalLink className="w-3 h-3" /> soporte@eleva360.app
            </a>
            <a href="mailto:privacidad@eleva360.app"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <ExternalLink className="w-3 h-3" /> privacidad@eleva360.app
            </a>
          </div>
        </Section>

        {/* ── Información de cuenta ─────────────────────────────────────────── */}
        <Section
          icon={<Info className="w-4 h-4" />}
          title="Información de cuenta"
        >
          <div className="space-y-3">
            <InfoRow label="ID de cuenta"   value={user?.id ? user.id.slice(0, 18) + '…' : '—'} mono />
            <InfoRow label="Email"          value={user?.email ?? '—'} />
            <InfoRow label="Rol"            value={ROLE_LABELS[role]} />
            <InfoRow label="Plan activo"    value={planCfg.name} />
            <InfoRow label="Miembro desde"  value={memberSince} />
            <InfoRow label="Tours creados"  value={tourCount !== null ? String(tourCount) : '…'} />
          </div>
        </Section>

        {/* ── Zona de peligro ───────────────────────────────────────────────── */}
        <section className="border border-red-900/40 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-red-900/40 bg-red-950/20">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-300">Zona de peligro</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-200">Cerrar sesión</p>
                <p className="text-xs text-gray-500 mt-0.5">Cierra sesión en este dispositivo.</p>
              </div>
              <button
                onClick={async () => { await signOut(); router.push('/'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-300 transition-colors flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
              </button>
            </div>
            <div className="flex items-start justify-between gap-4 pt-4 border-t border-red-900/30">
              <div>
                <p className="text-sm font-medium text-red-300">Eliminar cuenta</p>
                <p className="text-xs text-gray-500 mt-0.5">Borra permanentemente tu cuenta y todos tus tours. Irreversible.</p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-900/20 hover:bg-red-900/40 border border-red-800/50 text-sm text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const isUnlimited = max === -1;
  const pct = isUnlimited ? 0 : Math.min((used / max) * 100, 100);
  const isNearLimit = !isUnlimited && pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={cn('font-semibold', isNearLimit ? 'text-amber-400' : 'text-gray-300')}>
          {used}{isUnlimited ? '' : ` / ${max}`}
          {isUnlimited && <span className="text-gray-600 font-normal ml-1">ilimitados</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', isNearLimit ? 'bg-amber-500' : 'bg-blue-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800/60 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={cn('text-xs text-gray-300', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

function getPlanFeatures(plan: PlanKey): string[] {
  if (plan === 'enterprise') return [
    'Tours ilimitados', 'Usuarios ilimitados', 'White-label',
    'Webhooks a CRM', 'Analytics avanzado', 'Soporte prioritario',
    'SLA garantizado', 'Facturación CFDI',
  ];
  if (plan === 'pro') return [
    '20 tours activos', 'Escenas ilimitadas', 'Analytics completo',
    'Asistente IA texto + voz', 'Booking integrado', 'Protección contraseña',
    'QR + embed', 'Inventario inmobiliario',
  ];
  return [
    '1 tour activo', '5 escenas por tour',
    'Hotspots básicos', 'Link público compartible',
  ];
}
