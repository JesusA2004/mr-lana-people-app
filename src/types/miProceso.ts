/**
 * "Lo que necesitas hacer" del colaborador — `GET /colaborador/mi-proceso`
 * (`CicloLaboralService::misPendientes`). El backend es la ÚNICA fuente del
 * estado del ciclo: la app solo pinta lo que llega (títulos y textos ya
 * vienen en lenguaje para la persona; nunca nombres internos de etapas).
 */

/** Pantalla de la app a la que lleva una acción (la decide el backend). */
export type MiProcesoDestino = 'expediente' | 'documentos-laborales' | 'lecciones';

export interface MiProcesoAccion {
  etiqueta: string;
  destino: MiProcesoDestino | null;
}

export interface MiProcesoPendiente {
  clave: string;
  titulo: string;
  descripcion: string;
  /** `accion`: la persona tiene algo que hacer. `espera`: le toca a otra persona. */
  tipo: 'accion' | 'espera';
  accion: MiProcesoAccion | null;
  detalle: string[];
}

export interface LeccionPregunta {
  indice: number;
  pregunta: string;
  opciones: string[];
}

export type LeccionEstado = 'disponible' | 'aprobada' | 'bloqueada' | 'en_espera';

export interface Leccion {
  avanceId: number;
  titulo: string;
  descripcion: string | null;
  estado: LeccionEstado;
  contenidoUrl: string | null;
  contenido: string | null;
  preguntas: LeccionPregunta[];
  puedePresentar: boolean;
  retroalimentacion: string | null;
  calificacion: number | null;
  calificacionMinima: number | null;
}

export interface MiProceso {
  pendientes: MiProcesoPendiente[];
  lecciones: Leccion[];
  documentos: { requeridos: number; aprobados: number; faltantes: number } | null;
  todoListo: boolean;
}

export interface ResultadoLeccion {
  numero: number;
  calificacion: number;
  aprobado: boolean;
  proceso: MiProceso | null;
}
