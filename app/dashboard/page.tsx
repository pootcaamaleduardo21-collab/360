'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TourCard } from '@/components/dashboard/TourCard';
import { useAuth } from '@/hooks/useAuth';
import { listUserTours, deleteTour, type TourSummary } from '@/lib/db';
import { useTourStore } from '@/store/tourStore';
import {
  Plus, LogOut, Loader2, Globe, User, LayoutGrid, List,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const initTour      = useTourStore((s) => s.initTour);
  const loadTour      = useTourStore((s) => s.loadTour);

  const [tours,       setTours]       = useState<TourSummary[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [viewMode,    setViewMode]    = useState<'grid' | 'list'>('grid');
  const [deleteId,    setDeleteId]    = useState<string | null>(null);

  // Load tours
  const fetchTours = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await listUserTours();
      setTours(data);
    } catch (err) {
      setError('No se pudo cargar los tours. Verifica tu conexión.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchTours();
  }, [authLoading, user, fetchTours]);

  const handleNewTour = () => {
    initTour('Nuevo tour');
    router.push('/editor');
  };

  const handleOpenTour = useCallback(async (tourId: string) => {
    // Tour data is loaded inside the editor from DB
    router.push(`/editor?id=${tourId}`);
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar este tour? Esta acción no se puede deshacer.')) return;
    setDeleteId(id);
    try {
      await deleteTour(id);
      setTours((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert('Error al eliminar el tour.');
    } finally {
      setDeleteId(null);
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            Tour <span className="text-blue-400">360°</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Mis tours</h1>
            <p className="text-sm text-gray-500 mt-0.5">{tours.length} tour{tours.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex bg-gray-800 rounded-xl p-0.5 border border-gray-700">
              {(['grid', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    viewMode === mode ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  {mode === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <button
              onClick={handleNewTour}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo tour
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400">{error}</div>
        ) : tours.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-9 h-9 text-gray-700" />
            </div>
            <h2 className="text-xl font-semibold text-gray-300 mb-2">Sin tours aún</h2>
            <p className="text-sm text-gray-600 mb-6">Crea tu primer tour virtual 360°</p>
            <button
              onClick={handleNewTour}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" /> Crear mi primer tour
            </button>
          </div>
        ) : (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            )}
          >
            {tours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
