/**
 * Contrato real de `GET /api/v1/mobile/bootstrap` — espejo de
 * `App\Services\Mobile\MobileBootstrapService::bootstrap()` en capacitaciones
 * (ver docs/BACKEND_MOBILE_V5.md). Fuente principal para saber quién es el
 * usuario, qué puede hacer (capabilities/features, siempre calculadas en el
 * backend a partir de roles/permisos de Spatie) y los contadores para
 * badges — la app NUNCA debe deducir nada de esto por nombre de rol.
 */

export interface MobileBootstrapEntidad {
  id: number;
  nombre: string;
}

export interface MobileBootstrapUser {
  id: number;
  name: string;
  apellidos?: string | null;
  email: string;
  estatus: string;
  numero_empleado?: string | null;
  /** Streaming autenticado (`GET /colaborador/foto`, Bearer) — null si no tiene foto. */
  foto_url: string | null;
  empresa: MobileBootstrapEntidad | null;
  sucursal: MobileBootstrapEntidad | null;
  departamento: MobileBootstrapEntidad | null;
  puesto: MobileBootstrapEntidad | null;
  roles: string[];
  permissions: string[];
}

/**
 * Capacidades calculadas por el backend — nunca deducir por nombre de rol
 * (ej. `if role === 'rh_admin'`). `rh: true` es lo único que decide si la
 * app ofrece la experiencia "Gestión RH" (selector, ver AGENTS.md sección 3).
 */
export interface MobileBootstrapCapabilities {
  employee: boolean;
  rh: boolean;
  manager: boolean;
  director: boolean;
}

export interface MobileBootstrapFeatures {
  incorporacion: boolean;
  expedientes: boolean;
  solicitudes: boolean;
  vacaciones: boolean;
  notificaciones: boolean;
  push: boolean;
  rh_mobile: boolean;
  maintenance: boolean;
  /**
   * Feature flag de la felicitación de cumpleaños (hero del Dashboard,
   * `/cumpleanos`, celebración automática). Opcional en el tipo porque el
   * backend puede no mandarlo todavía — ausente se trata como habilitado
   * (ver `isFeatureEnabled`, fail-open), nunca como apagado por accidente.
   */
  cumpleanos?: boolean;
  [key: string]: boolean | undefined;
}

export interface MobileBootstrapCounts {
  notifications: number;
  tasks: number;
  documents_pending: number;
  rh_pendientes: number;
  rh_solicitudes: number;
  rh_vacaciones: number;
  rh_documentos: number;
  rh_incorporaciones: number;
  [key: string]: number;
}

export interface MobileBootstrap {
  user: MobileBootstrapUser;
  capabilities: MobileBootstrapCapabilities;
  features: MobileBootstrapFeatures;
  counts: MobileBootstrapCounts;
  server: {
    time: string;
    timezone: string;
  };
}
