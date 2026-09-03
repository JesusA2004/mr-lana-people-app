/**
 * Los nombres de campo exactos que devuelve el backend para perfil/dashboard
 * no están confirmados contra una respuesta real todavía. Se modelan los
 * nombres más probables (snake_case, español, estilo Laravel) como opcionales
 * y se conserva un índice `[key: string]: unknown` para tolerar variaciones
 * sin romper tipos. Ver utils/formatters.ts `pickString` / `pickNumber` para
 * leer estos campos de forma defensiva en las pantallas.
 */
export interface CollaboratorProfile {
  nombre_completo?: string;
  numero_empleado?: string;
  puesto?: string;
  sucursal?: string;
  departamento?: string;
  empresa?: string;
  fecha_ingreso?: string;
  antiguedad?: string;
  estatus_laboral?: string;
  imss?: string;
  periodo_prueba?: string | boolean;
  /** Ruta protegida por sesión web del NAS; puede no ser accesible con Bearer token. */
  foto_url?: string;
  /** URL firmada temporal pensada para consumo desde apps (aún no confirmada en backend). */
  foto_url_api?: string;
  [key: string]: unknown;
}

export interface DashboardData {
  colaborador?: CollaboratorProfile;
  vacaciones_disponibles?: number;
  solicitudes_recientes?: unknown[];
  notificaciones_no_leidas?: number;
  [key: string]: unknown;
}
