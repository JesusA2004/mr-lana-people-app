import { errorMotorDeError, faltantesDeError, normalizarSeccion, rhDocumentosProcesoApi } from '../rh/documentosProceso';

/**
 * Contrato con DocumentoProcesoService (backend): la app solo pinta lo que
 * manda el backend — línea de tiempo, SIGUIENTE acción, formato oficial que
 * se usará — y traduce los 422 esperables del motor documental a avisos
 * legibles (nunca JSON crudo). Nunca decide por puesto ni por rol.
 */

jest.mock('../client', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

const seccionBackend = {
  proceso: 'alta',
  titulo: 'Documentos de contratación',
  descripcion: 'Paquete para Gestor · Capacitación inicial.',
  registro: { tipo: 'contrato', id: 7 },
  bloqueo: null,
  expediente_completo: true,
  acciones: [],
  documentos: [
    {
      clave: 'contrato_capacitacion',
      nombre: 'Contrato de capacitación inicial — Gestores',
      motivo: 'Contrato principal.',
      estado: 'impreso',
      estado_etiqueta: 'Firma pendiente',
      bloqueo: null,
      formato_faltante: null,
      master: { id: 3, version: 2, etiqueta: 'Gestor v2', diseno_validado: true },
      requiere: { huella: true, testigos: false },
      documento: { id: 41, generado_en: '2026-10-04T10:00:00-06:00', generado_por: 'RH Admin', firmado: false, escaneado: false, archivado: false, tiene_word: true, revision_de_id: null, motivo_revision: null },
      linea_tiempo: [
        { clave: 'generado', etiqueta: 'Generado', estado: 'hecho' },
        { clave: 'impreso', etiqueta: 'Impreso', estado: 'hecho' },
        { clave: 'firmado', etiqueta: 'Firma', estado: 'actual' },
        { clave: 'escaneado', etiqueta: 'Escaneo', estado: 'pendiente' },
      ],
      siguiente_accion: { clave: 'registrar_firma', etiqueta: 'Registrar firma y huella', tipo: 'primaria' },
      historial: [{ id: 30, estado_etiqueta: 'Cancelado', version_plantilla: 1, generado_en: '2026-10-01T10:00:00-06:00', motivo_cancelacion: 'Regenerado' }],
      acciones: [
        { clave: 'registrar_firma', etiqueta: 'Registrar firma y huella', tipo: 'primaria' },
        { clave: 'descargar', etiqueta: 'Ver PDF', tipo: 'secundaria' },
        { clave: 'descargar_word', etiqueta: 'Descargar Word', tipo: 'secundaria' },
      ],
    },
  ],
};

const error422 = (data: object) => Object.assign(new Error('Unprocessable'), { isAxiosError: true, response: { status: 422, data } });

describe('Documentos del proceso (contrato con el backend)', () => {
  it('normaliza línea de tiempo, siguiente acción, formato ("Gestor v2"), Word e historial', () => {
    const seccion = normalizarSeccion(seccionBackend);
    const item = seccion.documentos[0];

    expect(item.masterEtiqueta).toBe('Gestor v2');
    expect(item.siguienteAccion?.clave).toBe('registrar_firma');
    expect(item.lineaTiempo.map((p) => p.estado)).toEqual(['hecho', 'hecho', 'actual', 'pendiente']);
    expect(item.tieneWord).toBe(true);
    expect(item.generadoPor).toBe('RH Admin');
    expect(item.historial[0]).toMatchObject({ id: 30, versionPlantilla: 1, motivoCancelacion: 'Regenerado' });
    expect(item.acciones.filter((a) => a.tipo === 'primaria')).toHaveLength(1);
  });

  it('un paso con estado desconocido se trata como pendiente (nunca rompe la pantalla)', () => {
    const seccion = normalizarSeccion({ ...seccionBackend, documentos: [{ ...seccionBackend.documentos[0], linea_tiempo: [{ clave: 'x', etiqueta: 'X', estado: 'raro' }] }] });

    expect(seccion.documentos[0].lineaTiempo[0].estado).toBe('pendiente');
  });

  it('DATOS_FALTANTES trae el control adecuado (selector, fecha) y si el dato es de la ficha o del documento', () => {
    const faltan = faltantesDeError(
      error422({
        code: 'DATOS_FALTANTES',
        message: 'Faltan 2 dato(s)',
        faltantes: [
          { campo: 'estado_civil', fuente: 'colaborador', columna: 'estado_civil', etiqueta: 'Estado civil', tipo: 'estado_civil', editable: true, persistencia: 'colaborador', control: 'select', opciones: [{ value: 'soltero', label: 'Soltero' }] },
          { campo: 'hora_acta', fuente: 'manual', columna: 'hora_acta', etiqueta: 'Hora del acta', tipo: 'hora', editable: true, persistencia: 'documento', control: 'hora', opciones: [] },
        ],
      }),
    );

    expect(faltan?.faltantes[0]).toMatchObject({ control: 'select', persistencia: 'colaborador' });
    expect(faltan?.faltantes[0].opciones[0]).toEqual({ value: 'soltero', label: 'Soltero' });
    expect(faltan?.faltantes[1]).toMatchObject({ control: 'hora', persistencia: 'documento' });
  });

  it('traduce los 422 del motor documental a avisos legibles', () => {
    expect(errorMotorDeError(error422({ code: 'DOCUMENT_CONVERTER_UNAVAILABLE', message: 'x', detalle: {} }))?.titulo).toBe('Motor de conversión no disponible');
    expect(errorMotorDeError(error422({ code: 'DOCUMENT_VISUAL_VALIDATION_FAILED', message: 'x', detalle: { razon: 'Falta correr la prueba de diseño' } }))?.detalles).toEqual(['Falta correr la prueba de diseño']);
    expect(
      errorMotorDeError(error422({ code: 'DOCUMENT_FIELD_OVERFLOW', message: 'No cabe', detalle: { campos: [{ etiqueta: 'Domicilio', razon: 'No cabe en 2 renglones' }] } }))?.detalles,
    ).toEqual(['Domicilio: No cabe en 2 renglones']);
    expect(errorMotorDeError(error422({ code: 'DATOS_FALTANTES' }))).toBeNull();
    expect(errorMotorDeError(new Error('red'))).toBeNull();
  });

  it('el Word del documento se pide al endpoint autorizado del backend', () => {
    expect(rhDocumentosProcesoApi.wordPath(41)).toBe('/rh/documentos-proceso/documento/41/word');
  });
});
