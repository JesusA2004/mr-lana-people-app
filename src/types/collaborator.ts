import type { Solicitud } from '@/types/request';
import type { VacationBalance } from '@/types/vacation';

export interface CollaboratorProfile {
  id?: number | string;
  nombre?: string;
  apellidos?: string;
  nombre_completo?: string;
  correo?: string;
  numero_empleado?: string;
  puesto?: string | null;
  departamento?: string | null;
  sucursal?: string | null;
  empresa?: string | null;
  jefe_directo?: string | null;
  fecha_ingreso?: string | null;
  antiguedad_anios?: number;
  /** Ruta protegida por sesión web; puede no ser accesible desde Expo Go. */
  foto_url?: string | null;
  /** Preparado para una futura URL firmada por API. */
  foto_url_api?: string | null;
  [key: string]: unknown;
}

export interface DashboardNotificationSummary {
  no_leidas?: number;
  recientes?: unknown[];
}

export interface DashboardData {
  perfil?: CollaboratorProfile;
  vacaciones?: VacationBalance;
  solicitudes_recientes?: Solicitud[];
  notificaciones?: DashboardNotificationSummary;
  [key: string]: unknown;
}
