import { normalizarEstadoSolicitud, normalizarResumenSolicitud } from '@/api/normalizers/solicitudEmpleo';
import type { CampoSolicitud, ListaSolicitud, SeccionSolicitud } from '@/types/solicitudEmpleo';
import {
  campoVisible,
  contextoDe,
  cuerpoSeccion,
  desdeForma,
  formaInicial,
  indiceParaRetomar,
  mapearErroresSolicitud,
  puedeAgregarFila,
  seccionDesdeMensaje,
  textoSeccion,
  validarSeccion,
  type FormaSeccion,
} from '@/utils/solicitudEmpleoWizard';

function campo(clave: string, extra: Partial<CampoSolicitud> = {}): CampoSolicitud {
  return {
    campo: clave,
    etiqueta: clave,
    tipo: 'texto',
    opciones: [],
    valor: null,
    valor_legible: null,
    sugerencia: null,
    requerido: true,
    requerido_si: null,
    permite_no_aplica: false,
    no_aplica: false,
    bloqueado: false,
    origen: 'solicitud',
    documentos: ['solicitud_empleo'],
    min: null,
    max: null,
    ayuda: null,
    ...extra,
  };
}

function seccion(clave: string, extra: Partial<SeccionSolicitud> = {}): SeccionSolicitud {
  return { clave, titulo: clave, descripcion: '', completa: false, porcentaje: 0, faltantes: [], guardada_en: null, origen: null, campos: [], lista: null, ...extra };
}

const PERSONAL = seccion('personal', {
  titulo: 'Datos personales',
  campos: [
    campo('estado_civil', { bloqueado: true, origen: 'datos_personales', valor: 'soltero' }),
    campo('telefono_alterno', { permite_no_aplica: true, max: 20 }),
    campo('numero_hijos', { tipo: 'entero', min: 0, max: 20 }),
    campo('conyuge_nombre', { requerido: false, requerido_si: { campo: 'estado_civil', operador: 'en', valor: ['casado', 'union_libre'] } }),
    campo('tipo_sanguineo', { tipo: 'select', opciones: [{ value: 'o_positivo', label: 'O+' }, { value: 'desconocido', label: 'No lo sé' }] }),
    campo('padece_enfermedad_cronica', { tipo: 'booleano' }),
    campo('enfermedad_cronica_cual', { requerido: false, requerido_si: { campo: 'padece_enfermedad_cronica', operador: 'igual', valor: true }, valor: 'Asma' }),
    campo('identificacion_tipo', { tipo: 'select', opciones: [{ value: 'ine', label: 'INE' }], sugerencia: 'ine' }),
  ],
});

function lista(extra: Partial<ListaSolicitud> = {}): ListaSolicitud {
  return {
    clave: 'dependientes',
    etiqueta: 'Dependientes económicos',
    singular: 'Dependiente',
    minimo: 0,
    maximo: 6,
    bandera_vacia: 'sin_dependientes',
    etiqueta_vacia: 'No tengo dependientes económicos',
    vacia: false,
    bloqueada: false,
    campos: [
      { campo: 'nombre', etiqueta: 'Nombre(s)', tipo: 'texto', requerido: true, opciones: [], min: null, max: 120 },
      { campo: 'parentesco', etiqueta: 'Parentesco', tipo: 'select', requerido: true, opciones: [{ value: 'hijo', label: 'Hijo(a)' }, { value: 'otro', label: 'Otro' }], min: null, max: null },
      { campo: 'parentesco_otro', etiqueta: 'Otro parentesco (cuál)', tipo: 'texto', requerido: false, opciones: [], min: null, max: 60 },
      { campo: 'fecha_nacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', requerido: false, opciones: [], min: null, max: null },
      { campo: 'edad', etiqueta: 'Edad', tipo: 'entero', requerido: false, opciones: [], min: 0, max: 120 },
    ],
    filas: [],
    ...extra,
  };
}

const DEPENDIENTES = seccion('dependientes', { titulo: 'Familia y dependientes', lista: lista() });

describe('normalizador del contrato', () => {
  const crudo = {
    registro_abierto: true,
    exigida: true,
    secciones: [
      {
        clave: 'personal',
        titulo: 'Datos personales',
        descripcion: '…',
        completa: false,
        porcentaje: 60,
        faltantes: ['Tipo sanguíneo'],
        guardada_en: '2026-11-04T10:00:00-06:00',
        origen: 'app',
        campos: [
          {
            campo: 'tipo_sanguineo',
            etiqueta: 'Tipo sanguíneo',
            tipo: 'select',
            opciones: [{ value: 'o_positivo', label: 'O+' }],
            valor: null,
            sugerencia: null,
            requerido: true,
            requerido_si: null,
            permite_no_aplica: false,
            no_aplica: false,
            bloqueado: false,
            origen: 'solicitud',
            documentos: ['estudio_socioeconomico'],
            min: null,
            max: null,
            ayuda: 'Si no lo sabes, elige «No lo sé».',
          },
          { campo: 'nuevo', tipo: 'firma_digital', requerido_si: { campo: 'x', operador: 'raro' } },
          { etiqueta: 'sin clave' },
        ],
        lista: null,
      },
      {
        clave: 'dependientes',
        campos: [],
        lista: {
          clave: 'dependientes',
          etiqueta: 'Dependientes económicos',
          singular: 'Dependiente',
          minimo: 0,
          maximo: 6,
          bandera_vacia: 'sin_dependientes',
          etiqueta_vacia: 'No tengo dependientes económicos',
          vacia: false,
          bloqueada: false,
          campos: [{ campo: 'nombre', etiqueta: 'Nombre(s)', tipo: 'texto', requerido: true, opciones: [], min: null, max: 120 }],
          filas: [{ nombre: 'Luis', edad: 9 }],
        },
      },
    ],
    completitud: {
      completo: false,
      porcentaje: 42,
      total: 120,
      completos: 50,
      faltantes: [{ seccion: 'personal', campo: 'tipo_sanguineo', etiqueta: 'Tipo sanguíneo', documentos: ['estudio_socioeconomico'], origen: 'solicitud' }],
      secciones: [{ clave: 'personal', titulo: 'Datos personales', completa: false, porcentaje: 60, faltantes: ['Tipo sanguíneo'] }],
      documentos: { solicitud_empleo: { clave: 'solicitud_empleo', nombre: 'Solicitud de Empleo', completo: false, faltantes: [], mensaje: 'Faltan 3 datos…' } },
    },
  };

  test('GET registro/solicitud: secciones, campos, listas y completitud', () => {
    const estado = normalizarEstadoSolicitud(crudo);
    expect(estado.exigida).toBe(true);
    expect(estado.secciones.map((s) => s.clave)).toEqual(['personal', 'dependientes']);
    const [tipo, nuevo] = estado.secciones[0].campos;
    expect(estado.secciones[0].campos).toHaveLength(2); // el campo sin clave se descarta
    expect(tipo.ayuda).toBe('Si no lo sabes, elige «No lo sé».');
    expect(tipo.opciones).toEqual([{ value: 'o_positivo', label: 'O+' }]);
    // Tipo desconocido (backend más nuevo) → texto; condición inválida → sin condición.
    expect(nuevo.tipo).toBe('texto');
    expect(nuevo.requerido_si).toBeNull();
    expect(estado.secciones[1].lista?.filas).toEqual([{ nombre: 'Luis', edad: 9 }]);
    expect(estado.secciones[1].lista?.bandera_vacia).toBe('sin_dependientes');
    expect(estado.completitud.porcentaje).toBe(42);
    expect(estado.completitud.documentos).toEqual([{ clave: 'solicitud_empleo', nombre: 'Solicitud de Empleo', completo: false, mensaje: 'Faltan 3 datos…' }]);
  });

  test('respuesta vacía o rota no truena', () => {
    const estado = normalizarEstadoSolicitud(null);
    expect(estado.secciones).toEqual([]);
    expect(estado.completitud.completo).toBe(false);
    expect(estado.registro_abierto).toBe(true);
  });

  test('bloque solicitud_empleo del registro (lista de documentos) y backend anterior sin bloque', () => {
    const resumen = normalizarResumenSolicitud({
      exigida: true,
      completo: false,
      porcentaje: 42.6,
      secciones: [{ clave: 'personal', titulo: 'Datos personales', completa: false, porcentaje: 60, faltantes: ['Tipo sanguíneo'] }],
      documentos: [{ clave: 'solicitud_empleo', nombre: 'Solicitud de Empleo', completo: false, mensaje: 'Faltan …' }],
      pendientes: ['Datos personales: Tipo sanguíneo', ''],
    });
    expect(resumen?.porcentaje).toBe(43);
    expect(resumen?.pendientes).toEqual(['Datos personales: Tipo sanguíneo']);
    expect(resumen?.documentos[0].clave).toBe('solicitud_empleo');
    expect(normalizarResumenSolicitud(undefined)).toBeNull();
  });
});

describe('sub-asistente: dónde retomar', () => {
  const secciones = [
    { clave: 'personal', completa: true },
    { clave: 'domicilio', completa: true },
    { clave: 'dependientes', completa: false },
    { clave: 'vivienda', completa: false },
  ];

  test('retoma en la primera sección incompleta', () => {
    expect(indiceParaRetomar(secciones)).toBe(2);
  });

  test('una sección pedida gana; con todo completo abre la primera', () => {
    expect(indiceParaRetomar(secciones, 'vivienda')).toBe(3);
    expect(indiceParaRetomar(secciones, 'no_existe')).toBe(2);
    expect(indiceParaRetomar(secciones.map((s) => ({ ...s, completa: true })))).toBe(0);
  });

  test('texto de avance', () => {
    expect(textoSeccion(2, 9)).toBe('Sección 3 de 9');
  });

  test('del 422 de finalizar, la primera sección nombrada', () => {
    const titulos = [
      { clave: 'personal', titulo: 'Datos personales' },
      { clave: 'vivienda', titulo: 'Vivienda' },
    ];
    const mensaje = 'Completa tu solicitud de empleo y estudio socioeconómico. Falta: Vivienda: Número de baños; Datos personales: Tipo sanguíneo.';
    expect(seccionDesdeMensaje(mensaje, titulos)).toBe('vivienda');
    expect(seccionDesdeMensaje('Algo más', titulos)).toBeNull();
  });
});

describe('sub-asistente: prellenado, condiciones y validación', () => {
  test('lo guardado y la sugerencia (marcada para confirmar) son los valores iniciales', () => {
    const forma = formaInicial(PERSONAL);
    expect(forma.valores.identificacion_tipo).toBe('ine');
    expect(forma.sugeridos).toEqual(['identificacion_tipo']);
    expect(forma.valores.padece_enfermedad_cronica).toBeNull();
    expect(forma.valores.numero_hijos).toBe('');
  });

  test('bloquea «continuar» sin los requeridos de la sección', () => {
    const errores = validarSeccion(PERSONAL, formaInicial(PERSONAL));
    expect(Object.keys(errores).sort()).toEqual(['numero_hijos', 'padece_enfermedad_cronica', 'telefono_alterno', 'tipo_sanguineo']);
    expect(errores.tipo_sanguineo).toBe('Elige una opción para continuar.');
  });

  test('«Guardar y salir» solo revisa formato', () => {
    const forma = formaInicial(PERSONAL);
    forma.valores.numero_hijos = '25';
    expect(validarSeccion(PERSONAL, forma, false)).toEqual({ numero_hijos: 'Escribe un número entre 0 y 20.' });
  });

  test('«No aplica» cuenta como respondido', () => {
    const forma: FormaSeccion = { ...formaInicial(PERSONAL), noAplica: ['telefono_alterno'] };
    forma.valores = { ...forma.valores, numero_hijos: '0', tipo_sanguineo: 'desconocido', padece_enfermedad_cronica: false };
    expect(validarSeccion(PERSONAL, forma)).toEqual({});
  });

  test('un condicional solo aparece y se exige cuando aplica', () => {
    const forma = formaInicial(PERSONAL);
    const conyuge = PERSONAL.campos.find((c) => c.campo === 'conyuge_nombre') as CampoSolicitud;
    const cual = PERSONAL.campos.find((c) => c.campo === 'enfermedad_cronica_cual') as CampoSolicitud;
    expect(campoVisible(conyuge, contextoDe(PERSONAL, forma))).toBe(false); // soltero
    forma.valores.padece_enfermedad_cronica = true;
    expect(campoVisible(cual, contextoDe(PERSONAL, forma))).toBe(true);
    forma.valores.enfermedad_cronica_cual = '';
    expect(validarSeccion(PERSONAL, forma).enfermedad_cronica_cual).toBe('Falta este dato.');
  });

  test('lista: «No tengo dependientes» completa la sección; sin renglones ni marca, no', () => {
    const vacia = formaInicial(DEPENDIENTES);
    expect(validarSeccion(DEPENDIENTES, vacia).dependientes).toMatch(/No tengo dependientes económicos/);
    expect(validarSeccion(DEPENDIENTES, { ...vacia, vacia: true })).toEqual({});
    expect(puedeAgregarFila(DEPENDIENTES.lista as ListaSolicitud, { ...vacia, vacia: true })).toBe(false);
  });

  test('lista: renglón con requeridos, «Otro» pide cuál y sin fecha pide edad', () => {
    const forma: FormaSeccion = { ...formaInicial(DEPENDIENTES), filas: [{ nombre: 'Luis', parentesco: 'otro', parentesco_otro: '', fecha_nacimiento: '', edad: '' }] };
    expect(validarSeccion(DEPENDIENTES, forma)).toEqual({
      'dependientes.0.parentesco_otro': 'Falta este dato.',
      'dependientes.0.edad': 'Escribe la edad o su fecha de nacimiento.',
    });
  });

  test('referencias: mínimo 2 renglones', () => {
    const referencias = seccion('referencias', {
      lista: lista({ clave: 'referencias', etiqueta: 'Referencias personales', minimo: 2, maximo: 4, bandera_vacia: null, etiqueta_vacia: null, campos: [{ campo: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, opciones: [], min: null, max: 150 }] }),
    });
    const forma: FormaSeccion = { ...formaInicial(referencias), filas: [{ nombre: 'Rosa Gómez' }] };
    expect(validarSeccion(referencias, forma).referencias).toBe('Captura al menos 2 (referencias personales).');
    expect(validarSeccion(referencias, { ...forma, filas: [{ nombre: 'Rosa Gómez' }, { nombre: 'Juan Pérez' }] })).toEqual({});
  });

  test('empleos: «Es mi primer empleo» y formato de mes', () => {
    const experiencia = seccion('experiencia', {
      lista: lista({
        clave: 'empleos',
        bandera_vacia: 'sin_experiencia_laboral',
        etiqueta_vacia: 'Es mi primer empleo (no tengo experiencia laboral)',
        maximo: 3,
        campos: [
          { campo: 'empresa', etiqueta: 'Empresa', tipo: 'texto', requerido: true, opciones: [], min: null, max: 150 },
          { campo: 'desde', etiqueta: 'Desde', tipo: 'mes', requerido: true, opciones: [], min: null, max: null },
        ],
      }),
    });
    const forma = formaInicial(experiencia);
    expect(validarSeccion(experiencia, { ...forma, vacia: true })).toEqual({});
    expect(validarSeccion(experiencia, { ...forma, filas: [{ empresa: 'Financiera Sol', desde: '2021-13' }] })).toEqual({ 'empleos.0.desde': expect.stringMatching(/AAAA-MM/) });
  });
});

describe('sub-asistente: cuerpo del POST', () => {
  test('convierte tipos, manda la sugerencia confirmada, «No aplica» completa y limpia condicionales que ya no aplican', () => {
    const forma = formaInicial(PERSONAL);
    forma.valores = { ...forma.valores, numero_hijos: '2', tipo_sanguineo: 'o_positivo', padece_enfermedad_cronica: false };
    forma.noAplica = ['telefono_alterno'];
    const cuerpo = cuerpoSeccion(PERSONAL, forma);
    expect(cuerpo.no_aplica).toEqual(['telefono_alterno']);
    expect(cuerpo.datos).toEqual({
      telefono_alterno: null,
      numero_hijos: 2,
      tipo_sanguineo: 'o_positivo',
      padece_enfermedad_cronica: false,
      // Tenía «Asma» guardado y ya no padece: se limpia.
      enfermedad_cronica_cual: null,
      identificacion_tipo: 'ine',
    });
    // Nunca manda lo de «Datos personales» (se captura en su paso).
    expect(cuerpo.datos).not.toHaveProperty('estado_civil');
    expect(cuerpo.datos).not.toHaveProperty('conyuge_nombre');
  });

  test('lista completa (sin renglones vacíos) con su bandera', () => {
    const forma: FormaSeccion = {
      ...formaInicial(DEPENDIENTES),
      filas: [
        { nombre: 'Luis', parentesco: 'hijo', parentesco_otro: 'ignorado', fecha_nacimiento: '', edad: '9' },
        { nombre: '', parentesco: '', parentesco_otro: '', fecha_nacimiento: '', edad: '' },
      ],
    };
    expect(cuerpoSeccion(DEPENDIENTES, forma)).toEqual({
      datos: { dependientes: [{ nombre: 'Luis', parentesco: 'hijo', parentesco_otro: null, fecha_nacimiento: null, edad: 9 }], sin_dependientes: false },
    });
    expect(cuerpoSeccion(DEPENDIENTES, { ...forma, vacia: true, filas: [] }).datos).toEqual({ dependientes: [], sin_dependientes: true });
  });

  test('montos y vacíos', () => {
    expect(desdeForma('moneda', '1,500.50')).toBe(1500.5);
    expect(desdeForma('moneda', '')).toBeNull();
    expect(desdeForma('multiselect', ['agua', 'agua', 'luz'])).toEqual(['agua', 'luz']);
    expect(desdeForma('booleano', null)).toBeNull();
  });
});

describe('errores 422 → campos', () => {
  test('mapea cada clave a su campo y separa lo general', () => {
    const { campos, general } = mapearErroresSolicitud({
      'datos.tipo_sanguineo': ['Elige una opción válida en Tipo sanguíneo.'],
      'datos.dependientes.0.nombre': ['Escribe como máximo 120 caracteres en Dependiente: nombre(s).'],
      dependientes: ['El formato solo tiene espacio para 6 dependientes económicos.'],
    });
    expect(campos).toEqual({
      tipo_sanguineo: 'Elige una opción válida en Tipo sanguíneo.',
      'dependientes.0.nombre': 'Escribe como máximo 120 caracteres en Dependiente: nombre(s).',
      dependientes: 'El formato solo tiene espacio para 6 dependientes económicos.',
    });
    expect(general).toBe('Revisa los campos marcados en rojo.');
  });

  test('registro cerrado o dato de RH: mensaje general del backend', () => {
    expect(mapearErroresSolicitud({ registro: ['Tu registro ya está completo.'] })).toEqual({ campos: {}, general: 'Tu registro ya está completo.' });
    expect(mapearErroresSolicitud({ datos: ['Recursos Humanos ya registró: Tipo sanguíneo.'] }).general).toBe('Recursos Humanos ya registró: Tipo sanguíneo.');
  });
});
