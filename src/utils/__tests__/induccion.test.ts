import { normalizeContenidoEvaluacion, normalizeEvaluacionInduccion, normalizeInduccionResumen } from '@/api/normalizers/induccion';
import { normalizeMiProceso } from '@/api/normalizers/miProceso';
import type { CapituloInduccion, ContenidoEvaluacionInduccion, EvaluacionInduccion, IntentoInduccion } from '@/types/induccion';
import {
  evaluacionCompleta,
  faseInduccion,
  fechaLegible,
  indiceParaRetomar,
  preguntasFaltantes,
  resultadoInduccion,
  textoProgreso,
  ultimoIntentoCalificado,
} from '@/utils/induccion';

const resumen = normalizeInduccionResumen({
  avance_id: 12,
  titulo: 'Inducción Mr. Lana',
  total_capitulos: 7,
  capitulos_vistos: 6,
  porcentaje: 86,
  ultima_capitulo: 'modelo_negocio',
  completado: false,
});

function evaluacion(parcial: Partial<EvaluacionInduccion>): EvaluacionInduccion {
  return {
    id: 3,
    estado: 'disponible',
    estadoEtiqueta: '',
    intentosCount: 0,
    mejorCalificacion: null,
    fechaLimiteReevaluacion: null,
    retroalimentacion: null,
    puedePresentar: false,
    intentos: [],
    ...parcial,
  };
}

function intento(calificacion: number, nivel: string, aprobado: boolean): IntentoInduccion {
  return { id: 1, numero: 1, presentadoEn: null, pendienteCalificacionRh: false, calificacionTotal: calificacion, nivel, nivelEtiqueta: null, aprobado };
}

describe('inducción: carga y progreso (datos del servidor)', () => {
  it('mi-proceso trae el resumen de inducción y la evaluación', () => {
    const proceso = normalizeMiProceso({
      pendientes: [],
      lecciones: [],
      todo_listo: false,
      induccionContenido: { avance_id: 12, total_capitulos: 7, capitulos_vistos: 6, porcentaje: 86, completado: false },
      evaluacionInduccion: { id: 3, estado: 'disponible', puede_presentar: true, intentos: [] },
    });

    expect(proceso.induccion?.avanceId).toBe(12);
    expect(proceso.induccion?.porcentaje).toBe(86);
    expect(proceso.evaluacionInduccion?.puedePresentar).toBe(true);
  });

  it('"6 de 7 capítulos" y retoma en el último capítulo registrado', () => {
    expect(resumen && textoProgreso(resumen)).toBe('6 de 7 capítulos');
    const capitulos = ['quienes_somos', 'mision', 'cultura', 'organigrama', 'reglamento', 'modelo_negocio', 'factor_humano'].map(
      (clave, i): CapituloInduccion => ({ clave, numero: i + 1, titulo: clave, subtitulo: null, bloques: [] }),
    );
    expect(indiceParaRetomar(capitulos, 'modelo_negocio')).toBe(5);
    expect(indiceParaRetomar(capitulos, null)).toBe(0);
    expect(indiceParaRetomar(capitulos, 'capitulo_inexistente')).toBe(0);
  });
});

describe('inducción: estados de la evaluación (los decide el backend)', () => {
  it('sin evaluación habilitada solo hay contenido', () => {
    expect(faseInduccion(resumen, null)).toBe('contenido');
    expect(faseInduccion(null, null)).toBe('sin_induccion');
  });

  it('evaluación disponible solo si el backend dice puede_presentar', () => {
    expect(faseInduccion(resumen, evaluacion({ estado: 'disponible', puedePresentar: true }))).toBe('evaluacion_disponible');
    expect(faseInduccion(resumen, evaluacion({ estado: 'disponible', puedePresentar: false }))).toBe('contenido');
  });

  it('reforzamiento: no se permite reintentar antes de que el backend lo habilite', () => {
    expect(faseInduccion(resumen, evaluacion({ estado: 'requiere_reforzamiento' }))).toBe('reforzamiento');
    expect(faseInduccion(resumen, evaluacion({ estado: 'reevaluacion_habilitada', puedePresentar: false }))).toBe('reforzamiento');
    expect(faseInduccion(resumen, evaluacion({ estado: 'reevaluacion_habilitada', puedePresentar: true }))).toBe('reevaluacion_disponible');
  });

  it('pendiente de RH y aprobada', () => {
    expect(faseInduccion(resumen, evaluacion({ estado: 'pendiente_calificacion_rh' }))).toBe('pendiente_rh');
    expect(faseInduccion(resumen, evaluacion({ estado: 'aprobada' }))).toBe('aprobada');
  });
});

describe('inducción: resultado', () => {
  it('28/30 → 93 % · Comprensión sobresaliente', () => {
    expect(resultadoInduccion(intento(28, 'sobresaliente', true))).toMatchObject({ puntos: '28 / 30', porcentaje: '93 %', etiqueta: 'Comprensión sobresaliente', mensaje: null });
  });

  it('25/30 → 83 % · Aprobado', () => {
    expect(resultadoInduccion(intento(25, 'aprobado', true))).toMatchObject({ puntos: '25 / 30', porcentaje: '83 %', etiqueta: 'Aprobado' });
  });

  it('22/30 → 73 % · Requiere reforzamiento, con el mensaje de apoyo de RH', () => {
    expect(resultadoInduccion(intento(22, 'requiere_reforzamiento', false))).toEqual({
      puntos: '22 / 30',
      porcentaje: '73 %',
      etiqueta: 'Requiere reforzamiento',
      tono: 'warning',
      mensaje: 'Recursos Humanos te apoyará a reforzar algunos temas.',
    });
  });

  it('un intento pendiente de RH no cuenta como resultado', () => {
    const pendiente = { ...intento(20, 'requiere_reforzamiento', false), pendienteCalificacionRh: true, calificacionTotal: null };
    expect(ultimoIntentoCalificado(evaluacion({ intentos: [pendiente] }))).toBeNull();
    expect(ultimoIntentoCalificado(evaluacion({ intentos: [intento(22, 'requiere_reforzamiento', false), { ...intento(26, 'aprobado', true), id: 2 }] }))?.id).toBe(2);
  });

  it('fecha límite legible sin desfase de zona horaria', () => {
    expect(fechaLegible('2026-10-15')).toBe('15 de octubre de 2026');
    expect(fechaLegible(null)).toBeNull();
  });
});

describe('inducción: la clave de respuestas nunca existe en la app', () => {
  const crudo = {
    version: 'FO-RH-EI-2026-v1',
    instrucciones: { total_puntos: 30, calificacion_aprobatoria: 24 },
    // Aunque un backend defectuoso mandara la clave, el normalizador la descarta.
    seccion_a: [{ indice: 0, pregunta: '¿Dónde nace Mr. Lana?', opciones: ['Puebla', 'Morelos'], correcta: 1 }],
    seccion_b: [{ indice: 0, afirmacion: 'El gafete es obligatorio.', correcto: true }],
    seccion_c: { conceptos: [{ indice: 0, concepto: 'Innovación', letra_correcta: 'C' }], descripciones: { A: 'Integridad', C: 'Tecnología' } },
    seccion_d: [{ clave: 'caso_26', puntos_max: 3, enunciado: 'Caso', rubrica: [{ clave: 'x', criterio: 'secreto' }] }],
    seccion_e: { aspectos: [{ clave: 'claridad', texto: 'Clara' }], escala_min: 1, escala_max: 5 },
  };

  it('el contenido normalizado no contiene correcta/correcto/letra_correcta/rubrica', () => {
    const contenido = normalizeContenidoEvaluacion(crudo);
    const json = JSON.stringify(contenido);
    for (const prohibido of ['correcta', 'correcto', 'letra_correcta', 'rubrica', 'criterio', 'secreto']) {
      expect(json).not.toContain(prohibido);
    }
    expect(contenido.seccionC.descripciones).toEqual([
      { letra: 'A', texto: 'Integridad' },
      { letra: 'C', texto: 'Tecnología' },
    ]);
  });

  it('la evaluación de RH (casos_practicos) tampoco se modela del lado del colaborador', () => {
    const ev = normalizeEvaluacionInduccion({ id: 1, estado: 'aprobada', casos_practicos: [{ rubrica: [] }], intentos: [] });
    expect(JSON.stringify(ev)).not.toContain('rubrica');
  });

  it('solo se envía con A, B, C y D completas (E es opcional)', () => {
    const contenido: ContenidoEvaluacionInduccion = normalizeContenidoEvaluacion(crudo);
    const vacia = { a: {}, b: {}, c: {}, d: {} };
    expect(evaluacionCompleta(contenido, vacia)).toBe(false);
    expect(preguntasFaltantes(contenido, vacia)).toBe(4);

    const llena = { a: { 0: 1 }, b: { 0: true }, c: { 0: 'C' }, d: { caso_26: 'Lo reporto a RH.' } };
    expect(evaluacionCompleta(contenido, llena)).toBe(true);
    expect(evaluacionCompleta(contenido, { ...llena, d: { caso_26: '   ' } })).toBe(false);
  });
});
