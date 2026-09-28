import type { OfficialFormatItem, OfficialFormatManual } from '@/types/formatoOficial';

/**
 * `lista === false` es "Falta configurar" (`OfficialFormato::tieneConfiguracion()`)
 * y `archivado === true` significa que ya no debe ofrecerse: en ambos casos
 * RH ve el catálogo (para saber que existe) pero nunca debe poder arrancar
 * el flujo de generación — mismo criterio para el botón del detalle y para
 * filtrar la fila tocable en el catálogo.
 */
export function puedeIniciarGeneracion(formato: Pick<OfficialFormatItem, 'lista' | 'archivado'>): boolean {
  return formato.lista && !formato.archivado;
}

/**
 * Etiqueta central de `aplica_a` — un solo lugar para no repetir el mapeo
 * en catálogo/detalle/wizard.
 */
export function aplicaALabel(aplicaA: string): string {
  switch (aplicaA) {
    case 'colaborador':
      return 'Colaboradores';
    case 'candidato':
      return 'Candidatos';
    case 'ambos':
      return 'Colaboradores y candidatos';
    default:
      return aplicaA;
  }
}

/**
 * Manuales que siguen sin valor y son obligatorios — el semáforo para
 * habilitar "Continuar"/"Generar" en el paso de datos manuales. Toma en
 * cuenta tanto lo ya capturado por el usuario en esta sesión (`values`)
 * como un `valor` previo que el backend regresó al reintentar `preparar()`.
 */
export function manualesPendientes(manuales: OfficialFormatManual[], values: Record<string, string>): OfficialFormatManual[] {
  return manuales.filter((manual) => {
    if (!manual.requerido) return false;
    const value = values[manual.clave] ?? manual.valor ?? '';
    return value.trim() === '';
  });
}

/**
 * Payload real que se manda a `preparar`/`vista-previa`/`generar`: solo las
 * claves con valor (vacío no se manda — nunca se pisa un `valor` previo del
 * backend con una cadena vacía por accidente).
 */
export function buildManualesPayload(manuales: OfficialFormatManual[], values: Record<string, string>): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const manual of manuales) {
    const value = (values[manual.clave] ?? manual.valor ?? '').trim();
    if (value !== '') payload[manual.clave] = value;
  }
  return payload;
}
