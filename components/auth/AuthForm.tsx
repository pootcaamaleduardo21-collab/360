'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AuthMode = 'login' | 'register' | 'reset';

interface AuthFormProps {
  mode: AuthMode;
  onSubmit: (data: { email: string; password?: string; fullName?: string }) => Promise<{ error: string | null }>;
  isLoading?: boolean;
}

export function AuthForm({ mode, onSubmit, isLoading = false }: AuthFormProps) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);
  const [pending,  setPending]  = useState(false);

  const busy = isLoading || pending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);

    try {
      const result = await onSubmit({
        email,
        password: mode !== 'reset' ? password : undefined,
        fullName: mode === 'register' ? fullName : undefined,
      });

      if (result.error) {
        setError(result.error);
      } else if (mode === 'reset') {
        setSuccess('Revisa tu correo para restablecer tu contraseña.');
      } else if (mode === 'register') {
        setSuccess('Cuenta creada. Revisa tu correo para confirmarla.');
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error de conexión. Verifica tu internet e intenta de nuevo.'
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Full name (register only) */}
      {mode === 'register' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-dark"
            placeholder="María García"
            required
            autoComplete="name"
          />
        </div>
      )}

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Correo electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-dark"
          placeholder="tu@correo.com"
          required
          autoComplete="email"
        />
      </div>

      {/* Password */}
      {mode !== 'reset' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn('input-dark pr-10')}
              placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
              required
              minLength={mode === 'register' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
      )}

      {/* Error / success feedback */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-sm text-green-400">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {mode === 'login'    && (busy ? 'Iniciando sesión…' : 'Iniciar sesión')}
        {mode === 'register' && (busy ? 'Creando cuenta…'   : 'Crear cuenta')}
        {mode === 'reset'    && (busy ? 'Enviando…'         : 'Enviar enlace')}
      </button>

      {/* Footer links */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        {mode === 'login' && (
          <>
            <p>
              ¿Sin cuenta?{' '}
              <Link href="/auth/register" className="text-blue-400 hover:text-blue-300">
                Regístrate gratis
              </Link>
            </p>
            <p>
              <Link href="/auth/reset" className="text-gray-600 hover:text-gray-400">
                Olvidé mi contraseña
              </Link>
            </p>
          </>
        )}
        {mode === 'register' && (
          <p>
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
              Inicia sesión
            </Link>
          </p>
        )}
        {mode === 'reset' && (
          <p>
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
              ← Volver al login
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}
