'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

function NewPasswordForm() {
  const [password,        setPassword]        = useState('');
  const [confirm,         setConfirm]         = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showCf,          setShowCf]          = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [success,         setSuccess]         = useState(false);
  const [pending,         setPending]         = useState(false);
  const [sessionChecked,  setSessionChecked]  = useState(false);
  const [hasSession,      setHasSession]      = useState(false);

  // Supabase exchanges the reset token automatically via the URL fragment when
  // the page loads. We wait for onAuthStateChange to fire with SIGNED_IN /
  // PASSWORD_RECOVERY before showing the form. If no session arrives quickly,
  // the link is expired or already used.
  useEffect(() => {
    const sb = getSupabase();
    // Give the SDK time to exchange the recovery token from the URL hash.
    const timeout = setTimeout(() => {
      setSessionChecked(true); // no auth event fired → link expired
    }, 3000);

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) {
          clearTimeout(timeout);
          setHasSession(true);
          setSessionChecked(true);
        }
      }
    });

    // Also check if there's already an active session (e.g. page reload)
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        clearTimeout(timeout);
        setHasSession(true);
        setSessionChecked(true);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Still waiting for the SDK to process the token
  if (!sessionChecked) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  // Link expired or already used
  if (!hasSession) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-400 font-medium">
          Este enlace expiró o ya fue utilizado.
        </p>
        <p className="text-xs text-gray-500">
          Los enlaces de restablecimiento son de un solo uso y caducan en 1 hora.
        </p>
        <Link
          href="/auth/reset"
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setPending(true);
    try {
      const sb = getSupabase();
      const { error: updateError } = await sb.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        // Hard navigation so middleware picks up the updated session cookie
        setTimeout(() => { window.location.replace('/dashboard'); }, 2500);
      }
    } catch {
      setError('Error inesperado. Intenta de nuevo.');
    } finally {
      setPending(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle className="w-10 h-10 text-green-400" />
        <p className="text-sm text-green-400 font-medium">
          ¡Contraseña actualizada correctamente!
        </p>
        <p className="text-xs text-gray-500">Redirigiendo al dashboard…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-dark pr-10"
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Confirmar contraseña
        </label>
        <div className="relative">
          <input
            type={showCf ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input-dark pr-10"
            placeholder="Repite la contraseña"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowCf((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            tabIndex={-1}
          >
            {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {pending ? 'Guardando…' : 'Guardar nueva contraseña'}
      </button>

      <p className="text-center text-xs text-gray-600">
        Si el enlace expiró,{' '}
        <a href="/auth/reset" className="text-blue-400 hover:text-blue-300">
          solicita uno nuevo
        </a>
        .
      </p>
    </form>
  );
}

export default function NewPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold">
            Tour <span className="text-blue-400">360°</span>
          </span>
          <h1 className="mt-3 text-xl font-semibold text-gray-100">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-gray-500">Elige una contraseña segura para tu cuenta.</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-800 rounded-xl" />}>
            <NewPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
