import { descartarPdfInduccion, nombreCacheInduccion, obtenerPdfInduccion } from '../induccionCache';

import { discoFalso, FakeFile, PDF_BYTES } from '@/test/fakeFileSystem';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock se carga con require dentro de jest.mock.
jest.mock('expo-file-system', () => require('@/test/fakeFileSystem').fakeExpoFileSystem);

const PATH = '/induccion/pdf';
const V1 = { ultimaModificacion: 'lunes', tamano: PDF_BYTES.length };
const escribir = (bytes: Uint8Array) => jest.fn(async (destino: unknown) => void discoFalso.set((destino as FakeFile).uri, bytes));
const nombres = () => [...discoFalso.keys()].map((k) => k.split('/').pop());

beforeEach(() => discoFalso.clear());

describe('obtenerPdfInduccion', () => {
  it('guarda la copia completa y la reutiliza sin volver a bajarla', async () => {
    const descargar = escribir(PDF_BYTES);
    await obtenerPdfInduccion({ path: PATH, consultarVersion: async () => V1, descargar });
    await obtenerPdfInduccion({ path: PATH, consultarVersion: async () => V1, descargar });
    expect(descargar).toHaveBeenCalledTimes(1);
    expect(nombres()).toEqual([nombreCacheInduccion(PATH, V1)]);
  });

  it('descarga cortada: no deja parcial ni nombre final', async () => {
    const descargar = jest.fn(async (destino: unknown) => {
      discoFalso.set((destino as FakeFile).uri, PDF_BYTES.slice(0, 2));
      throw new Error('abortado');
    });
    await expect(obtenerPdfInduccion({ path: PATH, consultarVersion: async () => V1, descargar })).rejects.toThrow('abortado');
    expect(nombres()).toEqual([]);
  });

  it('parcial sin error (tamaño menor al informado): se rechaza y no se cachea', async () => {
    await expect(obtenerPdfInduccion({ path: PATH, consultarVersion: async () => V1, descargar: escribir(PDF_BYTES.slice(0, 5)) })).rejects.toThrow('incompleto');
    expect(nombres()).toEqual([]);
  });

  it('una respuesta que no es PDF no se cachea', async () => {
    await expect(obtenerPdfInduccion({ path: PATH, consultarVersion: async () => ({ tamano: null }), descargar: escribir(new Uint8Array([60, 104, 116, 109, 108])) })).rejects.toThrow('incompleto');
  });

  it('RH reemplaza el PDF con las mismas páginas: baja el nuevo y borra el viejo', async () => {
    await obtenerPdfInduccion({ path: PATH, consultarVersion: async () => V1, descargar: escribir(PDF_BYTES) });
    const V2 = { ...V1, ultimaModificacion: 'martes' };
    const descargar = escribir(PDF_BYTES);
    await obtenerPdfInduccion({ path: PATH, consultarVersion: async () => V2, descargar });
    expect(descargar).toHaveBeenCalledTimes(1);
    expect(nombres()).toEqual([nombreCacheInduccion(PATH, V2)]);
  });

  it('sin red usa la última copia completa; un 403 no', async () => {
    await obtenerPdfInduccion({ path: PATH, consultarVersion: async () => V1, descargar: escribir(PDF_BYTES) });
    const archivo = await obtenerPdfInduccion({ path: PATH, consultarVersion: () => Promise.reject(new Error('Network Error')), descargar: escribir(PDF_BYTES) });
    expect(archivo.name).toBe(nombreCacheInduccion(PATH, V1));
    await expect(obtenerPdfInduccion({ path: PATH, consultarVersion: () => Promise.reject(new Error('HTTP 403')), descargar: escribir(PDF_BYTES) })).rejects.toThrow('403');
  });

  it('descartar borra la copia que pdf.js no pudo dibujar', async () => {
    await obtenerPdfInduccion({ path: PATH, consultarVersion: async () => V1, descargar: escribir(PDF_BYTES) });
    descartarPdfInduccion();
    expect(nombres()).toEqual([]);
  });
});
