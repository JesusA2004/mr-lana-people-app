import type { LaborDocument } from '@/types/laborDocument';

export interface LaborDocumentYearGroup {
  anio: string;
  documentos: LaborDocument[];
}

/**
 * Agrupa documentos laborales por año (sección 21/45: "Para recibos de
 * nómina: agrupar por año/periodo"). Se agrupa por el año de `fecha` —
 * dentro de cada año la lista conserva el orden que ya trae el backend
 * (más reciente primero). Años ordenados descendente.
 */
export function groupLaborDocumentsByYear(documentos: LaborDocument[]): LaborDocumentYearGroup[] {
  const byYear = new Map<string, LaborDocument[]>();

  for (const documento of documentos) {
    const anio = documento.fecha ? documento.fecha.slice(0, 4) : 'Sin fecha';
    const existing = byYear.get(anio);
    if (existing) {
      existing.push(documento);
    } else {
      byYear.set(anio, [documento]);
    }
  }

  return Array.from(byYear.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([anio, docs]) => ({ anio, documentos: docs }));
}
