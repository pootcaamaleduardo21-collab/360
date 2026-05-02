'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';

function LoginForm() {
  const { signIn } = useAuth();
  const params     = useSearchParams();

  // Validate redirectTo is a relative path to prevent open-redirect attacks.
  // A URL like ?redirectTo=https://evil.com would otherwise forward the user there.
  const raw        = params.get('redirectTo') ?? '/dashboard';
  const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';

  // Surface errors forwarded by the auth callback (e.g. expired confirmation link)
  const callbackError = params.get('error');
  const callbackErrorMsg =
    callbackError === 'auth_callback_failed'
      ? 'El enlace de confirmación expiró o ya fue usado. Inicia sesión o solicita uno nuevo.'
      : callbackError
        ? 'Ocurrió un error en la autenticación. Intenta de nuevo.'
        : null;

  const handleSubmit = async ({ email, password }: { email: string; password?: string }) => {
    const result = await signIn(email, password!);
    if (!result.error) {
      // Hard navigation: ensures the browser sends the fresh auth cookie to
      // the Next.js middleware BEFORE it evaluates the protected route.
      // router.replace() can race against @supabase/ssr writing the cookie.
      window.location.replace(redirectTo);
    }
    return result;
  };

  return <AuthForm mode="login" onSubmit={handleSubmit} initialError={callbackErrorMsg} />;
}

export default function LoginPage() {
  return (
    <AuthLayout
      title="Bienvenido de vuelta"
      subtitle="Inicia sesión para gestionar tus tours"
    >
      <Suspense fallback={<div className="h-48 animate-pulse bg-gray-800 rounded-xl" />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}

function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold">
            Tour <span className="text-blue-400">360°</span>
          </span>
          <h1 className="mt-3 text-xl font-semibold text-gray-100">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
