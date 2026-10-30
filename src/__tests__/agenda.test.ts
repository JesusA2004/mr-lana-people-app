import { normalizeAgendaEvento, normalizeAgendaGuardado, normalizeAgendaListado, normalizeAgendaOpciones } from '@/api/normalizers/agenda';
import { existeRuta, rutasDeLaApp } from '@/testing/navegacionInventario';
import { agendaBadge, faltaEnResultado, horaParaApi, nuevaClaveIdempotencia, urlRuta } from '@/utils/agenda';
import { experienceForPush, resolveResourceRoute } from '@/utils/appLinks';

/** Respuesta con la forma de `AgendaConsultaService::aArray()` en capacitaciones. */
const eventoApi = {
  id: 7,
  tipo: 'entrevista',
  tipo_etiqueta: 'Entrevista',
  fecha_hora: '2026-11-02 10:00',
  fecha: '2026-11-02',
  hora: '10:00',
  estado: 'programado',
  estado_etiqueta: 'Programado',
  origen: 'reclutamiento',
  origen_etiqueta: 'Agendada por Reclutamiento',
  agendado_por: 'Ana',
  sucursal: { id: 3, nombre: 'Ixtlahuaca' },
  candidato: { id: 9, nombre: 'Ricardo', puesto: 'Gestor', estado: 'entrevista_pendiente', estado_etiqueta: 'Entrevista', telefono: null, tiene_cv: null },
  domicilio: null,
  notas: 'Viene de campaña',
  puede: { gestionar: false, registrar_resultado: false, ver_datos_candidato: false, reprogramar: true, cancelar: true, capturar: true },
  historial: null,
};

describe('normalizadores de la agenda', () => {
  it('conserva el evento y deja nulos los datos protegidos', () => {
    const evento = normalizeAgendaEvento(eventoApi);
    expect(evento.id).toBe(7);
    expect(evento.sucursal.nombre).toBe('Ixtlahuaca');
    expect(evento.candidato.telefono).toBeNull();
    expect(evento.candidato.tiene_cv).toBeNull();
    expect(evento.domicilio).toBeNull();
    expect(evento.puede.registrar_resultado).toBe(false);
  });

  it('una bandera ausente nunca concede permiso', () => {
    const evento = normalizeAgendaEvento({ ...eventoApi, puede: undefined });
    expect(Object.values(evento.puede).every((p) => p === false)).toBe(true);
  });

  it('agrupa por día y lee meta', () => {
    const lista = normalizeAgendaListado({
      data: { dias: [{ fecha: '2026-11-02', eventos: [eventoApi] }] },
      meta: { motivos_no_viable: [{ value: 'perfil', etiqueta: 'Perfil' }], puede_agendar: true, puede_alta_candidato: false },
    });
    expect(lista.dias[0].eventos[0].candidato.nombre).toBe('Ricardo');
    expect(lista.motivos_no_viable).toEqual([{ value: 'perfil', etiqueta: 'Perfil' }]);
    expect(lista.puede_agendar).toBe(true);
    expect(lista.puede_alta_candidato).toBe(false);
  });

  it('respuesta vacía no truena', () => {
    expect(normalizeAgendaListado({}).dias).toEqual([]);
    expect(normalizeAgendaOpciones({}).sucursales).toEqual([]);
  });

  it('lee empalmes como advertencia y el reintento repetido', () => {
    const guardado = normalizeAgendaGuardado({ data: eventoApi, empalmes: ['Ixtlahuaca ya tiene entrevista a las 10:30.'], repetido: true });
    expect(guardado.empalmes).toHaveLength(1);
    expect(guardado.repetido).toBe(true);
    expect(guardado.evento.id).toBe(7);
  });
});

describe('reglas de captura', () => {
  const entrevista = { tipo: 'entrevista' };
  const socio = { tipo: 'socioeconomico' };

  it('viable no pide más', () => {
    expect(faltaEnResultado(entrevista, { resultado: 'viable', motivo: null, comentario: '', evidencias: 0 })).toBeNull();
  });

  it('no viable exige motivo y comentario', () => {
    expect(faltaEnResultado(entrevista, { resultado: 'no_viable', motivo: null, comentario: 'x', evidencias: 0 })).toBe('Elige el motivo.');
    expect(faltaEnResultado(entrevista, { resultado: 'no_viable', motivo: 'perfil', comentario: '  ', evidencias: 0 })).toBe('Escribe un comentario breve.');
    expect(faltaEnResultado(entrevista, { resultado: 'no_viable', motivo: 'perfil', comentario: 'x', evidencias: 0 })).toBeNull();
  });

  it('socioeconómico exige evidencia y, si no es favorable, comentario', () => {
    expect(faltaEnResultado(socio, { resultado: 'favorable', motivo: null, comentario: '', evidencias: 0 })).toMatch(/Adjunta/);
    expect(faltaEnResultado(socio, { resultado: 'favorable', motivo: null, comentario: '', evidencias: 1 })).toBeNull();
    expect(faltaEnResultado(socio, { resultado: 'no_favorable', motivo: null, comentario: '', evidencias: 1 })).toMatch(/comentario/);
  });

  it('sin resultado elegido no guarda', () => {
    expect(faltaEnResultado(entrevista, { resultado: null, motivo: null, comentario: '', evidencias: 0 })).toBe('Elige el resultado.');
  });
});

describe('utilidades', () => {
  it('la clave cabe en 64 y no se repite', () => {
    const a = nuevaClaveIdempotencia();
    expect(a.length).toBeLessThanOrEqual(64);
    expect(a).not.toBe(nuevaClaveIdempotencia());
  });

  it('la hora va en H:i', () => {
    expect(horaParaApi(new Date(2026, 10, 2, 9, 5))).toBe('09:05');
  });

  it('la ruta escapa el domicilio', () => {
    expect(urlRuta('Calle 1 #2, Tula')).toContain('Calle%201%20%232%2C%20Tula');
  });

  it('cada estado tiene insignia', () => {
    expect(agendaBadge('realizado')).toBe('aprobada');
    expect(agendaBadge('desconocido')).toBe('pendiente');
  });
});

describe('notificaciones y rutas', () => {
  it('un aviso abre la cita sin cambiar de experiencia', () => {
    const data = { type: 'agenda_evento' as const, resource_id: 7, related_type: 'AgendaEvento' };
    const ruta = resolveResourceRoute(data);
    expect(ruta).toBe('/agenda/7');
    expect(experienceForPush(data, ruta)).toBeNull();
  });

  it('sin id cae en la agenda', () => {
    expect(resolveResourceRoute({ type: 'agenda_evento' })).toBe('/agenda');
  });

  it.each(['/agenda', '/agenda/7', '/agenda/nueva'])('%s existe', (ruta) => {
    expect(existeRuta(ruta, rutasDeLaApp())).toBe(true);
  });
});
