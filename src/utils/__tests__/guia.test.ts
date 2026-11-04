import { esExpedienteIncompleto } from '@/api/client';
import { normalizeEstadoExpediente, normalizeGuia } from '@/api/normalizers/guia';
import { agruparPasos, estadoExpedienteDe, guiaProtagonista, mensajeSiguiente, rutaDePaso, textoResumenGuia } from '@/utils/guia';
import type { MobileBootstrap } from '@/types/mobileBootstrap';

/** Respuesta real de GET colaborador/guia (GuiaSiguientePasoService). */
const RAW = {
  pasos: [
    {
      clave: 'datos',
      grupo: 'datos',
      titulo: 'Completa tu información',
      descripcion: 'Te faltan 4 datos en 2 secciones',
      estado: 'pendiente',
      estado_etiqueta: 'Pendiente',
      motivo: null,
      detalle: ['Domicilio: Calle, Colonia', 'Fiscal: RFC, Número de seguridad social (NSS)'],
      accion: { etiqueta: 'Completar mis datos', app: 'completar-datos', params: [] },
      bloquea_app: true,
    },
    { clave: 'foto', grupo: 'foto', titulo: 'Fotografía para tu expediente', descripcion: 'Ya tienes tu foto oficial.', estado: 'hecho', estado_etiqueta: 'Listo', motivo: null, detalle: [], accion: null, bloquea_app: false },
    {
      clave: 'documento_7',
      grupo: 'documentos',
      titulo: 'Acta de nacimiento',
      descripcion: 'Recursos Humanos lo rechazó. Súbelo de nuevo.',
      estado: 'rechazado',
      estado_etiqueta: 'Rechazado',
      motivo: 'La imagen está borrosa.',
      detalle: [],
      accion: { etiqueta: 'Corregir documento', app: 'documento', params: { document_type_id: 7 } },
      bloquea_app: true,
    },
    { clave: 'documento_8', grupo: 'documentos', titulo: 'CURP', descripcion: 'Ya lo subiste.', estado: 'en_revision', estado_etiqueta: 'En revisión por RH', motivo: null, detalle: [], accion: null, bloquea_app: false },
    {
      clave: 'induccion_paginas',
      grupo: 'induccion',
      titulo: 'Documento de la inducción',
      descripcion: 'Llevas 29 de 30 páginas.',
      estado: 'pendiente',
      estado_etiqueta: 'Pendiente',
      motivo: null,
      detalle: ['Te falta la página 30.'],
      accion: { etiqueta: 'Ir a la página 30', app: 'induccion-documento', params: { pagina: 30 } },
      bloquea_app: false,
    },
    { clave: 'firma_3', grupo: 'firmas', titulo: 'Firma: Contrato', descripcion: '', estado: 'pendiente', estado_etiqueta: 'Pendiente', motivo: null, detalle: [], accion: { etiqueta: 'Revisar y firmar', app: 'pantalla-del-futuro', params: {} }, bloquea_app: false },
  ],
  siguiente: null as unknown,
  resumen: { total: 6, hechos: 1, en_revision: 1, por_hacer: 4, en_espera: 0, todo_listo: false },
  induccion: { activa: true, estado: 'disponible', porcentaje: 48 },
  bloqueo: {
    aplica: true,
    bloqueado: true,
    mensaje: 'Completa tu expediente para usar esta sección. Te falta: 4 datos personales y 1 documento rechazado por corregir.',
    motivos: [{ clave: 'datos_personales', titulo: 'Te faltan 4 datos en 2 secciones', detalle: ['Domicilio: Calle, Colonia'], conteo: 4 }],
    datos_faltantes: 4,
    documentos_por_subir: 0,
    documentos_rechazados: 1,
  },
};
RAW.siguiente = RAW.pasos[0];

describe('normalizeGuia', () => {
  const guia = normalizeGuia(RAW);

  it('conserva el orden del backend, los estados y el motivo de RH', () => {
    expect(guia.pasos.map((p) => p.clave)).toEqual(['datos', 'foto', 'documento_7', 'documento_8', 'induccion_paginas', 'firma_3']);
    expect(guia.pasos[2]).toMatchObject({ estado: 'rechazado', motivo: 'La imagen está borrosa.', bloqueaApp: true });
    expect(guia.siguiente?.clave).toBe('datos');
    expect(guia.resumen).toEqual({ total: 6, hechos: 1, enRevision: 1, porHacer: 4, enEspera: 0, todoListo: false });
    expect(guia.bloqueo.bloqueado).toBe(true);
  });

  it('una pantalla desconocida (backend más nuevo) no se navega: sin acción', () => {
    expect(guia.pasos[5].accion).toBeNull();
  });

  it('agrupa por sección con conteos', () => {
    const grupos = agruparPasos(guia.pasos);
    expect(grupos.map((g) => g.grupo)).toEqual(['datos', 'foto', 'documentos', 'induccion', 'firmas']);
    expect(grupos.find((g) => g.grupo === 'documentos')).toMatchObject({ hechos: 0, porHacer: 1 });
  });

  it('resumen legible y protagonista mientras haya algo por hacer o la inducción esté en curso', () => {
    expect(textoResumenGuia(guia)).toBe('Te faltan 4 pasos · 1 en revisión por RH');
    expect(guiaProtagonista(guia)).toBe(true);
    expect(guiaProtagonista({ ...guia, resumen: { ...guia.resumen, porHacer: 0 }, induccion: { ...guia.induccion, activa: false } })).toBe(false);
  });
});

describe('rutaDePaso', () => {
  it('lleva a la pantalla EXACTA con sus parámetros', () => {
    expect(rutaDePaso({ etiqueta: 'x', destino: 'documento', params: { document_type_id: 7 } })).toEqual({ pathname: '/expediente/[tipoId]', params: { tipoId: '7' } });
    expect(rutaDePaso({ etiqueta: 'x', destino: 'induccion-documento', params: { pagina: 30 } })).toEqual({ pathname: '/induccion/capitulos', params: { pagina: '30' } });
    expect(rutaDePaso({ etiqueta: 'x', destino: 'foto', params: {} })).toEqual({ pathname: '/(app)/(tabs)/perfil', params: { foto: '1' } });
    expect(rutaDePaso({ etiqueta: 'x', destino: 'completar-datos', params: {} })).toBe('/completar-datos');
    expect(rutaDePaso({ etiqueta: 'x', destino: 'induccion-evaluacion', params: {} })).toBe('/induccion/evaluacion');
  });
});

describe('mensajeSiguiente', () => {
  const guia = normalizeGuia(RAW);

  it('«Listo. Siguiente: …» saltando lo que se acaba de completar', () => {
    expect(mensajeSiguiente(guia, 'datos').mensaje).toBe('Listo. Siguiente: Acta de nacimiento');
    expect(mensajeSiguiente(guia).paso?.clave).toBe('datos');
  });

  it('sin pendientes accionables lo dice claro', () => {
    expect(mensajeSiguiente({ ...guia, pasos: guia.pasos.filter((p) => p.estado !== 'pendiente' && p.estado !== 'rechazado') }).mensaje).toBe(
      'Listo. Ya no tienes pendientes por ahora.',
    );
    expect(mensajeSiguiente(null).paso).toBeNull();
  });
});

describe('bloqueo de expediente', () => {
  it('un backend anterior (sin expediente_incompleto) nunca bloquea', () => {
    expect(estadoExpedienteDe(undefined).bloqueado).toBe(false);
    expect(estadoExpedienteDe({ user: {}, capabilities: {}, features: {}, counts: {} } as unknown as MobileBootstrap).bloqueado).toBe(false);
  });

  it('lee el estado del bootstrap con motivos en lista', () => {
    const estado = estadoExpedienteDe({ expediente_incompleto: RAW.bloqueo } as unknown as MobileBootstrap);
    expect(estado.bloqueado).toBe(true);
    expect(estado.motivos[0]).toEqual({ clave: 'datos_personales', titulo: 'Te faltan 4 datos en 2 secciones', detalle: ['Domicilio: Calle, Colonia'], conteo: 4 });
    expect(estado.documentosRechazados).toBe(1);
  });

  it('documentos en revisión no bloquean (el backend manda bloqueado=false)', () => {
    expect(normalizeEstadoExpediente({ aplica: true, bloqueado: false, motivos: [] }).bloqueado).toBe(false);
  });

  it('reconoce el 423 «expediente_incompleto» del middleware (y nada más)', () => {
    expect(esExpedienteIncompleto({ response: { status: 423, data: { code: 'expediente_incompleto' } } })).toBe(true);
    expect(esExpedienteIncompleto({ response: { status: 423, data: { code: 'presentacion_incompleta' } } })).toBe(false);
    expect(esExpedienteIncompleto({ response: { status: 403, data: { code: 'expediente_incompleto' } } })).toBe(false);
    expect(esExpedienteIncompleto(null)).toBe(false);
  });
});
