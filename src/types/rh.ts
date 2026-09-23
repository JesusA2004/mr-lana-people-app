/**
 * Tipos de la experiencia RH móvil (API v1) — espejo de
 * capacitaciones/docs/RH_MOBILE_API.md + capacitaciones/docs/API_MOVIL.md
 * (sección "Expedientes"). Regla de oro (AGENTS.md sección 8): la app NUNCA
 * decide permisos/alcance/flujo — siempre pinta `acciones_permitidas` /
 * `workflow` tal como los manda el backend. Si `acciones_permitidas` no
 * trae `"aprobar"`, el botón Aprobar no existe, no se deshabilita.
 */

export type AllowedAction =
  | 'ver'
  | 'aprobar'
  | 'rechazar'
  | 'solicitar_correccion'
  | 'autorizar_cambio'
  | (string & {});

export type RhPendienteTipo = 'solicitud' | 'vacaciones' | 'documento' | 'incorporacion';
export type RhPendienteFiltro = RhPendienteTipo | 'todos';

export interface RhColaboradorResumen {
  id: number;
  nombre: string;
  numero_empleado?: string | null;
  puesto?: string | null;
  sucursal?: string | null;
}

export interface RhPendiente {
  /** `"solicitud:184"` — id compuesto único de la bandeja, no usar como id de recurso (ver `resource_id`). */
  id: string;
  tipo: RhPendienteTipo;
  resource_id: number;
  /** Siempre `"normal"` en esta primera versión del backend (ver RH_MOBILE_API.md, "Pendiente"). */
  prioridad: 'normal' | (string & {});
  titulo: string;
  colaborador: RhColaboradorResumen;
  resumen?: string | null;
  creado_en: string;
  acciones_permitidas: AllowedAction[];
}

export interface RhPendientesMeta {
  current_page: number;
  per_page: number;
  total: number;
  solicitudes: number;
  vacaciones: number;
  documentos: number;
  incorporaciones: number;
}

export interface RhPendientesResponse {
  data: RhPendiente[];
  meta: RhPendientesMeta;
}

export interface RhDashboardResumen {
  pendientes_total: number;
  solicitudes: number;
  vacaciones: number;
  documentos: number;
  incorporaciones: number;
}

export interface RhDashboard {
  resumen: RhDashboardResumen;
  urgentes: RhPendiente[];
  recientes: RhPendiente[];
}

export interface WorkflowEtapa {
  clave: string;
  nombre: string;
}

export interface WorkflowProgreso {
  actual: number;
  total: number;
}

/** Espejo de `App\Services\RhMobile\WorkflowService` — un solo flujo de una etapa hoy ("rh"), extensible sin tocar la app. */
export interface Workflow {
  estado: string;
  etapa_actual: WorkflowEtapa | null;
  progreso: WorkflowProgreso;
  flujo: WorkflowEtapa[];
  siguiente_etapa: WorkflowEtapa | null;
}

export interface RhHistorialEntrada {
  accion: string;
  comentario?: string | null;
  usuario?: string | null;
  fecha: string;
}

export interface RhAdjunto {
  id: number;
  nombre: string;
}

/** `prestamo.visto_bueno` del detalle RH: decisión del jefe inmediato. */
export interface RhPrestamoVistoBueno {
  requerido: boolean;
  /** `aprobado` | `rechazado` | `pendiente` | `no_aplica` (o una decisión nueva del backend). */
  estado: string;
  jefe?: string | null;
  comentario?: string | null;
  fecha?: string | null;
}

/**
 * Bloque `prestamo` del detalle RH: lo necesario para decidir SIN autorizar
 * a ciegas. `puede_autorizar`/`puede_rechazar` son la autoridad visual
 * (PrestamoPolicy + visto bueno + estado pendiente) — la app no los infiere
 * por rol ni por monto. El backend sigue validando al autorizar (403/422).
 */
export interface RhPrestamoDecision {
  monto_solicitado: number | null;
  plazo_solicitado: number | null;
  visto_bueno: RhPrestamoVistoBueno;
  prestamo_id: number | null;
  puede_autorizar: boolean;
  puede_rechazar: boolean;
}

export interface RhSolicitud {
  id: number;
  folio: string;
  tipo: string;
  estado: string;
  colaborador: RhColaboradorResumen;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  motivo?: string | null;
  motivo_rechazo?: string | null;
  adjuntos: RhAdjunto[];
  acciones_permitidas: AllowedAction[];
  workflow: Workflow;
  historial: RhHistorialEntrada[];
  /**
   * Préstamo (contrato 2026-09-22, `Api\V1\Rh\SolicitudController::show()`):
   * `monto_solicitado` y `plazo_solicitado` (meses; sale de `plazo_meses`
   * del modelo) llegan SIEMPRE como clave, con `null` cuando no aplican —
   * por eso se comparan con `!= null`, nunca con `!== undefined`.
   * `prestamo` trae la decisión (visto bueno + `puede_autorizar`).
   *
   * Baja de colaborador: `colaborador_objetivo`/`fecha_efectiva`/`tipo_baja`
   * siguen siendo PREPARACIÓN — el controlador aún no los serializa y la
   * app bloquea "Aprobar" hasta que lleguen (ver `src/utils/rhActions.ts`).
   */
  dias_solicitados?: number;
  monto_solicitado?: string | number | null;
  plazo_solicitado?: number | null;
  /** Solo para `tipo === 'prestamo'`; `null` en cualquier otro tipo. */
  prestamo?: RhPrestamoDecision | null;
  fecha_efectiva?: string;
  tipo_baja?: string;
  colaborador_objetivo?: RhColaboradorResumen;
  [key: string]: unknown;
}

export interface RhVacacion {
  id: number;
  colaborador: RhColaboradorResumen;
  fecha_inicio: string;
  fecha_fin: string;
  dias_solicitados: number;
  saldo_disponible?: number;
  comentario?: string | null;
  motivo_rechazo?: string | null;
  estado: string;
  acciones_permitidas: AllowedAction[];
  workflow?: Workflow;
  historial?: RhHistorialEntrada[];
  [key: string]: unknown;
}

export interface RhDocumento {
  id: number;
  tipo?: string | null;
  nombre: string;
  estado: string;
  colaborador: RhColaboradorResumen;
  fecha_subida?: string | null;
  fecha_revision?: string | null;
  motivo_rechazo?: string | null;
  acciones_permitidas: AllowedAction[];
  workflow?: Workflow;
  [key: string]: unknown;
}

export type RhIncorporacionEstado = 'incompleto' | 'en_revision' | 'completo' | 'aprobada' | 'rechazada';

export interface RhIncorporacionDocumento {
  id: number;
  tipo: string;
  nombre: string;
  obligatorio: boolean;
  estado: string;
  motivo_rechazo?: string | null;
}

export interface RhIncorporacion {
  colaborador: RhColaboradorResumen;
  estado: RhIncorporacionEstado;
  progreso: {
    total: number;
    aprobados: number;
    pendientes: number;
    en_revision: number;
    rechazados: number;
    porcentaje: number;
  };
  documentos: RhIncorporacionDocumento[];
  acciones_permitidas: AllowedAction[];
  [key: string]: unknown;
}

export interface RhColaborador {
  id: number;
  nombre: string;
  numero_empleado?: string | null;
  puesto?: string | null;
  sucursal?: string | null;
  departamento?: string | null;
  estatus?: string;
  solicitudes_pendientes?: number;
  vacaciones_pendientes?: number;
  documentos_pendientes?: number;
  [key: string]: unknown;
}

export interface RhExpedienteDocumento {
  id: number;
  tipo: string;
  nombre: string;
  obligatorio: boolean;
  estado: string;
  motivo_rechazo?: string | null;
  fecha_subida?: string | null;
  fecha_revision?: string | null;
  acciones_permitidas?: AllowedAction[];
  [key: string]: unknown;
}

export interface RhExpediente {
  colaborador: RhColaboradorResumen & { estatus?: string };
  estado: string;
  documentos: RhExpedienteDocumento[];
  acciones_permitidas?: AllowedAction[];
  [key: string]: unknown;
}
