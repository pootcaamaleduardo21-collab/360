'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabase } from '@/lib/supabase';
import {
  ArrowLeft, User, Phone, Building2, MessageCircle,
  Loader2, CheckCircle, AlertCircle, Camera, KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Form state
  const [fullName,   setFullName]   = useState('');
  const [phone,      setPhone]      = useState('');
  const [company,    setCompany]    = useState('');
  const [whatsapp,   setWhatsapp]   = useState('');
  const [bio,        setBio]        = useState('');
  const [title,      setTitle]      = useState('');

  // Password change
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');

  // UI state
  const [saving,     setSaving]     = useState(false);
  const [pwSaving,   setPwSaving]   = useState(false);
  const [success,    setSuccess]    = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  // Load user metadata into form
  useEffect(() => {
    if (!user) return;
    const m = user.user_metadata ?? {};
    setFullName(m.full_name  ?? '');
    setPhone(m.phone         ?? '');
    setCompany(m.company     ?? '');
    setWhatsapp(m.whatsapp   ?? '');
    setBio(m.bio             ?? '');
    setTitle(m.advisor_title ?? '');
  }, [user]);

  // Redirect unauthenticated users
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

  // ── Save profile ──────────────────────────────────────────────────────────

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const sb = getSupabase();
      const { error: updateError } = await sb.auth.updateUser({
        data: {
          full_name:     fullName.trim()  || undefined,
          phone:         phone.trim()     || undefined,
          company:       company.trim()   || undefined,
          whatsapp:      whatsapp.trim()  || undefined,
          bio:           bio.trim()       || undefined,
          advisor_title: title.trim()     || undefined,
        },
      });

      if (updateError) throw new Error(updateError.message);
      setSuccess('Perfil actualizado correctamente.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setPwSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const sb = getSupabase();
      const { error: pwError } = await sb.auth.updateUser({ password: newPw });
      if (pwError) throw new Error(pwError.message);
      setNewPw('');
      setConfirmPw('');
      setSuccess('Contraseña actualizada.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña.');
    } finally {
      setPwSaving(false);
    }
  };

  const initials = (fullName || user?.email || 'U')
    .split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-gray-200">Configuración de cuenta</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Avatar + email */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-100">{fullName || 'Sin nombre'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-sm text-green-400">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* ── Profile form ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-100">Datos personales</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre completo">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="María García"
                  className="input-dark"
                  autoComplete="name"
                />
              </Field>

              <Field label="Cargo / Título" hint="Se muestra en tu tarjeta de asesor dentro del tour.">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Asesor Inmobiliario"
                  className="input-dark"
                />
              </Field>

              <Field label="Teléfono">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 999 123 4567"
                  className="input-dark"
                  autoComplete="tel"
                />
              </Field>

              <Field label="WhatsApp" hint="Número para el CTA de WhatsApp en el tour.">
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+5219991234567"
                  className="input-dark"
                />
              </Field>

              <Field label="Empresa / Agencia" hint="Aparece junto a tu nombre en los tours.">
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Inmobiliaria XYZ"
                  className="input-dark"
                />
              </Field>
            </div>

            <Field label="Biografía / Descripción" hint="Breve descripción visible en tu tarjeta de asesor.">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Especialista en propiedades residenciales en Mérida con 10 años de experiencia…"
                rows={3}
                className="input-dark resize-none"
              />
            </Field>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Guardando…' : 'Guardar perfil'}
            </button>
          </form>
        </section>

        {/* ── Change password ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-100">Cambiar contraseña</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nueva contraseña">
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="input-dark"
                  autoComplete="new-password"
                  minLength={8}
                />
              </Field>
              <Field label="Confirmar contraseña">
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="input-dark"
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={pwSaving || !newPw}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {pwSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {pwSaving ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>

      </main>
    </div>
  );
}
