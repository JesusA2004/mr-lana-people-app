import type { CierreLaboral } from '@/types/rhCiclo';
import { ESTADOS_CIERRE } from '@/types/rhCiclo';

/**
 * Presentación del cierre laboral (`CierreLaboralService` +
 * `FiniquitoService`). Las guardas replican EXACTAMENTE las del backend
 * solo para no ofrecer un botón que respondería 422 con seguridad; el
 * backend sigue siendo la autoridad (Policy + `exigirNoFinal()` +
 * `asegurarNoFirmado()` + reglas de `config/contratos.php → cierre`).
 */

export const CIERRE_STEPS = ['Motivo', 'Aviso', 'Finiquito', 'Firma', 'Pago', 'Baja', 'Expediente'] as const;

const STEP_BY_ESTADO: Record<string, number> = {
  iniciado: 1,
  aviso_registrado: 2,
  finiquito_en_proceso: 3,
  finiquito_firmado: 4,
  pagado: 5,
  baja_ejecutada: 6,
  expediente_cerrado: CIERRE_STEPS.length,
};

/** Paso actual del stepper (Motivo siempre está hecho: el cierre existe). */
export function cierreStepIndex(estado: string | null | undefined): number {
  return estado ? (STEP_BY_ESTADO[estado] ?? 1) : 1;
}

const ORDEN = new Map<string, number>(ESTADOS_CIERRE.map((estado, index) => [estado, index]));

export function cierreBadge(estado: string): string {
  if (estado === 'cancelado') return 'cancelada';
  if (estado === 'expediente_cerrado') return 'cerrada';
  if (estado === 'baja_ejecutada' || estado === 'pagado') return 'aprobado';
  return 'en_revision';
}

export function isCierreFinal(estado: string | null | undefined): boolean {
  return estado === 'expediente_cerrado' || estado === 'cancelado';
}

function antesDe(estado: string, limite: string): boolean {
  return (ORDEN.get(estado) ?? 99) < (ORDEN.get(limite) ?? 0);
}

export type CierreOperation =
  | 'aviso'
  | 'generar_aviso'
  | 'calcular'
  | 'conceptos'
  | 'revisar'
  | 'generar_finiquito'
  | 'finiquito_firmado'
  | 'confirmar_pago'
  | 'ejecutar_baja'
  | 'cerrar_expediente'
  | 'cancelar';

export function availableCierreOperations(cierre: CierreLaboral, permissions: string[] | undefined): CierreOperation[] {
  const perms = new Set(permissions ?? []);
  const estado = cierre.estado;
  const finiquito = cierre.finiquito;
  const finiquitoInmutable = finiquito?.estado === 'firmado' || finiquito?.estado === 'pagado';
  const ops: CierreOperation[] = [];

  if (isCierreFinal(estado)) return ops;
  const antesDeBaja = antesDe(estado, 'baja_ejecutada');

  if (perms.has('cierres.gestionar') && antesDeBaja) {
    ops.push('aviso', 'generar_aviso');
  }

  if (perms.has('finiquitos.calcular') && antesDeBaja && !finiquitoInmutable) {
    ops.push('calcular');
    if (finiquito) ops.push('conceptos', 'generar_finiquito', 'finiquito_firmado');
  }

  if (perms.has('finiquitos.revisar') && finiquito?.estado === 'borrador') ops.push('revisar');

  // `FiniquitoService::confirmarPago()`: exige firmado y sin pago previo.
  if (perms.has('finiquitos.confirmar_pago') && finiquito?.estado === 'firmado' && !finiquito.pagado_en) ops.push('confirmar_pago');

  // `ejecutarBaja()` con la configuración vigente exige finiquito firmado Y pago confirmado.
  if (perms.has('cierres.ejecutar_baja') && antesDeBaja && finiquito?.estado === 'pagado') ops.push('ejecutar_baja');

  if (perms.has('cierres.ejecutar_baja') && estado === 'baja_ejecutada') ops.push('cerrar_expediente');

  if (perms.has('cierres.gestionar') && antesDeBaja) ops.push('cancelar');

  return ops;
}

/** Qué falta para poder ejecutar la baja — para explicarlo en vez de mostrar un botón que fallaría. */
export function cierreSiguientePaso(cierre: CierreLaboral): string | null {
  const f = cierre.finiquito;
  if (isCierreFinal(cierre.estado)) return null;
  if (cierre.estado === 'baja_ejecutada') return 'Baja ejecutada: falta cerrar el expediente.';
  if (!f) return 'Calcula el finiquito para continuar.';
  if (f.estado === 'borrador') return 'El finiquito debe revisarse antes de generar el documento.';
  if (f.estado !== 'firmado' && f.estado !== 'pagado') return 'Genera el finiquito y sube el documento firmado.';
  if (!f.pagado_en) return 'Confirma el pago del finiquito para poder ejecutar la baja.';
  return 'Listo para ejecutar la baja.';
}
