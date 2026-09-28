import { notificacionesApi } from '../notificaciones';

/**
 * `POST /api/v1/notificaciones/{id}/abrir` — AGENTS.md sección 27: al tocar
 * una notificación la app debe usar este endpoint (no solo `.../leer`) para
 * saber si el recurso ya fue atendido en otro lado.
 */
const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  extractData: (payload: unknown) =>
    payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: unknown }).data : payload,
}));

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe('notificacionesApi.abrir', () => {
  it('llama POST /notificaciones/{id}/abrir y devuelve el destino real', async () => {
    mockPost.mockResolvedValue({
      data: { data: { url: '/solicitudes/9', atendida: true, estado_recurso: 'Aprobada', mensaje_estado: 'La solicitud FOL-9 ya fue atendida: está «Aprobada».', no_leidas: 2 } },
    });

    const result = await notificacionesApi.abrir(55);

    expect(mockPost).toHaveBeenCalledWith('/notificaciones/55/abrir');
    expect(result.atendida).toBe(true);
    expect(result.mensaje_estado).toMatch(/ya fue atendida/);
    expect(result.no_leidas).toBe(2);
  });

  it('mensaje_estado puede ser null (aviso informativo) — nunca se inventa un texto', async () => {
    mockPost.mockResolvedValue({ data: { data: { url: null, atendida: null, estado_recurso: null, mensaje_estado: null, no_leidas: 0 } } });

    const result = await notificacionesApi.abrir('9');

    expect(result.mensaje_estado).toBeNull();
  });
});
