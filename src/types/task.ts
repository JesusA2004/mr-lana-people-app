/**
 * Bandeja de trabajo (tareas) — espejo de `App\Services\Tareas\TareaService::aArray()`.
 *
 * Tarea = ACCIÓN pendiente con objeto relacionado (`related_type`/
 * `related_id`) y `accion` estable. Notificación = comunicación/evento.
 * La navegación de una tarea se resuelve SOLO con esos campos (ver
 * `src/utils/taskRoutes.ts`), nunca a partir del título humano.
 */

import type { ColaboradorRef } from '@/utils/normalize';

/** `App\Enums\TipoTarea`. */
export type TipoTarea =
  | 'expediente_incompleto'
  | 'documento_rechazado'
  | 'contrato_pendiente'
  | 'firma_pendiente'
  | 'impresion_pendiente'
  | 'firma_fisica_pendiente'
  | 'envio_original_pendiente'
  | 'recepcion_original_pendiente'
  | 'escaneo_pendiente'
  | 'contrato_por_vencer'
  | 'evaluacion_pendiente'
  | 'evaluacion_por_autorizar'
  | 'vacaciones_pendiente'
  | 'permiso_pendiente'
  | 'prestamo_pendiente'
  | 'finiquito_pendiente'
  | 'activacion_pendiente';

/** `App\Enums\PrioridadTarea`. */
export type PrioridadTarea = 'baja' | 'media' | 'alta' | 'urgente';

export interface Tarea {
  id: number;
  tipo: TipoTarea | string;
  tipo_etiqueta: string | null;
  titulo: string;
  descripcion: string | null;
  prioridad: PrioridadTarea | string;
  accion: string | null;
  related_type: string | null;
  related_id: number | null;
  colaborador: ColaboradorRef | null;
  vence_en: string | null;
  read_at: string | null;
  resolved_at: string | null;
  creada_en: string | null;
  datos: Record<string, unknown> | null;
}

export interface TareasConteos {
  abiertas: number;
  no_leidas: number;
  vencidas: number;
}

export type TareasEstadoFiltro = 'abiertas' | 'resueltas' | 'todas';
