import type { RhBirthdayWallState } from './birthdayWall';

/**
 * Bandeja de cumpleaños para RH — espejo EXACTO de
 * `App\Http\Controllers\Api\V1\Rh\CumpleanosController` en capacitaciones
 * (confirmado contra el código fuente real, no solo `docs/CUMPLEANOS.md`).
 * Nunca expone año de nacimiento ni edad. `foto_url_api`/`card_url` son
 * rutas de streaming protegidas (Bearer), nunca la ruta física del NAS.
 */

export interface RhBirthdayColaborador {
  id: number;
  nombre: string;
  numero_empleado?: string | null;
  /** Streaming autenticado (`GET /rh/cumpleanos/{colaborador}/foto`) — `null` si no tiene foto. */
  foto_url_api: string | null;
  puesto?: string | null;
  sucursal?: string | null;
  departamento?: string | null;
}

/**
 * Entrada de la bandeja `GET /rh/cumpleanos`. `greeting_id` es `null` hasta
 * que el command diario genera la felicitación de ese colaborador — no
 * todos los colaboradores listados (ej. "próximos 7 días") tienen una
 * `BirthdayGreeting` todavía.
 */
export interface RhBirthdayItem {
  greeting_id: number | null;
  colaborador: RhBirthdayColaborador;
  dia: number;
  /** El backend actual no siempre manda `mes` (solo lo hace explícito para `periodo=mes`) — nunca asumir presente. */
  mes?: number;
  es_hoy: boolean;
  felicitacion_generada: boolean;
  enviada: boolean;
}

export interface RhBirthdayMeta {
  hoy: number;
  proximos_7_dias: number;
  proximos_30_dias: number;
  current_page: number;
  per_page: number;
  total: number;
}

export interface RhBirthdayListResponse {
  data: RhBirthdayItem[];
  meta: RhBirthdayMeta;
}

export type RhBirthdayPeriodo = 'hoy' | '7_dias' | '30_dias' | 'mes';

/**
 * Detalle `GET /rh/cumpleanos/{greeting}` — destino real del push
 * `rh_cumpleanos` cuando `resource_id` apunta a un `BirthdayGreeting`
 * concreto. El backend actual NO manda `acciones_permitidas` en este
 * recurso todavía (confirmado contra el controlador): no hay acción de
 * "enviar felicitación manual" vía API móvil hoy — solo existe desde el
 * panel web (`/rh/cumpleanos/{colaborador}/felicitacion`). La app nunca
 * inventa ese botón; si el backend llega a agregar `acciones_permitidas`
 * aquí, se lee igual que en el resto de RH (ver `utils/rhActions.ts`).
 */
export interface RhBirthdayDetail {
  greeting_id: number;
  fecha: string;
  frase?: string | null;
  enviada: boolean;
  card_url: string | null;
  colaborador: RhBirthdayColaborador;
  acciones_permitidas?: string[];
  /** Muro de felicitaciones (backend 2026-09-22). Ausente en backends previos. */
  muro?: RhBirthdayWallState;
}
