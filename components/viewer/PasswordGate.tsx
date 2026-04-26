'use client';

import { useState, useCallback } from 'react';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordGateProps {
  tourTitle: string;
  logoUrl?: string;
  brandColor?: string;
  passwordHash: string;   // SHA-256 hex stored in tour
  onUnlock: () => void;
}

async function sha256hex(text: string): Promise<string> {
  const buf  = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function PasswordGate({ tourTitle, logoUrl, brandColor, passwordHash, onUnlock }: PasswordGateProps) {
  const [value,   setValue]   = useState('');
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const [shake,   setShake]   = useState(false);

  const accent = brandColor ?? '#2563eb';

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError(false);

    const hash = await sha256hex(value.trim());
    if (hash === passwordHash) {
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setLoading(false);
  }, [value, passwordHash, onUnlock]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-sm text-center">

        {/* Logo / icon */}
        <div className="mb-6 flex flex-col items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: accent }}
            >
              <Lock className="w-7 h-7 text-white" />
            </div>
          )}
          <h1 className="text-xl font-bold text-white">{tourTitle}</h1>
          <p className="text-sm text-gray-400">Este tour está protegido. Ingresa la contraseña para acceder.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={cn('space-y-3', shake && 'animate-shake')}>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(false); }}
              placeholder="Contraseña de acceso"
              autoFocus
              className={cn(
                'w-full px-4 py-3 pr-12 rounded-xl bg-gray-800 border text-white placeholder-gray-500 text-sm outline-none transition-colors',
                error
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-gray-700 focus:border-blue-500'
              )}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400">Contraseña incorrecta. Inténtalo de nuevo.</p>
          )}

          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: accent }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Entrar al tour
          </button>
        </form>
      </div>

      {/* Inline shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.45s ease; }
      `}</style>
    </div>
  );
}
