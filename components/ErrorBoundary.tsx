'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  /** Fallback UI to render on error. If omitted, a generic card is shown. */
  fallback?: React.ReactNode;
  /** Optional context label shown in the default fallback (e.g. "el visor 360°") */
  label?: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Generic React error boundary.
 * Catches rendering and lifecycle errors from child components (including
 * dynamic imports like Viewer360) and shows a recovery UI instead of a
 * white screen of death.
 *
 * Usage:
 *   <ErrorBoundary label="el visor 360°">
 *     <Viewer360 ... />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Log to console for debugging; replace with Sentry/LogRocket later
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const label = this.props.label ?? 'este componente';

    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] bg-gray-950 p-6 text-center gap-4">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-200">
            Error al cargar {label}
          </p>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            {this.state.message || 'Ocurrió un error inesperado. Intenta recargar la página.'}
          </p>
        </div>
        <button
          onClick={this.handleRetry}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 rounded-xl transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reintentar
        </button>
      </div>
    );
  }
}
