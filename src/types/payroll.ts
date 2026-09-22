/**
 * Recibo INTERNO de nómina semanal — NO fiscal, no es CFDI, no se timbra.
 * Espejo de `App\Services\Nomina\ReciboNominaService::aArray()`.
 * El colaborador solo consulta; nunca edita.
 */

import type { ColaboradorRef } from '@/utils/normalize';

export type TipoConceptoNomina = 'percepcion' | 'deduccion';

export interface ReciboConcepto {
  tipo: TipoConceptoNomina | string;
  concepto: string;
  cantidad: number | null;
  importe: number | null;
  observaciones: string | null;
}

export interface ReciboNomina {
  id: number;
  folio: string | null;
  tipo_periodo: string | null;
  ejercicio: number | null;
  numero_periodo: number | null;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  fecha_pago: string | null;
  total_percepciones: number | null;
  total_deducciones: number | null;
  neto: number | null;
  observaciones: string | null;
  /** `false` ⇒ el PDF aún no se generó: la UI NO ofrece botón de PDF. */
  tiene_pdf: boolean;
  leyenda: string;
  /** Solo en detalle. */
  conceptos?: ReciboConcepto[];
  /** Solo en el listado RH. */
  colaborador?: ColaboradorRef | null;
}

/** Resultado de `POST /rh/recibos/importar` (`ReciboNominaImportService::importar()`). */
export interface ReciboImportResult {
  lote: string | null;
  simulacion: boolean;
  filas_leidas: number;
  recibos_generados: number;
  colaboradores: ReciboImportColaborador[];
  errores: ReciboImportError[];
}

/** Resumen por colaborador (una fila de `colaboradores[]`). `recibo_id` es `null` en simulación. */
export interface ReciboImportColaborador {
  numero_empleado: string;
  colaborador: string;
  conceptos: number;
  total_percepciones: number | null;
  total_deducciones: number | null;
  neto: number | null;
  recibo_id: number | null;
}

/** `fila` es `null` cuando el error es por colaborador y no por renglón del archivo. */
export interface ReciboImportError {
  fila: number | null;
  numero_empleado: string | null;
  motivo: string;
}
