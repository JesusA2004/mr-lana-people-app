import {
  normalizeContenidoEvaluacion,
  normalizeEvaluacionInduccion,
  normalizeHeartbeatVideoInduccion,
  normalizeInduccionResumen,
  normalizeMaterialInduccion,
  normalizeMiInduccionAsignada,
  normalizePdfInduccion,
  normalizeSesionVideoInduccion,
} from '@/api/normalizers/induccion';
import { normalizeMiProceso } from '@/api/normalizers/miProceso';
import type { ContenidoEvaluacionInduccion, EvaluacionInduccion, IntentoInduccion } from '@/types/induccion';
import {
  evaluarSaltoVideo,
  mensajeVideoPreparando,
  puedeTerminarInduccion,
  videoRequerido,
  evaluacionCompleta,
  faseInduccion,
  fechaLegible,
  paginasFaltantes,
  preguntasFaltantes,
  resultadoInduccion,
  textoProgreso,
  ultimoIntentoCalificado,
} from '@/utils/induccion';
import { tieneCierrePdf } from '@/utils/induccionCache';

const resumen = normalizeInduccionResumen({
  avance_id: 12,
  titulo: 'Inducción Mr. Lana',
  total_paginas: 30,
  paginas_vistas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  ultima_pagina: 12,
  porcentaje: 40,
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
      induccionContenido: { avance_id: 12, total_paginas: 30, paginas_vistas: [1, 2], porcentaje: 6, completado: false },
      evaluacionInduccion: { id: 3, estado: 'disponible', puede_presentar: true, intentos: [] },
    });

    expect(proceso.induccion?.avanceId).toBe(12);
    expect(proceso.induccion?.porcentaje).toBe(6);
    expect(proceso.induccion?.paginasVistas).toEqual([1, 2]);
    expect(proceso.evaluacionInduccion?.puedePresentar).toBe(true);
  });

  it('"12 de 30 páginas", retoma en la última página y cuenta las que faltan', () => {
    expect(resumen && textoProgreso(resumen)).toBe('12 de 30 páginas');
    expect(resumen?.ultimaPagina).toBe(12);
    expect(paginasFaltantes(resumen, 30)).toBe(18);
    expect(paginasFaltantes(null, 30)).toBe(30);
  });

  it('el PDF oficial se pide por ruta de API (Bearer), nunca por URL absoluta', () => {
    expect(normalizePdfInduccion({ url: 'https://people.mr-lana.com/api/v1/induccion/pdf', titulo: 'Inducción Mr. Lana', total_paginas: 30 })).toEqual({
      path: '/induccion/pdf',
      titulo: 'Inducción Mr. Lana',
      totalPaginas: 30,
      puedeDescargar: false,
    });
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

describe('video de la inducción', () => {
  it('normaliza el material (con y sin los campos aditivos del backend)', () => {
    expect(normalizeMaterialInduccion({ tipo: 'video', audio_url: null, video_disponible: false, video_estado: 'preparando', video_mensaje: 'Se está preparando.' })).toEqual({
      tipo: 'video',
      videoDisponible: false,
      videoEstado: 'preparando',
      videoMensaje: 'Se está preparando.',
    });
    expect(normalizeMaterialInduccion({ tipo: 'video', video_disponible: true })).toEqual({ tipo: 'video', videoDisponible: true, videoEstado: 'listo', videoMensaje: null });
    expect(normalizeMaterialInduccion({ tipo: 'audio', audio_url: 'https://x', video_disponible: false })).toEqual({ tipo: 'audio', videoDisponible: false, videoEstado: null, videoMensaje: null });
    expect(normalizeMaterialInduccion({ tipo: 'otro' }).tipo).toBeNull();
    expect(normalizeMaterialInduccion(null).tipo).toBeNull();
  });

  it('mensaje de «se está procesando»: el del backend o uno por defecto', () => {
    expect(mensajeVideoPreparando({ tipo: 'video', videoDisponible: false, videoEstado: 'preparando', videoMensaje: null })).toBe('El video se está procesando, intenta más tarde.');
    expect(mensajeVideoPreparando({ tipo: 'video', videoDisponible: false, videoEstado: 'preparando', videoMensaje: 'Del servidor.' })).toBe('Del servidor.');
  });

  it('normaliza la sesión (envuelta en data por la API) y rechaza una URL inválida', () => {
    const sesion = normalizeSesionVideoInduccion({
      sesion_id: 5,
      posicion_inicial: 42,
      duracion_total_segundos: 600,
      porcentaje_visto: 7.5,
      segundo_maximo_permitido: 47,
      heartbeat_segundos: 8,
      completada: false,
      url_manifiesto: 'https://people.mr-lana.com/mi-proceso/induccion/video/5/manifiesto/master.m3u8?signature=x',
    });
    expect(sesion).toMatchObject({ posicionInicial: 42, segundoMaximoPermitido: 47, heartbeatSegundos: 8, completada: false });
    expect(normalizeSesionVideoInduccion({ url_manifiesto: 'https://x/m.m3u8', heartbeat_segundos: 0 }).heartbeatSegundos).toBe(3);
    expect(() => normalizeSesionVideoInduccion({ url_manifiesto: null })).toThrow();
  });

  it('heartbeat rechazado regresa a la posición permitida', () => {
    expect(normalizeHeartbeatVideoInduccion({ permitido: false, posicion_permitida: 30, segundo_maximo_permitido: 30, porcentaje_visto: 5, completada: false })).toEqual({
      permitido: false,
      posicionPermitida: 30,
      segundoMaximoPermitido: 30,
      porcentajeVisto: 5,
      completada: false,
    });
  });

  it('miInduccion: lo asignado (solo video = PDF omitido)', () => {
    const asignada = normalizeMiInduccionAsignada({
      presentacion: { incluida: false, completada: false },
      material: { incluido: true, tipo: 'video', completado: false, disponible: true, porcentaje: 40, iniciado: true },
    });
    expect(asignada?.presentacionIncluida).toBe(false);
    expect(asignada?.material).toMatchObject({ incluido: true, tipo: 'video', porcentaje: 40 });
    expect(normalizeMiInduccionAsignada(undefined)).toBeNull();
    expect(videoRequerido(asignada, null)).toBe(true);
    expect(videoRequerido(null, null)).toBe(false);
  });

  it('«Terminé la inducción» solo con hojas (si cuentan) y video completo (si se asignó)', () => {
    const base = { completado: false, paginasFaltantes: 0, presentacionIncluida: true, videoRequerido: true, videoCompletado: true };
    expect(puedeTerminarInduccion(base)).toBe(true);
    expect(puedeTerminarInduccion({ ...base, videoCompletado: false })).toBe(false);
    expect(puedeTerminarInduccion({ ...base, paginasFaltantes: 3 })).toBe(false);
    expect(puedeTerminarInduccion({ ...base, paginasFaltantes: 3, presentacionIncluida: false })).toBe(true);
    expect(puedeTerminarInduccion({ ...base, videoRequerido: false, videoCompletado: false })).toBe(true);
    expect(puedeTerminarInduccion({ ...base, completado: true })).toBe(false);
  });

  it('anti-adelanto: un salto más allá de lo visto regresa; la reproducción normal avanza', () => {
    expect(evaluarSaltoVideo(10, 10.5, 10, 15)).toEqual({ regresarA: null, maximoVisto: 10.5 });
    expect(evaluarSaltoVideo(10, 120, 10, 15)).toEqual({ regresarA: 15, maximoVisto: 10 });
    // Regresar o adelantar dentro de lo ya visto está permitido.
    expect(evaluarSaltoVideo(100, 20, 100, 105).regresarA).toBeNull();
    expect(evaluarSaltoVideo(20, 90, 100, 105).regresarA).toBeNull();
  });

  it('anti-adelanto: un buffering (tiempo quieto y luego sigue) nunca regresa', () => {
    let anterior = 30;
    let maximo = 30;
    for (const t of [30, 30, 30, 30, 30.5, 31, 31.5]) {
      const r = evaluarSaltoVideo(anterior, t, maximo, 35);
      expect(r.regresarA).toBeNull();
      maximo = r.maximoVisto;
      anterior = t;
    }
    expect(maximo).toBe(31.5);
    // Micro-salto del reproductor al salir del stall.
    expect(evaluarSaltoVideo(31.5, 33, 31.5, 31.5).regresarA).toBeNull();
  });

  it('anti-adelanto: timeUpdate espaciado (app en segundo plano) no es adelanto; un salto real sí', () => {
    expect(evaluarSaltoVideo(30, 36, 30, 30, 6)).toEqual({ regresarA: null, maximoVisto: 36 });
    expect(evaluarSaltoVideo(30, 90, 30, 30, 6).regresarA).toBe(30);
  });

  it('anti-adelanto: encadenar saltos pequeños no estira el máximo visto', () => {
    // Salta 3 s (dentro de la tolerancia) y reproduce 0.5 s: el máximo solo sube 0.5.
    expect(evaluarSaltoVideo(30, 33, 30, 30)).toEqual({ regresarA: null, maximoVisto: 30 });
    expect(evaluarSaltoVideo(33, 33.5, 30, 30).maximoVisto).toBe(30.5);
  });

  it('reconoce el cierre %%EOF de un PDF completo', () => {
    const bytes = (texto: string) => Uint8Array.from(texto, (c) => c.charCodeAt(0));
    expect(tieneCierrePdf(bytes('trailer\n<<>>\nstartxref\n123\n%%EOF\n'))).toBe(true);
    expect(tieneCierrePdf(bytes('stream cortado a la mit'))).toBe(false);
  });
});
