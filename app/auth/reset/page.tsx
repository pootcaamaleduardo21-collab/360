'use client';

import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';

function ResetForm() {
  const { resetPassword } = useAuth();

  const handleSubmit = async ({ email }: { email: string }) => {
    return resetPassword(email);
  };

  return <AuthForm mode="reset" onSubmit={handleSubmit} />;
}

export default function ResetPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold">
            Tour <span className="text-blue-400">360°</span>
          </span>
          <h1 className="mt-3 text-xl font-semibold text-gray-100">Restablecer contraseña</h1>
          <p className="mt-1 text-sm text-gray-500">
            Te enviaremos un enlace para crear una nueva contraseña.
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <Suspense fallback={<div className="h-40 animate-pulse bg-gray-800 rounded-xl" />}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
