import { normalizarRhDocumento, normalizarRhExpediente } from '../normalizers/rhExpediente';

/** Forma REAL de `GET /api/v1/rh/expedientes/{id}` (Api\V1\Rh\ExpedienteController::show). */
const expedienteApi = {
  colaborador: { id: 7, nombre: 'Ana', apellidos: 'López Ruiz', numero_empleado: '7788', estatus: 'activo', sucursal: 'Cuernavaca', correo_corporativo: null },
  estado_incorporacion: 'en_revision',
  documentos: [
    { tipo_id: 1, tipo: 'ine', nombre: 'INE', obligatorio: true, documento_id: 31, estado: 'en_revision', nombre_original: 'ine.pdf', puede_descargar: true, puede_pedir_correccion: true },
    { tipo_id: 2, tipo: 'curp', nombre: 'CURP', obligatorio: true, documento_id: null, estado: 'pendiente' },
  ],
  documentos_totales: 2,
  puede_descargar_expediente: true,
};

describe('normalizarRhExpediente', () => {
  it('acomoda nombre completo, estado e id del archivo vigente', () => {
    const expediente = normalizarRhExpediente(expedienteApi);
    expect(expediente.colaborador.nombre).toBe('Ana López Ruiz');
    expect(expediente.estado).toBe('en_revision');
    expect(expediente.documentos[0]?.id).toBe(31);
    expect(expediente.documentos[0]?.puede_descargar).toBe(true);
    expect(expediente.documentos[1]?.id).toBeNull();
    expect(expediente.puede_descargar_expediente).toBe(true);
  });

  it('una API vieja sin banderas nunca ofrece descargas (fail-closed)', () => {
    const viejo = { ...expedienteApi, puede_descargar_expediente: undefined, documentos: [{ ...expedienteApi.documentos[0], puede_descargar: undefined, puede_pedir_correccion: undefined }] };
    const expediente = normalizarRhExpediente(viejo);
    expect(expediente.puede_descargar_expediente).toBe(false);
    expect(expediente.documentos[0]?.puede_descargar).toBe(false);
    expect(expediente.documentos[0]?.puede_pedir_correccion).toBe(false);
  });
});

describe('normalizarRhDocumento', () => {
  it('usa tipo_documento como nombre y conserva acciones', () => {
    const documento = normalizarRhDocumento({
      id: 31,
      tipo_documento: 'INE',
      estado: 'en_revision',
      colaborador: { id: 7, nombre: 'Ana López Ruiz', numero_empleado: '7788', sucursal: 'Cuernavaca' },
      nombre_original: 'ine.jpg',
      acciones_permitidas: ['ver', 'ver_archivo', 'aprobar'],
      puede_descargar: false,
    });
    expect(documento.nombre).toBe('INE');
    expect(documento.tipo).toBe('INE');
    expect(documento.acciones_permitidas).toContain('ver_archivo');
    expect(documento.puede_descargar).toBe(false);
  });
});
