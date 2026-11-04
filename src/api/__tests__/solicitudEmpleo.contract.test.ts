import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '../client';
import { registroApi } from '../registro';
import { solicitudEmpleoApi } from '../solicitudEmpleo';

/**
 * La app nueva declara que captura la Solicitud de empleo en el registro
 * (`X-People-Solicitud-Empleo: 1`): sin la cabecera el backend NO la exige
 * para cerrar el registro (SolicitudEmpleoRegistroService::exigidaEnRegistro).
 */
describe('cabecera X-People-Solicitud-Empleo', () => {
  const enviadas: InternalAxiosRequestConfig[] = [];
  const adaptadorOriginal = apiClient.defaults.adapter;

  beforeAll(() => {
    const adaptador: AxiosAdapter = async (config) => {
      enviadas.push(config);
      const data = config.url?.includes('/registro/solicitud')
        ? { data: { registro_abierto: true, exigida: true, secciones: [], completitud: { completo: false, porcentaje: 0 } }, message: 'Sección guardada.' }
        : { data: { aplica: true, solicitud_empleo: { exigida: true, completo: false, porcentaje: 10, secciones: [], documentos: [], pendientes: ['Vivienda: Número de baños'] } } };
      return { data, status: 200, statusText: 'OK', headers: {}, config };
    };
    apiClient.defaults.adapter = adaptador;
  });

  afterAll(() => {
    apiClient.defaults.adapter = adaptadorOriginal;
  });

  beforeEach(() => {
    enviadas.length = 0;
  });

  const cabecera = (config: InternalAxiosRequestConfig) => config.headers.get('X-People-Solicitud-Empleo');

  test('va en GET y POST de la solicitud', async () => {
    await solicitudEmpleoApi.estado();
    await solicitudEmpleoApi.guardarSeccion('personal', { datos: { numero_hijos: 2 }, no_aplica: [] });
    expect(enviadas.map((c) => [c.method, c.url])).toEqual([
      ['get', '/colaborador/registro/solicitud'],
      ['post', '/colaborador/registro/solicitud/personal'],
    ]);
    expect(enviadas.map(cabecera)).toEqual(['1', '1']);
    expect(JSON.parse(String(enviadas[1].data))).toEqual({ datos: { numero_hijos: 2 }, no_aplica: [] });
  });

  test('va en el estado y en finalizar del registro, y el bloque se normaliza', async () => {
    const estado = await registroApi.estado();
    await registroApi.finalizar();
    expect(enviadas.map(cabecera)).toEqual(['1', '1']);
    expect(estado.solicitud_empleo).toEqual({ exigida: true, completo: false, porcentaje: 10, secciones: [], documentos: [], pendientes: ['Vivienda: Número de baños'] });
  });
});
