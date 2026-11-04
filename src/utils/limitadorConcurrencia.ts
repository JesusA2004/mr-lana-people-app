/**
 * Semáforo FIFO puro (sin dependencias de React ni de Expo) para acotar
 * cuántas tareas corren a la vez — lo usa `usePrivateAsset` para que una
 * lista de fotos nunca dispare decenas de descargas simultáneas.
 *
 * - `adquirir()` resuelve con una función `liberar` en cuanto hay cupo; si no
 *   lo hay, espera en cola (orden de llegada).
 * - `liberar()` es idempotente: llamarla dos veces no regala un cupo extra.
 * - Si la `signal` se aborta mientras espera, sale de la cola y la promesa
 *   rechaza con un error `AbortError` (nunca ocupa cupo).
 */
export interface LimitadorConcurrencia {
  adquirir(signal?: AbortSignal): Promise<() => void>;
  /** Tareas con cupo ahora mismo. */
  readonly activos: number;
  /** Tareas esperando cupo. */
  readonly enCola: number;
}

interface Espera {
  resolver: (liberar: () => void) => void;
  alAbortar?: () => void;
  signal?: AbortSignal;
}

function errorAbortado(): Error {
  const error = new Error('Descarga cancelada');
  error.name = 'AbortError';
  return error;
}

export function crearLimitador(maximo: number): LimitadorConcurrencia {
  const limite = Math.max(1, Math.floor(maximo));
  let activos = 0;
  const cola: Espera[] = [];

  const crearLiberar = () => {
    let liberado = false;
    return () => {
      if (liberado) return;
      liberado = true;
      activos -= 1;
      despachar();
    };
  };

  function despachar() {
    while (activos < limite && cola.length > 0) {
      const siguiente = cola.shift() as Espera;
      if (siguiente.signal && siguiente.alAbortar) siguiente.signal.removeEventListener('abort', siguiente.alAbortar);
      activos += 1;
      siguiente.resolver(crearLiberar());
    }
  }

  return {
    get activos() {
      return activos;
    },
    get enCola() {
      return cola.length;
    },
    adquirir(signal) {
      if (signal?.aborted) return Promise.reject(errorAbortado());
      if (activos < limite) {
        activos += 1;
        return Promise.resolve(crearLiberar());
      }
      return new Promise<() => void>((resolve, reject) => {
        const espera: Espera = { resolver: resolve, signal };
        if (signal) {
          espera.alAbortar = () => {
            const indice = cola.indexOf(espera);
            if (indice >= 0) cola.splice(indice, 1);
            reject(errorAbortado());
          };
          signal.addEventListener('abort', espera.alAbortar, { once: true });
        }
        cola.push(espera);
      });
    },
  };
}
