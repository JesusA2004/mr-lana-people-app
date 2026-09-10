import { groupLaborDocumentsByYear } from '../laborDocuments';

import type { LaborDocument } from '@/types/laborDocument';

function doc(overrides: Partial<LaborDocument>): LaborDocument {
  return {
    id: 1,
    tipo: 'contrato',
    titulo: 'Documento',
    fecha: '2026-01-01',
    puede_ver: true,
    puede_descargar: true,
    ...overrides,
  };
}

describe('groupLaborDocumentsByYear', () => {
  it('agrupa por año y ordena los años descendente', () => {
    const documentos: LaborDocument[] = [
      doc({ id: 1, fecha: '2025-08-01' }),
      doc({ id: 2, fecha: '2026-09-01' }),
      doc({ id: 3, fecha: '2026-01-01' }),
    ];

    const grupos = groupLaborDocumentsByYear(documentos);

    expect(grupos.map((g) => g.anio)).toEqual(['2026', '2025']);
    expect(grupos[0].documentos.map((d) => d.id)).toEqual([2, 3]);
    expect(grupos[1].documentos.map((d) => d.id)).toEqual([1]);
  });

  it('conserva el orden original dentro de cada año (el backend ya manda más reciente primero)', () => {
    const documentos: LaborDocument[] = [doc({ id: 10, fecha: '2026-09-15' }), doc({ id: 11, fecha: '2026-09-01' })];
    const grupos = groupLaborDocumentsByYear(documentos);
    expect(grupos[0].documentos.map((d) => d.id)).toEqual([10, 11]);
  });

  it('lista vacía da grupos vacíos', () => {
    expect(groupLaborDocumentsByYear([])).toEqual([]);
  });

  it('documento sin fecha cae en un grupo "Sin fecha" en vez de romper', () => {
    const grupos = groupLaborDocumentsByYear([doc({ id: 1, fecha: '' })]);
    expect(grupos[0].anio).toBe('Sin fecha');
  });
});
