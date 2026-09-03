import { Component, type ReactNode } from 'react';

import { ErrorState } from './ErrorState';

import { logError } from '@/utils/errors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Red de seguridad de toda la app: si algo truena en el árbol de React
 * (incluyendo errores fuera de las pantallas con manejo de red ya cubierto
 * en src/utils/errors.ts), se muestra un mensaje amistoso con opción de
 * reintentar en vez de una pantalla en blanco o un crash visible.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    logError('AppErrorBoundary', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          message="Tenemos problemas para mostrar esta pantalla. Inténtalo más tarde."
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
