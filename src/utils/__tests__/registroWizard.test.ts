import { deserializarBorrador, serializarBorrador, claveBorrador } from '../registroBorrador';
import {
  PASOS_REGISTRO,
  camposDelPaso,
  datosParaEnviar,
  documentosPorSubir,
  documentosSinResolver,
  documentosSinTener,
  edadCumplida,
  excedeMaximoCarta,
  maxCartaRegistro,
  pasoParaReanudar,
  puedeFinalizarRegistro,
  sinTenerVigentes,
  textoDocumentos,
  textoProgreso,
  validarCoherencia,
  validarFormato,
  validarPaso,
  valoresIniciales,
} from '../registroWizard';
import { medidaDestino, nombreJpg } from '../comprimirImagen';

import type { CampoRegistro, EstadoRegistro } from '@/types/registro';

const HOY = new Date(2026, 9, 20);

function campo(clave: string, extra: Partial<CampoRegistro> = {}): CampoRegistro {
  return { campo: clave, etiqueta: clave, tipo: 'text', actual: null, actual_legible: null, obligatorio: true, bloqueado: false, ...extra };
}

const CAMPOS: CampoRegistro[] = [
  campo('genero', { tipo: 'opciones', opciones: [{ value: 'femenino', label: 'Femenino' }, { value: 'masculino', label: 'Masculino' }] }),
  campo('fecha_nacimiento', { tipo: 'date' }),
  campo('curp'),
  campo('rfc'),
  campo('nss', { tipo: 'number' }),
  campo('telefono', { tipo: 'tel', actual: '7771112233', actual_legible: '7771112233', bloqueado: true }),
  campo('domicilio_calle'),
  campo('domicilio_numero_exterior'),
  campo('domicilio_numero_interior', { obligatorio: false }),
  campo('domicilio_colonia'),
  campo('domicilio_cp', { tipo: 'number' }),
  campo('domicilio_municipio'),
  campo('domicilio_estado', { tipo: 'opciones' }),
  campo('contacto_emergencia_nombre'),
  campo('contacto_emergencia_telefono', { tipo: 'tel' }),
  campo('campo_nuevo_del_backend'),
  campo('condicion_medica', { obligatorio: false }),
];

function estado(parcial: Partial<EstadoRegistro> = {}): EstadoRegistro {
  return {
    aplica: true,
    registro_completo: false,
    datos: { completo: false, faltan: [], campos: CAMPOS },
    datos_medicos: { capturados: false },
    documentos: { completo: false, progreso: { total: 1, aprobados: 0, pendientes: 1, en_revision: 0, rechazados: 0, porcentaje: 0 }, lista: [] },
    puede_finalizar: false,
    pendientes: [],
    ...parcial,
  };
}

describe('registroWizard: pasos', () => {
  test('seis pasos en orden y texto de progreso', () => {
    expect(PASOS_REGISTRO.map((p) => p.clave)).toEqual(['personales', 'domicilio', 'emergencia', 'medicos', 'documentos', 'revision']);
    expect(textoProgreso(1)).toBe('Paso 2 de 6');
  });

  test('cada paso toma sus campos; lo desconocido cae en personales y lo médico en ninguno', () => {
    expect(camposDelPaso('personales', CAMPOS).map((c) => c.campo)).toEqual(['genero', 'fecha_nacimiento', 'curp', 'rfc', 'nss', 'telefono', 'campo_nuevo_del_backend']);
    expect(camposDelPaso('domicilio', CAMPOS)).toHaveLength(7);
    expect(camposDelPaso('emergencia', CAMPOS).map((c) => c.campo)).toEqual(['contacto_emergencia_nombre', 'contacto_emergencia_telefono']);
  });
});

describe('registroWizard: validaciones', () => {
  test('formatos con mensajes claros', () => {
    expect(validarFormato('curp', 'TOAA950412MMSRRN09')).toBeNull();
    expect(validarFormato('curp', 'ABC')).toMatch(/18 caracteres/);
    expect(validarFormato('rfc', 'TOAA950412AB1')).toBeNull();
    expect(validarFormato('rfc', 'TOAA9504')).toMatch(/13 caracteres/);
    expect(validarFormato('nss', '1234567890')).toMatch(/11 números/);
    expect(validarFormato('telefono', '777 123 4567')).toMatch(/10 dígitos/);
    expect(validarFormato('correo_personal', 'ana@')).toMatch(/correo válido/);
    expect(validarFormato('clave_elector', 'TRANAN95041217M100')).toBeNull();
    expect(validarFormato('fecha_nacimiento', '2015-01-01', HOY)).toMatch(/15 años/);
    expect(validarFormato('fecha_nacimiento', '1995-04-12', HOY)).toBeNull();
    expect(validarFormato('curp', '')).toBeNull();
  });

  test('edad cumplida respeta el día', () => {
    expect(edadCumplida('2000-10-21', HOY)).toBe(25);
    expect(edadCumplida('2000-10-20', HOY)).toBe(26);
    expect(edadCumplida('no-fecha', HOY)).toBeNull();
  });

  test('coherencia: fecha de CURP/RFC y letra de sexo', () => {
    expect(validarCoherencia({ fecha_nacimiento: '1995-04-12', curp: 'TOAA950412MMSRRN09', rfc: 'TOAA950412AB1', genero: 'femenino' })).toEqual({});
    const errores = validarCoherencia({ fecha_nacimiento: '1996-04-12', curp: 'TOAA950412MMSRRN09', rfc: 'TOAA950412AB1', genero: 'femenino' });
    expect(errores.curp).toMatch(/fecha/);
    expect(errores.rfc).toMatch(/fecha/);
    expect(validarCoherencia({ fecha_nacimiento: '1995-04-12', curp: 'TOAA950412MMSRRN09', genero: 'masculino' }).curp).toMatch(/sexo/);
  });

  test('validarPaso exige obligatorios editables y omite los bloqueados por RH', () => {
    const errores = validarPaso('personales', CAMPOS, {}, HOY);
    expect(Object.keys(errores)).toEqual(expect.arrayContaining(['genero', 'fecha_nacimiento', 'curp', 'rfc', 'nss']));
    expect(errores.telefono).toBeUndefined();
    expect(errores.genero).toBe('Elige una opción para continuar.');
    expect(errores.curp).toBe('Falta este dato.');
  });

  test('domicilio: C.P. de 5 dígitos y número interior opcional', () => {
    const errores = validarPaso(
      'domicilio',
      CAMPOS,
      { domicilio_calle: 'Morelos', domicilio_numero_exterior: '12', domicilio_colonia: 'Centro', domicilio_cp: '620', domicilio_municipio: 'Cuernavaca', domicilio_estado: 'Morelos' },
      HOY,
    );
    expect(errores.domicilio_cp).toBeDefined();
    expect(errores.domicilio_numero_interior).toBeUndefined();
  });
});

describe('registroWizard: envío y reanudación', () => {
  test('solo manda lo editable que cambió, normalizado', () => {
    const campos = CAMPOS.map((c) => (c.campo === 'rfc' ? { ...c, actual: 'TOAA950412AB1' } : c));
    const datos = datosParaEnviar('personales', campos, { curp: ' toaa950412mmsrrn09 ', rfc: 'TOAA950412AB1', telefono: '5550000000', nss: '' });
    expect(datos).toEqual({ curp: 'TOAA950412MMSRRN09' });
  });

  test('valores iniciales: lo guardado + borrador local (nunca sobre lo bloqueado)', () => {
    const campos = CAMPOS.map((c) => (c.campo === 'curp' ? { ...c, actual: 'TOAA950412MMSRRN09' } : c));
    const valores = valoresIniciales(campos, { rfc: 'TOAA950412AB1', telefono: '0000000000' });
    expect(valores.curp).toBe('TOAA950412MMSRRN09');
    expect(valores.rfc).toBe('TOAA950412AB1');
    expect(valores.telefono).toBe('7771112233');
  });

  test('reanuda en el primer paso con faltantes, luego documentos, luego revisión', () => {
    expect(pasoParaReanudar(estado({ datos: { completo: false, faltan: [{ campo: 'domicilio_cp', etiqueta: 'C.P.' }], campos: CAMPOS } }))).toBe(1);
    expect(pasoParaReanudar(estado({ datos: { completo: true, faltan: [], campos: CAMPOS } }))).toBe(4);
    expect(pasoParaReanudar(estado({ datos: { completo: true, faltan: [], campos: CAMPOS }, documentos: { ...estado().documentos, completo: true } }))).toBe(5);
    // Un paso local anterior gana (la persona regresó a revisar).
    expect(pasoParaReanudar(estado({ datos: { completo: true, faltan: [], campos: CAMPOS } }), 'medicos')).toBe(3);
  });

  test('documentos por subir: obligatorios sin archivo o rechazados', () => {
    const base = { tipo: 'x', obligatorio: true, puede_subir: true, puede_reemplazar: false, puede_solicitar_cambio: false };
    const e = estado({
      documentos: {
        ...estado().documentos,
        lista: [
          { ...base, id: 1, nombre: 'INE', estado: 'pendiente' },
          { ...base, id: 2, nombre: 'CURP', estado: 'en_revision' },
          { ...base, id: 3, nombre: 'Comprobante', estado: 'rechazado' },
        ],
      },
    });
    expect(documentosPorSubir(e).map((d) => d.nombre)).toEqual(['INE', 'Comprobante']);
  });
});

describe('registroWizard: «No tengo este documento» y carta compromiso', () => {
  const base = { tipo: 'x', obligatorio: true, puede_subir: true, puede_reemplazar: false, puede_solicitar_cambio: false };
  const conDocs = (parcial: Partial<EstadoRegistro> = {}) =>
    estado({
      datos: { completo: true, faltan: [], campos: CAMPOS },
      documentos: {
        ...estado().documentos,
        lista: [
          { ...base, id: 1, nombre: 'INE', estado: 'pendiente' },
          { ...base, id: 2, nombre: 'CURP', estado: 'en_revision' },
          { ...base, id: 3, nombre: 'Comprobante', estado: 'pendiente' },
        ],
      },
      ...parcial,
    });

  test('solo valen las marcas de documentos que siguen faltando', () => {
    expect(sinTenerVigentes(conDocs(), [3, 2, 99, 1])).toEqual([1, 3]);
    expect(documentosSinTener(conDocs(), [3]).map((d) => d.nombre)).toEqual(['Comprobante']);
    expect(documentosSinResolver(conDocs(), [3]).map((d) => d.nombre)).toEqual(['INE']);
  });

  test('puede terminar con carta solo si todo lo que falta está marcado y los datos están completos', () => {
    expect(puedeFinalizarRegistro(conDocs(), [3])).toBe(false);
    expect(puedeFinalizarRegistro(conDocs(), [1, 3])).toBe(true);
    expect(puedeFinalizarRegistro(conDocs({ datos: { completo: false, faltan: [{ campo: 'curp', etiqueta: 'CURP' }], campos: CAMPOS } }), [1, 3])).toBe(false);
    expect(puedeFinalizarRegistro(conDocs({ puede_finalizar: true }), [])).toBe(true);
  });

  test('más «No tengo» que el máximo de una carta: puede terminar, pero sin carta', () => {
    const cuatro = conDocs({
      documentos: {
        ...conDocs().documentos,
        lista: [...conDocs().documentos.lista, { ...base, id: 4, nombre: 'Acta', estado: 'pendiente' }],
      },
    });
    expect(maxCartaRegistro(cuatro)).toBe(2);
    expect(excedeMaximoCarta(cuatro, [1, 3])).toBe(false);
    expect(excedeMaximoCarta(cuatro, [1, 3, 4])).toBe(true);
    expect(puedeFinalizarRegistro(cuatro, [1, 3, 4])).toBe(true);
    // Las marcas de documentos ya subidos no cuentan.
    expect(excedeMaximoCarta(cuatro, [1, 2, 3])).toBe(false);
    expect(excedeMaximoCarta({ ...cuatro, max_documentos_carta: 3 }, [1, 3, 4])).toBe(false);
  });

  test('con todo marcado reanuda en revisión, no en documentos', () => {
    expect(pasoParaReanudar(conDocs(), null, [1])).toBe(4);
    expect(pasoParaReanudar(conDocs(), null, [1, 3])).toBe(5);
  });

  test('texto de documentos en singular y plural', () => {
    expect(textoDocumentos(1)).toBe('1 documento');
    expect(textoDocumentos(3)).toBe('3 documentos');
  });
});

describe('borrador local y compresión', () => {
  test('el borrador se serializa sin vacíos y se recupera; basura → vacío', () => {
    const texto = serializarBorrador({ paso: 'domicilio', valores: { curp: 'X', rfc: '  ' }, sinTener: [] });
    expect(deserializarBorrador(texto)).toEqual({ paso: 'domicilio', valores: { curp: 'X' }, sinTener: [] });
    expect(deserializarBorrador('{no json')).toEqual({ paso: null, valores: {}, sinTener: [] });
    expect(deserializarBorrador(JSON.stringify({ paso: 'hackeo', valores: { a: 1 } }))).toEqual({ paso: null, valores: {}, sinTener: [] });
    expect(claveBorrador('12/a b')).toBe('registro_borrador_12_a_b');
  });

  test('las marcas «No tengo» se guardan como ids válidos sin repetir', () => {
    const texto = serializarBorrador({ paso: 'documentos', valores: {}, sinTener: [3, 3, 7] });
    expect(deserializarBorrador(texto).sinTener).toEqual([3, 7]);
    expect(deserializarBorrador(JSON.stringify({ paso: 'documentos', valores: {}, sinTener: ['3', -1, 2.5, 9] })).sinTener).toEqual([9]);
    // Borrador de una versión anterior (sin la clave): vacío.
    expect(deserializarBorrador(JSON.stringify({ paso: 'documentos', valores: {} })).sinTener).toEqual([]);
  });

  test('medida destino y nombre de la foto comprimida', () => {
    expect(medidaDestino(4000, 3000)).toEqual({ width: 2000 });
    expect(medidaDestino(3000, 4000)).toEqual({ height: 2000 });
    expect(medidaDestino(1200, 900)).toBeNull();
    expect(nombreJpg('IMG_001.HEIC')).toBe('IMG_001.jpg');
    expect(nombreJpg('.png')).toBe('foto.jpg');
  });
});
