/**
 * `GET /api/v1/rh/vacantes` — espejo exacto del arreglo que arma
 * `App\Http\Controllers\Api\V1\Rh\VacanteController::index()`
 * (docs/HEADCOUNT_Y_VACANTES.md). Módulo de solo lectura en móvil.
 */
export interface RhVacante {
  id: number;
  puesto?: string | null;
  departamento?: string | null;
  sucursal?: string | null;
  /** Ya viene traducido por `MotivoVacante::etiqueta()`. */
  motivo?: string | null;
  estado: string;
  estado_etiqueta?: string;
  fecha_apertura?: string;
  plazas_requeridas: number;
  plazas_cubiertas: number;
  plazas_disponibles: number;
  /** Vacante creada por el sistema a partir del headcount, no capturada a mano. */
  generada_automaticamente: boolean;
  candidatos_count: number;
  [key: string]: unknown;
}
