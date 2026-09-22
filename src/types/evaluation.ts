/**
 * Evaluación de periodo de prueba — espejo de
 * `App\Services\Contratos\EvaluacionPeriodoPruebaService::aArray()`.
 *
 *   pendiente → capturada (jefe) → autorizada (RH/Dirección)
 *                      ↘ devuelta ↗
 */

import type { ContratoLaboral } from './cicloLaboral';
import type { ColaboradorRef } from '@/utils/normalize';

export type EstadoEvaluacion = 'pendiente' | 'capturada' | 'devuelta' | 'autorizada';
export type ResultadoEvaluacion = 'aprobado' | 'no_aprobado';

export interface EvaluacionCriterio {
  criterio: string;
  calificacion: number | null;
  comentario: string | null;
}

export interface Evaluacion {
  id: number;
  colaborador: ColaboradorRef | null;
  contrato: ContratoLaboral | null;
  estado: EstadoEvaluacion | string;
  estado_etiqueta: string | null;
  fecha_limite: string | null;
  fecha_evaluacion: string | null;
  criterios: EvaluacionCriterio[];
  /** `config('contratos.criterios_evaluacion')` — el backend los sugiere; la app nunca inventa criterios. */
  criterios_sugeridos: string[];
  calificacion: number | null;
  resultado: ResultadoEvaluacion | string | null;
  recomienda_renovar: boolean | null;
  observaciones: string | null;
  decision_renovar: boolean | null;
  comentario_autorizacion: string | null;
  autorizada_en: string | null;
  contrato_renovacion_id: number | null;
}

/** Cuerpo de `POST /evaluaciones/{id}/capturar` (`CapturarEvaluacionRequest`). */
export interface CapturarEvaluacionPayload {
  criterios: { criterio: string; calificacion: number; comentario?: string | null }[];
  resultado?: ResultadoEvaluacion;
  recomienda_renovar: boolean;
  observaciones?: string | null;
}

/** Cuerpo de `POST /evaluaciones/{id}/autorizar` (`AutorizarEvaluacionRequest`). */
export interface AutorizarEvaluacionPayload {
  renovar: boolean;
  comentario?: string | null;
  motivo_no_renovacion?: string | null;
  fecha_efectiva?: string | null;
}
