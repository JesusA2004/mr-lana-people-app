import { rhCierresApi, rhDocumentosLaboralesApi } from '../rh/cicloLaboral';

/**
 * Tests de CONTRATO del flujo FÍSICO nuevo (concluye en firma física, sin
 * envío a corporativo / recepción / escaneo / archivado como paso). Verifican
 * que el finiquito se marca firmado SIN archivo (JSON) contra el endpoint
 * nuevo y que la API de documentos ya no expone los pasos legacy.
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

const cierreResource = { id: 5, tipo_baja: 'renuncia', estado: 'finiquito_firmado', finiquito: { id: 9, estado: 'firmado' } };

describe('finiquito firmado físicamente (flujo nuevo, sin archivo)', () => {
  it('llama POST /rh/cierres/{id}/finiquito/firmado-fisico con JSON { observacion } (nunca multipart)', async () => {
    mockPost.mockResolvedValue({ data: cierreResource });

    await rhCierresApi.finiquitoFirmadoFisico(5, 'Firmado por ambas partes');

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body, config] = mockPost.mock.calls[0];
    expect(url).toBe('/rh/cierres/5/finiquito/firmado-fisico');
    expect(body).toEqual({ observacion: 'Firmado por ambas partes' });
    // Sin archivo: JSON plano, no FormData ni headers multipart.
    expect(body instanceof FormData).toBe(false);
    expect(config).toBeUndefined();
  });

  it('observación vacía u omitida viaja como null', async () => {
    mockPost.mockResolvedValue({ data: cierreResource });

    await rhCierresApi.finiquitoFirmadoFisico(5);

    expect(mockPost.mock.calls[0][1]).toEqual({ observacion: null });
  });

  it('ya no existe la subida de escaneo del finiquito firmado', () => {
    expect((rhCierresApi as Record<string, unknown>).finiquitoFirmado).toBeUndefined();
  });
});

describe('documentos laborales: el flujo nuevo no expone pasos legacy', () => {
  it('conserva imprimir / firma física / cancelar', () => {
    expect(typeof rhDocumentosLaboralesApi.imprimir).toBe('function');
    expect(typeof rhDocumentosLaboralesApi.firmaFisica).toBe('function');
    expect(typeof rhDocumentosLaboralesApi.cancelar).toBe('function');
  });

  it('elimina envío / recepción / escaneo / archivar', () => {
    const api = rhDocumentosLaboralesApi as Record<string, unknown>;
    expect(api.envio).toBeUndefined();
    expect(api.recepcion).toBeUndefined();
    expect(api.escaneo).toBeUndefined();
    expect(api.archivar).toBeUndefined();
  });
});
