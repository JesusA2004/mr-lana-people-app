import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { RenglonRecepcionFila } from '../recepcion/RenglonRecepcionFila';

import { queryKeys } from '@/api/queryKeys';
import { normalizeCorteDetalle, normalizeRenglonRecepcion, rhRecepcionApi } from '@/api/rh/recepcionDocumental';
import { useMarcarRecepcion } from '@/hooks/queries/useRhRecepcionDocumental';
import { toast } from '@/store/toastStore';
import type { ReglaRecepcion, RenglonRecepcion } from '@/types/recepcionDocumental';
import type { Paginated } from '@/utils/normalize';
import { agruparRenglones, estadoAlTocar, textoSeccionVacia } from '@/utils/recepcionDocumental';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock oficial se carga con require dentro de jest.mock.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));

function renglon(id: number, extra: Record<string, unknown> = {}): RenglonRecepcion {
  return normalizeRenglonRecepcion({
    id,
    corte_id: 7,
    regla: 'altas',
    regla_etiqueta: 'Altas',
    regla_orden: 1,
    tipo_documento: 'contrato',
    tipo_etiqueta: `Documento ${id}`,
    origen: { tipo: 'Colaborador', id: 50 },
    colaborador: { id: 50, nombre: 'Ana Pérez', numero_empleado: '123', puesto: 'Gestor' },
    sucursal: { id: 3, nombre: 'Cuernavaca' },
    cantidad_esperada: 1,
    cantidad_recibida: 0,
    estado: 'pendiente',
    estado_etiqueta: 'Pendiente',
    ...extra,
  });
}

function paginas(lista: RenglonRecepcion[]): InfiniteData<Paginated<RenglonRecepcion>> {
  return { pages: [{ data: lista, meta: { current_page: 1, last_page: 1, per_page: 50, total: lista.length } }], pageParams: [1] };
}

describe('normalizers de recepción documental', () => {
  it('detalle: sucursales y reglas desde agrupaciones, permisos ausentes = no', () => {
    const detalle = normalizeCorteDetalle({
      id: 7,
      etiqueta: 'Noviembre 2026',
      estado: 'abierto',
      metricas: { esperados: '10', recibidos: 4, cumplimiento: 40 },
      agrupaciones: {
        sucursales: [{ sucursal_id: null, nombre: 'Sin sucursal', metricas: {} }],
        reglas: [
          { regla: 'bajas', etiqueta: 'Bajas', orden: 7, activa: true, sin_eventos: 'No hubo bajas durante noviembre 2026.', metricas: {} },
          { regla: 'altas', etiqueta: 'Altas', orden: 1, activa: true, sin_eventos: 'No hubo altas durante noviembre 2026.', metricas: {} },
        ],
      },
      permisos: { recibir: true },
    });
    expect(detalle.metricas.esperados).toBe(10);
    expect(detalle.sucursales[0].sucursal_id).toBeNull();
    expect(detalle.reglas.map((r) => r.regla)).toEqual(['altas', 'bajas']);
    expect(detalle.permisos).toEqual({ recibir: true, observar: false, cerrar: false, reabrir: false, descargar_pdf: false });
  });

  it('un estado desconocido cae en pendiente', () => {
    expect(renglon(1, { estado: 'raro' }).estado).toBe('pendiente');
  });
});

describe('agrupación y estados vacíos', () => {
  const reglas: ReglaRecepcion[] = [
    { regla: 'altas', etiqueta: 'Altas', orden: 1, activa: true, sin_eventos: 'No hubo altas durante noviembre 2026.', metricas: normalizeCorteDetalle({}).metricas },
    { regla: 'recibos_nomina', etiqueta: 'Nómina', orden: 4, activa: true, sin_eventos: 'No se emitieron recibos de nómina con pago en noviembre 2026.', metricas: normalizeCorteDetalle({}).metricas },
  ];

  it('agrupa evento → persona → documentos y conserva eventos sin renglones', () => {
    const secciones = agruparRenglones([renglon(1), renglon(2)], reglas);
    expect(secciones.map((s) => s.regla)).toEqual(['altas', 'recibos_nomina']);
    expect(secciones[0].personas).toHaveLength(1);
    expect(secciones[0].personas[0].documentos.map((d) => d.id)).toEqual([1, 2]);
    expect(secciones[1].personas).toHaveLength(0);
  });

  it('texto vacío específico (del backend) distinto del filtro', () => {
    const vacio = { etiqueta: 'Altas', sinEventos: 'No hubo altas durante noviembre 2026.', renglonesPeriodo: 0 };
    expect(textoSeccionVacia('todos', vacio)).toBe('No hubo altas durante noviembre 2026.');
    expect(textoSeccionVacia('todos', { ...vacio, renglonesPeriodo: 4 })).toBe('Sin altas en esta sucursal este periodo.');
    expect(textoSeccionVacia('no', vacio)).toBe('Nada por recibir en altas.');
  });

  it('tocar la casilla alterna recibido ↔ pendiente', () => {
    expect(estadoAlTocar({ estado: 'pendiente' })).toBe('recibido');
    expect(estadoAlTocar({ estado: 'recibido_con_observacion' })).toBe('pendiente');
    expect(estadoAlTocar({ estado: 'no_recibido' })).toBe('recibido');
  });
});

describe('RenglonRecepcionFila: permisos', () => {
  const montar = (puedeRecibir: boolean, puedeObservar: boolean) => {
    let arbol!: ReactTestRenderer;
    act(() => {
      arbol = renderer.create(<RenglonRecepcionFila renglon={renglon(9)} puedeRecibir={puedeRecibir} puedeObservar={puedeObservar} onTocar={jest.fn()} onMas={jest.fn()} />);
    });
    return arbol;
  };
  const tiene = (arbol: ReactTestRenderer, id: string) => arbol.root.findAll((n) => n.props.testID === id).length > 0;

  it('sin `recibir` ni `observar` no hay casilla ni «…»', () => {
    const arbol = montar(false, false);
    expect(tiene(arbol, 'casilla-9')).toBe(false);
    expect(tiene(arbol, 'mas-9')).toBe(false);
  });

  it('con `recibir` aparece la casilla; con `observar`, el «…»', () => {
    expect(tiene(montar(true, false), 'casilla-9')).toBe(true);
    expect(tiene(montar(true, false), 'mas-9')).toBe(false);
    expect(tiene(montar(false, true), 'mas-9')).toBe(true);
  });
});

describe('useMarcarRecepcion: optimista + rollback', () => {
  const filtros = { sucursal_id: 3 } as const;

  function montarHook() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
    const clave = queryKeys.rhRecepcionRenglones(7, { ...filtros });
    client.setQueryData(clave, paginas([renglon(1), renglon(2, { estado: 'recibido', estado_etiqueta: 'Recibido', cantidad_recibida: 1 })]));
    const ref: { marcar?: ReturnType<typeof useMarcarRecepcion> } = {};
    function Harness() {
      ref.marcar = useMarcarRecepcion(7, filtros);
      return null;
    }
    act(() => {
      renderer.create(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
    });
    const leer = (id: number) => client.getQueryData<InfiniteData<Paginated<RenglonRecepcion>>>(clave)?.pages[0].data.find((r) => r.id === id);
    return { ref, leer };
  }

  afterEach(() => jest.restoreAllMocks());

  it('marca al instante y confirma con la fila del backend', async () => {
    let resolver!: (valor: Awaited<ReturnType<typeof rhRecepcionApi.marcar>>) => void;
    jest.spyOn(rhRecepcionApi, 'marcar').mockImplementation(() => new Promise((r) => (resolver = r)));
    const { ref, leer } = montarHook();

    await act(async () => {
      ref.marcar!.mutate({ renglon: leer(1)!, payload: { estado: 'recibido' } });
    });
    expect(leer(1)?.estado).toBe('recibido');
    expect(leer(1)?.cantidad_recibida).toBe(1);

    await act(async () => {
      resolver({ renglon: renglon(1, { estado: 'recibido', estado_etiqueta: 'Recibido', recibido_por: 'RH Ana' }), metricas: normalizeCorteDetalle({}).metricas, estado_corte: null });
    });
    expect(leer(1)?.recibido_por).toBe('RH Ana');
    expect(rhRecepcionApi.marcar).toHaveBeenCalledWith(1, { estado: 'recibido' });
  });

  it('si el backend falla regresa ESE renglón y avisa', async () => {
    const config = { headers: new AxiosHeaders() };
    const error = new AxiosError('x', 'ERR', config, null, { status: 422, statusText: '', headers: {}, config, data: { message: 'El corte está cerrado.', errors: { estado: ['El corte está cerrado.'] } } });
    let rechazar!: (e: unknown) => void;
    jest.spyOn(rhRecepcionApi, 'marcar').mockImplementation(() => new Promise((_r, rej) => (rechazar = rej)));
    const avisos = jest.spyOn(toast, 'error').mockImplementation(() => undefined);
    const { ref, leer } = montarHook();

    await act(async () => {
      ref.marcar!.mutate({ renglon: leer(2)!, payload: { estado: 'pendiente' } });
    });
    expect(leer(2)?.estado).toBe('pendiente');

    await act(async () => {
      rechazar(error);
    });
    expect(leer(2)?.estado).toBe('recibido');
    expect(leer(1)?.estado).toBe('pendiente');
    expect(avisos).toHaveBeenCalledWith(expect.stringContaining('Documento 2'));
  });
});
