import React from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * 🔱 Archon Component: ArchonErrorBoundary (FC 071 F2)
 * Implementation: Render-Error Containment Shield
 *
 * Terreno (071_AN E3): sin boundary, cualquier error de render de cualquier
 * módulo desmontaba el root COMPLETO — pantalla blanca sin recuperación para
 * el usuario (CI run 4). Este boundary contiene el error al subárbol envuelto
 * y ofrece recuperación explícita. Class component: única API de React para
 * capturar errores de render (getDerivedStateFromError).
 */

interface ArchonErrorBoundaryProps {
  children: React.ReactNode;
}

interface ArchonErrorBoundaryState {
  hasError: boolean;
}

class ArchonErrorBoundary extends React.Component<
  ArchonErrorBoundaryProps,
  ArchonErrorBoundaryState
> {
  constructor(props: ArchonErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ArchonErrorBoundaryState {
    return { hasError: true };
  }

  // eslint-disable-next-line class-methods-use-this -- API de React: firma fija del lifecycle
  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('🔱 [ArchonErrorBoundary] Render error contenido:', error, info.componentStack);
  }

  render(): React.ReactNode {
    const { hasError } = this.state;
    const { children } = this.props;

    if (!hasError) return children;

    return (
      <div
        data-testid="archon-error-boundary"
        className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-6 text-center"
      >
        <div className="w-16 h-16 rounded-[4px] bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldAlert size={32} className="text-[#C12020]" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-[#0f2a44] font-display font-black text-2xl tracking-tight">
            Error Inesperado del Módulo
          </h2>
          <p className="text-[#0f2a44]/60 text-archon-md font-bold max-w-md">
            El módulo encontró un error de renderizado y fue contenido para proteger el resto del
            sistema. Recargue la aplicación para continuar.
          </p>
        </div>
        <button
          type="button"
          onClick={(): void => window.location.reload()}
          className="px-8 h-11 bg-[#0f2a44] text-white rounded-[4px] font-black text-archon-base uppercase tracking-widest hover:bg-[#0f2a44]/90 transition-all shadow-md"
        >
          Recargar Aplicación
        </button>
      </div>
    );
  }
}

export default ArchonErrorBoundary;
