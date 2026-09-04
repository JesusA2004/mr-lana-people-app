import type { ExpedienteDocumentoEntry } from './document';

/** Espejo de `App\Services\Expedientes\ExpedienteService::resumenCompletitud()`. */
export interface ExpedienteResumen {
  porcentaje: number;
  requeridos_total: number;
  requeridos_aprobados: number;
  pendientes: number;
  rechazados: number;
}

/** Contrato de `GET /api/v1/colaborador/expediente` (pendiente de agregar en backend — ver docs/MOBILE_BACKEND_REQUIREMENTS.md P0.1). */
export interface ExpedienteResponse {
  resumen: ExpedienteResumen;
  documentos: ExpedienteDocumentoEntry[];
}
