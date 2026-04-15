'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';

function LoginForm() {
  const { signIn } = useAuth();
  const router     = useRouter();
  const params     = useSearchParams();
  const redirectTo = params.get('redirectTo') ?? '/dashboard';

  const handleSubmit = async ({ email, password }: { email: string; password?: string }) => {
    const result = await signIn(email, password!);
    if (!result.error) router.replace(redirectTo);
    return result;
  };

  return <AuthForm mode="login" onSubmit={handleSubmit} />;
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
