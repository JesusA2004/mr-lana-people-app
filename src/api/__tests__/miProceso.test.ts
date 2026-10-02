import { normalizeMiProceso, normalizeResultadoLeccion } from '../normalizers/miProceso';
import { formatoCalificacion, respuestasCompletas, rutaDeDestino } from '@/utils/miProceso';

describe('mi-proceso (fuente única del Inicio)', () => {
  it('toma títulos, textos y destino tal cual los manda el backend', () => {
    const data = normalizeMiProceso({
      pendientes: [
        {
          clave: 'subir_documentos',
          titulo: 'Sube tus documentos',
          descripcion: 'Te faltan 2 documentos por subir o corregir.',
          tipo: 'accion',
          accion: { etiqueta: 'Subir documentos', href: 'https://web/mi-expediente', app: 'expediente' },
          detalle: ['INE', 'CURP'],
        },
        { clave: 'documentos_en_revision', titulo: 'Estamos revisando tus documentos', descripcion: 'RH te avisará.', tipo: 'espera', accion: null, detalle: [] },
      ],
      lecciones: [],
      documentos: { requeridos: 7, aprobados: 5, faltantes: 2 },
      todo_listo: false,
    });

    expect(data.pendientes).toHaveLength(2);
    expect(data.pendientes[0]).toMatchObject({ tipo: 'accion', accion: { etiqueta: 'Subir documentos', destino: 'expediente' }, detalle: ['INE', 'CURP'] });
    expect(data.pendientes[1]).toMatchObject({ tipo: 'espera', accion: null });
    expect(data.documentos).toEqual({ requeridos: 7, aprobados: 5, faltantes: 2 });
  });

  it('un destino desconocido no se navega (botón oculto) y basura no truena', () => {
    const data = normalizeMiProceso({
      pendientes: [{ titulo: 'Algo nuevo', tipo: 'accion', accion: { etiqueta: 'Ir', app: 'pantalla-del-futuro' } }, null, 3, { sin: 'titulo' }],
      lecciones: [{ avance_id: 'x' }, { avance_id: 4, estado: 'raro', calificacion: 'NaN' }],
      documentos: null,
    });

    expect(data.pendientes).toHaveLength(1);
    expect(data.pendientes[0].accion?.destino).toBeNull();
    expect(data.lecciones).toHaveLength(1);
    expect(data.lecciones[0]).toMatchObject({ avanceId: 4, estado: 'bloqueada', calificacion: null, preguntas: [] });
    expect(data.documentos).toBeNull();
    expect(normalizeMiProceso(undefined)).toEqual({ pendientes: [], lecciones: [], documentos: null, todoListo: false });
  });

  it('lecciones: preguntas, mínimo y resultado del intento', () => {
    const data = normalizeMiProceso({
      lecciones: [
        {
          avance_id: 9,
          titulo: 'Inducción institucional',
          estado: 'disponible',
          puede_presentar: true,
          calificacion_minima: 8,
          preguntas: [{ indice: 0, pregunta: '¿Misión?', opciones: ['A', 'B'] }],
        },
      ],
    });
    const leccion = data.lecciones[0];
    expect(leccion.preguntas[0]).toEqual({ indice: 0, pregunta: '¿Misión?', opciones: ['A', 'B'] });
    expect(respuestasCompletas(leccion.preguntas, {})).toBe(false);
    expect(respuestasCompletas(leccion.preguntas, { 0: 1 })).toBe(true);

    const r = normalizeResultadoLeccion({ intento: { numero: 2, calificacion: 7.9, aprobado: false }, proceso: null });
    expect(r).toEqual({ numero: 2, calificacion: 7.9, aprobado: false, proceso: null });
    expect(formatoCalificacion(8)).toBe('8');
    expect(formatoCalificacion(7.9)).toBe('7.9');
    expect(formatoCalificacion(Number.NaN)).toBe('—');
    expect(formatoCalificacion(null)).toBe('—');
  });

  it('cada destino del backend tiene una ruta de la app', () => {
    expect(rutaDeDestino('expediente')).toBe('/(app)/(tabs)/expediente');
    expect(rutaDeDestino('documentos-laborales')).toBe('/documentos-laborales');
    expect(rutaDeDestino('lecciones')).toBe('/lecciones');
  });
});
