'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TourCard } from '@/components/dashboard/TourCard';
import { SuperAdminView } from '@/components/dashboard/SuperAdminView';
import { AdvisorView } from '@/components/dashboard/AdvisorView';
import { LeadsPanel } from '@/components/dashboard/LeadsPanel';
import { OnboardingWelcome } from '@/components/dashboard/OnboardingWelcome';
import { TeamPanel } from '@/components/dashboard/TeamPanel';
import { useAuth } from '@/hooks/useAuth';
import { getUserRole, ROLE_LABELS, ROLE_COLORS, UserRole } from '@/lib/roles';
import { listUserTours, deleteTour, type TourSummary } from '@/lib/db';
import { useTourStore } from '@/store/tourStore';
import {
  Plus, LogOut, Loader2, Globe, LayoutGrid, List,
  Shield, Users, Building2, BarChart2, Settings,
  Play, ChevronDown, Bell, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Role-tab config ──────────────────────────────────────────────────────────

type DashTab = 'tours' | 'leads' | 'platform' | 'team';

function getRoleTabs(role: UserRole): { id: DashTab; label: string; icon: React.ReactNode }[] {
  const base: { id: DashTab; label: string; icon: React.ReactNode }[] = [
    { id: 'tours', label: 'Mis tours', icon: <Globe         className="w-4 h-4" /> },
    { id: 'leads', label: 'Leads',     icon: <MessageSquare className="w-4 h-4" /> },
  ];
  if (role === 'super_admin') base.push({ id: 'platform', label: 'Plataforma', icon: <Shield className="w-4 h-4" /> });
  if (role !== 'advisor')    base.push({ id: 'team',     label: 'Equipo',     icon: <Users  className="w-4 h-4" /> });
  return base;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const initTour = useTourStore((s) => s.initTour);

  const role     = getUserRole(user);
  const roleTabs = getRoleTabs(role);

  const [tours,            setTours]            = useState<TourSummary[]>([]);
  const [isLoading,        setIsLoading]        = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [viewMode,         setViewMode]         = useState<'grid' | 'list'>('grid');
  const [deleteId,         setDeleteId]         = useState<string | null>(null);
  const [activeTab,        setActiveTab]        = useState<DashTab>('tours');
  const [menuOpen,         setMenuOpen]         = useState(false);
  const [onboardingDone,   setOnboardingDone]   = useState(false);

  const fetchTours = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await listUserTours();
      setTours(data);
    } catch {
      setError('No se pudo cargar los tours.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchTours();
    if (!authLoading && !user) router.push('/auth/login');
  }, [authLoading, user, fetchTours, router]);

  const handleNewTour = () => {
    initTour('Nuevo tour');
    router.push('/editor');
  };

  const handleOpenTour = useCallback((id: string) => {
    router.push(`/editor?id=${id}`);
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

  const userName  = user?.user_metadata?.full_name ?? user?.email ?? '';
  const initials  = userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  // Stats for admin header
  const statsRow = {
    total:     tours.length,
    published: tours.filter((t) => t.is_published).length,
    views:     tours.reduce((a, t) => a + t.view_count, 0),
  };

  return (
    <div className="min-h-screen bg-gray-950">

      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3 sm:gap-4">

          {/* Logo */}
          <Link href="/" className="text-lg font-black tracking-tight flex-shrink-0">
            Tour <span className="text-blue-400">360°</span>
          </Link>

          {/* Role tabs — desktop */}
          {roleTabs.length > 1 && (
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {roleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Demo link */}
          <Link href="/demo"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/10 transition-colors">
            <Play className="w-3 h-3 fill-current" /> Demo
          </Link>

          {/* Notification placeholder */}
          <button className="relative w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 transition-colors">
            <Bell className="w-4 h-4" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                {initials || 'U'}
              </div>
              <span className="hidden sm:block text-xs text-gray-300 max-w-[120px] truncate">{userName}</span>
              <span className={cn('hidden sm:block px-1.5 py-0.5 rounded-full text-[10px] font-semibold border', ROLE_COLORS[role])}>
                {ROLE_LABELS[role]}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 z-50 w-52 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <p className="text-sm font-semibold text-gray-200 truncate">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setMenuOpen(false); handleSignOut(); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile tab bar (only shown on small screens when >1 tab) ────── */}
      {roleTabs.length > 1 && (
        <div className="md:hidden border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
          <div className="flex overflow-x-auto scrollbar-none">
            {roleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-white'
                    : 'text-gray-500'
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* ── PLATFORM tab (super admin) ──────────────────────────────── */}
        {activeTab === 'platform' && role === 'super_admin' && (
          <SuperAdminView />
        )}

        {/* ── LEADS tab ───────────────────────────────────────────────── */}
        {activeTab === 'leads' && (
          <LeadsPanel />
        )}

        {/* ── TEAM tab ────────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <TeamPanel />
        )}

        {/* ── TOURS tab ───────────────────────────────────────────────── */}
        {activeTab === 'tours' && (
          <>
            {/* Advisor view */}
            {role === 'advisor' ? (
              <AdvisorView tours={tours} userName={userName} />
            ) : (
              <>
                {/* Admin / Super admin tours view */}

                {/* Onboarding welcome — shown only on first visit (0 tours) */}
                {!isLoading && tours.length === 0 && !onboardingDone && (
                  <OnboardingWelcome
                    userName={userName}
                    onDismiss={() => setOnboardingDone(true)}
                  />
                )}

                {/* Stats row */}
                {tours.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <StatMini label="Tours"         value={statsRow.total}     icon={<Globe     className="w-4 h-4 text-blue-400"    />} />
                    <StatMini label="Publicados"    value={statsRow.published} icon={<Building2 className="w-4 h-4 text-emerald-400" />} />
                    <StatMini label="Vistas totales" value={statsRow.views}   icon={<BarChart2  className="w-4 h-4 text-purple-400"  />} />
                  </div>
                )}

                {/* Page header */}
                <div className="flex items-center justify-between mb-5 sm:mb-6 gap-3">
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-100">Mis tours</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{tours.length} tour{tours.length !== 1 ? 's' : ''}</p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <div className="hidden sm:flex bg-gray-800 rounded-xl p-0.5 border border-gray-700">
                      {(['grid', 'list'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          className={cn('p-2 rounded-lg transition-colors', viewMode === mode ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300')}
                        >
                          {mode === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleNewTour}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-blue-600/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Nuevo tour</span>
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
                  <EmptyState onNew={handleNewTour} />
                ) : (
                  <div className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'space-y-3'
                  )}>
                    {tours.map((tour) => (
                      <TourCard
                        key={tour.id}
                        tour={tour}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Click outside to close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatMini({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-900 border border-gray-800">
      <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xl font-black text-white leading-none">{value.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 rounded-3xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-5">
        <Globe className="w-9 h-9 text-gray-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-200 mb-2">Sin tours aún</h2>
      <p className="text-sm text-gray-600 mb-6 max-w-xs mx-auto">
        Crea tu primer tour virtual 360° en minutos. Sin código, sin instalaciones.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors mx-auto sm:mx-0"
        >
          <Plus className="w-4 h-4" /> Crear mi primer tour
        </button>
        <Link
          href="/demo"
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white font-medium rounded-xl transition-colors mx-auto sm:mx-0 text-sm"
        >
          <Play className="w-4 h-4 text-blue-400 fill-current" /> Ver demo primero
        </Link>
      </div>
    </div>
  );
}
