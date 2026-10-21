import { TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { FormularioRespuestaCorreccion } from '@/components/FormularioRespuestaCorreccion';
import { Pill } from '@/components/ui';
import { CorreccionResumen } from '@/components/CorreccionResumen';
import {
  camposEditables,
  construirRespuesta,
  destinoCorreccion,
  erroresRespuesta,
  estadoCorreccionVisual,
  normalizeCorrecciones,
  normalizeDatosPropuestos,
  pasosCorreccion,
  solicitudIdDeCorreccion,
  validarRespuesta,
} from '@/utils/correcciones';

// Reanimated/Worklets no inicializan en jest: su mock oficial (los componentes se renderizan de verdad).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock oficial se carga con require dentro de jest.mock.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock("react-native-reanimated", () => ({ ...require("react-native-reanimated/mock"), useReducedMotion: () => false }));

/** Ejemplo literal de `GET /api/v1/correcciones` (docs/SOLICITUDES_UNIFICADAS.md). */
const RESPUESTA = {
  data: [
    {
      id: 'solicitud-12',
      origen: 'solicitud',
      recurso_id: 12,
      folio: 'SOL-000012',
      tipo: 'actualizacion_datos',
      titulo: 'Solicitar cambio de información',
      estado: 'requiere_informacion',
      estado_etiqueta: 'Requiere información',
      estado_descripcion: 'Recursos Humanos necesita más información: respóndele para que siga su revisión.',
      comentario_rh: 'La CURP no coincide con tu acta.',
      requiere_accion: true,
      puede_responder: true,
      campos: ['CURP'],
      resuelta_por: null,
      resuelta_en: null,
      historial: [{ accion: 'enviada', etiqueta: 'Enviada a Recursos Humanos', por: 'Juan Pérez', es_rh: false, comentario: null, origen: 'app', origen_etiqueta: 'App móvil', en: '2026-10-20T10:00:00-06:00' }],
    },
    { id: 'documento-5', origen: 'documento', recurso_id: 5, titulo: 'INE', estado: 'rechazada', estado_etiqueta: 'Rechazada', requiere_accion: true, puede_responder: false, campos: [] },
  ],
  meta: { conteo: { requieren_accion: 2, en_proceso: 0, abiertas: 2 } },
};

const DATOS = normalizeDatosPropuestos([
  { campo: 'curp', etiqueta: 'CURP', actual: null, propuesto: 'PEXJ900101HDFRRN09' },
  { campo: 'genero', etiqueta: 'Género', actual: 'Masculino', propuesto: 'Femenino' },
  { campo: 'domicilio_calle', etiqueta: 'Calle', actual: null, propuesto: 'Reforma' },
  { campo: 'alergias', etiqueta: 'Alergias', actual: null, propuesto: 'Dato confidencial' },
  { campo: 'telefono', etiqueta: 'Teléfono', actual: null, propuesto: '5512345678' },
]);

function render(element: React.ReactElement): ReactTestRenderer {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = renderer.create(element);
  });
  return arbol;
}

describe('estados de corrección', () => {
  it('normaliza la lista y el conteo del backend', () => {
    const r = normalizeCorrecciones(RESPUESTA);
    expect(r.conteo).toEqual({ requieren_accion: 2, en_proceso: 0, abiertas: 2 });
    expect(r.data[0]).toMatchObject({ id: 'solicitud-12', puede_responder: true, comentario_rh: 'La CURP no coincide con tu acta.' });
    expect(r.data[0]!.historial[0]).toMatchObject({ etiqueta: 'Enviada a Recursos Humanos', por: 'Juan Pérez', origen_etiqueta: 'App móvil' });
  });

  it.each([
    ['enviada', 'info', 'paper-plane-outline'],
    ['en_revision', 'info', 'time-outline'],
    ['requiere_informacion', 'aviso', 'chatbubble-ellipses-outline'],
    ['aprobada', 'exito', 'checkmark-circle-outline'],
    ['rechazada', 'peligro', 'close-circle-outline'],
    ['cancelada', 'neutral', 'remove-circle-outline'],
  ])('%s → tono %s con ícono (nunca solo color)', (estado, tono, icono) => {
    expect(estadoCorreccionVisual(estado)).toMatchObject({ tono, icono });
  });

  it('barra de 3 pasos según el estado', () => {
    expect(pasosCorreccion('enviada').map((p) => p.estado)).toEqual(['hecho', 'pendiente', 'pendiente']);
    expect(pasosCorreccion('en_revision').map((p) => p.estado)).toEqual(['hecho', 'actual', 'pendiente']);
    expect(pasosCorreccion('requiere_informacion')[1]).toMatchObject({ etiqueta: 'Requiere tu respuesta', estado: 'accion' });
    expect(pasosCorreccion('aprobada').map((p) => p.estado)).toEqual(['hecho', 'hecho', 'hecho']);
    expect(pasosCorreccion('rechazada')[2]).toMatchObject({ etiqueta: 'Rechazada', estado: 'rechazado' });
  });

  it('destino de cada corrección', () => {
    const [sol, doc] = normalizeCorrecciones(RESPUESTA).data;
    expect(destinoCorreccion(sol!).ruta).toBe('/correcciones/solicitud-12');
    expect(destinoCorreccion(doc!)).toEqual({ ruta: '/expediente/5?ref=documento', accion: 'Volver a subir el documento' });
    expect(solicitudIdDeCorreccion(sol!)).toBe(12);
    expect(solicitudIdDeCorreccion(doc!)).toBeNull();
  });

  it('render: chip con el estado, comentario de RH e historial', () => {
    const correccion = normalizeCorrecciones(RESPUESTA).data[0]!;
    const arbol = render(<CorreccionResumen correccion={correccion} />);
    expect(arbol.root.findByType(Pill).props).toMatchObject({ texto: 'Requiere información', tono: 'aviso', icono: 'chatbubble-ellipses-outline' });
    const textos = arbol.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);
    expect(textos).toEqual(expect.arrayContaining(['Comentario de Recursos Humanos', 'La CURP no coincide con tu acta.', 'Enviada a Recursos Humanos']));
  });
});

describe('formulario de respuesta', () => {
  it('solo deja corregir campos de texto libre (sin listas, domicilio ni confidenciales)', () => {
    expect(camposEditables(DATOS).map((d) => d.campo)).toEqual(['curp', 'telefono']);
  });

  it('valida el mensaje obligatorio con texto humano', () => {
    expect(validarRespuesta('  ')).toBe('Escribe tu respuesta para Recursos Humanos.');
    expect(validarRespuesta('ok')).toBe('Escribe tu respuesta para Recursos Humanos.');
    expect(validarRespuesta('Ya la corregí')).toBeNull();
    expect(validarRespuesta('x'.repeat(1001))).toBe('La respuesta no puede pasar de 1,000 caracteres.');
  });

  it('solo envía los datos que cambiaron (CURP en mayúsculas)', () => {
    expect(construirRespuesta(' Corregida ', DATOS, { curp: 'pexj900101hdfrrn08', telefono: '5512345678' })).toEqual({
      mensaje: 'Corregida',
      datos: { curp: 'PEXJ900101HDFRRN08' },
    });
    expect(construirRespuesta('Sin cambios de datos', DATOS, {})).toEqual({ mensaje: 'Sin cambios de datos' });
  });

  it('traduce los 422 del backend a cada campo', () => {
    expect(erroresRespuesta({ mensaje: ['Escribe tu respuesta para Recursos Humanos.'], 'datos.curp': ['La CURP no tiene un formato válido (18 caracteres).'] })).toEqual({
      mensaje: 'Escribe tu respuesta para Recursos Humanos.',
      datos: { curp: 'La CURP no tiene un formato válido (18 caracteres).' },
    });
  });

  it('render: mensaje + un input por dato editable con su error', () => {
    const onValor = jest.fn();
    const arbol = render(
      <FormularioRespuestaCorreccion
        mensaje=""
        onMensaje={() => undefined}
        datos={DATOS}
        valores={{}}
        onValor={onValor}
        erroresDatos={{ curp: 'La CURP no tiene un formato válido (18 caracteres).' }}
      />,
    );
    const inputs = arbol.root.findAllByType(TextInput);
    expect(inputs.map((i) => i.props.testID)).toEqual(['respuesta-mensaje', 'respuesta-dato-curp', 'respuesta-dato-telefono']);
    expect(inputs[1]!.props.value).toBe('PEXJ900101HDFRRN09');
    act(() => inputs[2]!.props.onChangeText('5587654321'));
    expect(onValor).toHaveBeenCalledWith('telefono', '5587654321');
    const textos = arbol.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);
    expect(textos).toContain('La CURP no tiene un formato válido (18 caracteres).');
  });
});
