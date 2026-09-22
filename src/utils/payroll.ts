import type { ReciboConcepto, ReciboNomina } from '@/types/payroll';
import { formatDateShort } from './dates';

/** "Semana 38 · 2026" con los datos que manda el backend (`numero_periodo`/`ejercicio`); nunca se calcula la semana en el dispositivo. */
export function reciboPeriodoLabel(recibo: Pick<ReciboNomina, 'tipo_periodo' | 'numero_periodo' | 'ejercicio' | 'folio'>): string {
  if (recibo.numero_periodo !== null && recibo.ejercicio !== null) {
    const unidad = recibo.tipo_periodo === 'quincenal' ? 'Quincena' : recibo.tipo_periodo === 'mensual' ? 'Mes' : 'Semana';
    return `${unidad} ${recibo.numero_periodo} · ${recibo.ejercicio}`;
  }
  return recibo.folio ?? 'Recibo interno';
}

export function formatPeriodo(inicio: string | null, fin: string | null): string | null {
  if (!inicio && !fin) return null;
  if (inicio && fin) return `${formatDateShort(inicio)} – ${formatDateShort(fin)}`;
  return formatDateShort(inicio ?? fin);
}

/** Separa los conceptos que manda el backend; los totales SIEMPRE son los del backend, nunca se suman aquí. */
export function splitConceptos(conceptos: ReciboConcepto[] | undefined): { percepciones: ReciboConcepto[]; deducciones: ReciboConcepto[] } {
  const list = conceptos ?? [];
  return {
    percepciones: list.filter((c) => c.tipo === 'percepcion'),
    deducciones: list.filter((c) => c.tipo === 'deduccion'),
  };
}
