import { rhSolicitudesApi } from '../rh/solicitudes';
import { rhVacantesApi } from '../rh/vacantes';
import { solicitudesApi } from '../solicitudes';
import { vacacionesApi } from '../vacaciones';

import {
  adjuntoResponse,
  cancelarResponse,
  configuracionResponse,
  rhVacantesResponse,
  saldoVacaciones,
  solicitudResource,
} from '@/test/fixtures/backend';

/**
 * Tests de CONTRATO: verifican qué endpoint llama cada método y qué hace con
 * la respuesta REAL del backend. Son la red que impide volver a caer en los
 * bugs de esta sincronización — sobre todo el más caro: seguir creando
 * vacaciones en la tabla legacy.
 */

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();

jest.mock('../client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
  extractData: (payload: unknown) =>
    payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: unknown }).data : payload,
}));

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPatch.mockReset();
});

describe('vacaciones unificadas', () => {
  it('crear vacaciones usa POST /solicitudes con tipo=vacaciones, NUNCA /vacaciones/solicitudes', async () => {
    mockPost.mockResolvedValue({ data: solicitudResource });

    await solicitudesApi.create({
      tipo: 'vacaciones',
      motivo: 'Descanso familiar',
      fecha_inicio: '2026-10-05',
      fecha_fin: '2026-10-09',
      dias_solicitados: 5,
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, payload] = mockPost.mock.calls[0];
    expect(url).toBe('/solicitudes');
    expect(url).not.toBe('/vacaciones/solicitudes');
    expect(payload).toMatchObject({ tipo: 'vacaciones', dias_solicitados: 5 });
  });

  it('el cliente legacy ya no expone forma alguna de crear una solicitud', () => {
    expect(Object.keys(vacacionesApi)).toEqual(['getSaldo']);
    expect((vacacionesApi as Record<string, unknown>).createSolicitud).toBeUndefined();
    expect((vacacionesApi as Record<string, unknown>).getSolicitudes).toBeUndefined();
  });

  it('el saldo sigue siendo la única lectura legacy permitida', async () => {
    mockGet.mockResolvedValue({ data: saldoVacaciones });

    await expect(vacacionesApi.getSaldo()).resolves.toEqual(saldoVacaciones);
    expect(mockGet).toHaveBeenCalledWith('/vacaciones/saldo');
  });

  it('aprobar unas vacaciones va por la bandeja unificada RH, no por rh/vacaciones', async () => {
    mockPost.mockResolvedValue({ data: {} });

    await rhSolicitudesApi.aprobar(184, 'Autorizado');

    expect(mockPost).toHaveBeenCalledWith('/rh/solicitudes/184/aprobar', { comentario: 'Autorizado' });
    expect(mockPost.mock.calls[0][0]).not.toContain('/rh/vacaciones');
  });
});

describe('configuracion', () => {
  it('normaliza { tipos: [...] } y nunca espera data[]', async () => {
    mockGet.mockResolvedValue({ data: configuracionResponse });

    const tipos = await solicitudesApi.getConfiguracion();

    expect(mockGet).toHaveBeenCalledWith('/solicitudes/configuracion');
    expect(tipos).toHaveLength(configuracionResponse.tipos.length);
    expect(tipos[0].clave).toBe('vacaciones');
  });

  it('una respuesta inesperada deja un catálogo vacío en vez de lanzar', async () => {
    mockGet.mockResolvedValue({ data: { mensaje: 'sin tipos' } });

    await expect(solicitudesApi.getConfiguracion()).resolves.toEqual([]);
  });
});

describe('adjuntos', () => {
  it('devuelve el mensaje del backend y no intenta leer un adjunto inexistente', async () => {
    mockPost.mockResolvedValue({ status: 201, data: adjuntoResponse });

    const result = await solicitudesApi.addAttachment(184, { uri: 'file:///x.pdf', name: 'x.pdf', mimeType: 'application/pdf' });

    expect(result).toEqual(adjuntoResponse);
    expect((result as Record<string, unknown>).id).toBeUndefined();
  });

  it('no fija Content-Type a mano: deja que se genere el boundary del multipart', async () => {
    mockPost.mockResolvedValue({ status: 201, data: adjuntoResponse });

    await solicitudesApi.addAttachment(184, { uri: 'file:///x.pdf', name: 'x.pdf', mimeType: 'application/pdf' });

    const [url, body, config] = mockPost.mock.calls[0];
    expect(url).toBe('/solicitudes/184/adjuntos');
    expect(body).toBeInstanceOf(FormData);
    expect((config as { headers?: unknown }).headers).toBeUndefined();
  });

  it('tolera un 201 sin cuerpo', async () => {
    mockPost.mockResolvedValue({ status: 201, data: undefined });

    await expect(solicitudesApi.addAttachment(1, { uri: 'file:///x.pdf', name: 'x.pdf', mimeType: 'application/pdf' })).resolves.toEqual({});
  });
});

describe('cancelar', () => {
  it('llama POST /solicitudes/{id}/cancelar y devuelve mensaje + solicitud actualizada', async () => {
    mockPost.mockResolvedValue({ data: cancelarResponse });

    const result = await solicitudesApi.cancelar(184);

    expect(mockPost).toHaveBeenCalledWith('/solicitudes/184/cancelar');
    expect(result.message).toBe('Solicitud cancelada.');
    expect(result.data?.estado).toBe('cancelada');
  });

  it('propaga el 403 del backend cuando el estado ya no lo permite', async () => {
    const forbidden = Object.assign(new Error('Forbidden'), { isAxiosError: true, response: { status: 403, data: {} } });
    mockPost.mockRejectedValue(forbidden);

    await expect(solicitudesApi.cancelar(184)).rejects.toBe(forbidden);
  });

  it('propaga el 422 del backend sin tragárselo', async () => {
    const unprocessable = Object.assign(new Error('Unprocessable'), {
      isAxiosError: true,
      response: { status: 422, data: { message: 'Esta solicitud ya no admite esta acción.' } },
    });
    mockPost.mockRejectedValue(unprocessable);

    await expect(solicitudesApi.cancelar(184)).rejects.toBe(unprocessable);
  });
});

describe('rh/solicitudes estado', () => {
  it('usa PATCH con el estado destino, nunca POST a una ruta inventada', async () => {
    mockPatch.mockResolvedValue({ data: {} });

    await rhSolicitudesApi.actualizarEstado(184, 'en_revision');

    expect(mockPatch).toHaveBeenCalledWith('/rh/solicitudes/184/estado', { estado: 'en_revision' });
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('rh/vacantes', () => {
  it('es solo lectura: expone list y nada más', () => {
    expect(Object.keys(rhVacantesApi)).toEqual(['list']);
  });

  it('lee la página tal cual, con meta de paginación real', async () => {
    mockGet.mockResolvedValue({ data: rhVacantesResponse });

    const page = await rhVacantesApi.list({ estado: 'abierta', page: 1 });

    expect(mockGet).toHaveBeenCalledWith('/rh/vacantes', { params: { estado: 'abierta', page: 1 } });
    expect(page.data[0].plazas_disponibles).toBe(2);
    expect(page.meta?.total).toBe(1);
  });
});
