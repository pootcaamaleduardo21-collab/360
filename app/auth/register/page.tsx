'use client';

import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const { signUp } = useAuth();

  const handleSubmit = async ({
    email,
    password,
    fullName,
  }: {
    email: string;
    password?: string;
    fullName?: string;
  }) => signUp(email, password!, fullName);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold">
            Tour <span className="text-blue-400">360°</span>
          </span>
          <h1 className="mt-3 text-xl font-semibold text-gray-100">Crear cuenta gratis</h1>
          <p className="mt-1 text-sm text-gray-500">Comienza a crear tours virtuales hoy</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <AuthForm mode="register" onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
