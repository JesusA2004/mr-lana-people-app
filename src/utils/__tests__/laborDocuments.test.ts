import { normalizeLaborDocument } from '@/api/normalizers/laborDocument';
import type { LaborDocument } from '@/types/laborDocument';
import {
  availableRhDocumentOperations,
  buildLaborDocumentTimeline,
  canColaboradorSign,
  filterLaborDocuments,
  isLaborDocumentSigned,
} from '../laborDocuments';

function doc(overrides: Partial<LaborDocument> = {}): LaborDocument {
  return {
    ...normalizeLaborDocument({ id: 1, titulo: 'Contrato', estado: 'generado', categoria: 'contratos' }),
    ...overrides,
  };
}

describe('normalizeLaborDocument (contrato real 2026-09-22)', () => {
  it('normaliza banderas, colaborador y original físico', () => {
    const d = normalizeLaborDocument({
      id: '7',
      titulo: null,
      estado: 'pendiente_firma_colaborador',
      requiere_firma_digital: 1,
      colaborador: { id: 3, nombre: 'Ana', numero_empleado: 'EMP-0003' },
      original_fisico: { testigos: [{ nombre: 'Luis' }, { foo: 1 }], huella_registrada: true },
      eventos: [{ accion: 'generado', fecha: '2026-09-22T10:00:00Z' }],
    });
    expect(d.id).toBe(7);
    expect(d.titulo).toBe('Documento laboral');
    expect(d.requiere_firma_digital).toBe(true);
    expect(d.colaborador?.numero_empleado).toBe('EMP-0003');
    expect(d.original_fisico?.testigos).toEqual([{ nombre: 'Luis', puesto: null }]);
    expect(d.eventos).toHaveLength(1);
  });

  it('sin eventos no inventa bitácora', () => {
    expect(normalizeLaborDocument({ id: 1 }).eventos).toBeUndefined();
  });
});

describe('estados de firma', () => {
  it('solo se firma en pendiente_firma_colaborador', () => {
    expect(canColaboradorSign(doc({ estado: 'pendiente_firma_colaborador' }))).toBe(true);
    expect(canColaboradorSign(doc({ estado: 'firmado_digitalmente' }))).toBe(false);
    expect(canColaboradorSign(doc({ estado: 'generado' }))).toBe(false);
  });

  it('isLaborDocumentSigned espeja EstadoFlujoDocumento::estaFirmado()', () => {
    expect(isLaborDocumentSigned(doc({ estado: 'pendiente_impresion' }))).toBe(true);
    expect(isLaborDocumentSigned(doc({ estado: 'archivado' }))).toBe(true);
    expect(isLaborDocumentSigned(doc({ estado: 'pendiente_firma_colaborador' }))).toBe(false);
    expect(isLaborDocumentSigned(doc({ estado: 'cancelado' }))).toBe(false);
  });

  it('filtra por categoría real y por firma', () => {
    const lista = [
      doc({ id: 1, categoria: 'contratos', estado: 'pendiente_firma_colaborador' }),
      doc({ id: 2, categoria: 'nomina_interna', estado: 'archivado' }),
    ];
    expect(filterLaborDocuments(lista, 'por_firmar').map((d) => d.id)).toEqual([1]);
    expect(filterLaborDocuments(lista, 'firmados').map((d) => d.id)).toEqual([2]);
    expect(filterLaborDocuments(lista, 'comprobantes').map((d) => d.id)).toEqual([2]);
    expect(filterLaborDocuments(lista, 'contratos').map((d) => d.id)).toEqual([1]);
  });
});

describe('buildLaborDocumentTimeline', () => {
  it('solo incluye los pasos que pide la plantilla', () => {
    const keys = buildLaborDocumentTimeline(doc({ requiere_firma_digital: true })).map((s) => s.key);
    expect(keys).toEqual(['generado', 'firma_digital', 'archivado']);
  });

  it('marca hecho/actual según el estado real', () => {
    const steps = buildLaborDocumentTimeline(
      doc({ estado: 'pendiente_impresion', requiere_firma_digital: true, requiere_impresion: true, requiere_firma_fisica: true }),
    );
    expect(steps.find((s) => s.key === 'firma_digital')?.status).toBe('done');
    expect(steps.find((s) => s.key === 'impresion')?.status).toBe('current');
    expect(steps.find((s) => s.key === 'firma_fisica')?.status).toBe('pending');
  });

  it('cancelado marca los pasos pendientes como cancelados', () => {
    const steps = buildLaborDocumentTimeline(doc({ estado: 'cancelado', generado_en: '2026-09-22' }));
    expect(steps[0].status).toBe('done');
    expect(steps[steps.length - 1].status).toBe('cancelled');
  });
});

describe('availableRhDocumentOperations', () => {
  const fisico = { requiere_impresion: true, requiere_firma_fisica: true };

  it('sin permiso no ofrece nada', () => {
    expect(availableRhDocumentOperations(doc({ ...fisico, estado: 'pendiente_impresion' }), ['documentos_laborales.ver'])).toEqual([]);
  });

  it('ofrece la transición que permite el estado', () => {
    const perms = ['documentos_laborales.operar_fisico'];
    expect(availableRhDocumentOperations(doc({ ...fisico, estado: 'pendiente_impresion' }), perms)).toContain('imprimir');
    expect(availableRhDocumentOperations(doc({ ...fisico, estado: 'enviado_corporativo' }), perms)).toEqual(['recepcion']);
    expect(availableRhDocumentOperations(doc({ ...fisico, estado: 'escaneado' }), perms)).toEqual(['archivar']);
  });

  it('nunca ofrece firma digital (es del titular) ni cancelar sin permiso', () => {
    const ops = availableRhDocumentOperations(doc({ estado: 'pendiente_firma_colaborador', requiere_firma_digital: true }), ['documentos_laborales.operar_fisico']);
    expect(ops).toEqual([]);
    expect(availableRhDocumentOperations(doc({ estado: 'generado' }), ['documentos_laborales.cancelar'])).toEqual(['cancelar']);
    expect(availableRhDocumentOperations(doc({ estado: 'archivado' }), ['documentos_laborales.cancelar'])).toEqual([]);
  });
});
