import { barrerTemporalesDocumentos, clearPrivateAssetCache, esTemporalAbandonado } from '../privateAssetCache';

import { discoFalso } from '@/test/fakeFileSystem';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock se carga con require dentro de jest.mock.
jest.mock('expo-file-system', () => require('@/test/fakeFileSystem').fakeExpoFileSystem);

const CACHE = 'file:///cache';
const poner = (...nombres: string[]) => nombres.forEach((n) => discoFalso.set(`${CACHE}/${n}`, new Uint8Array([1])));
const quedan = () => [...discoFalso.keys()].map((k) => k.replace(`${CACHE}/`, '')).sort();

beforeEach(() => discoFalso.clear());

describe('barrerTemporalesDocumentos', () => {
  it('borra temporales, copias legibles y caché vieja; respeta fotos y la caché vigente', () => {
    poner(
      'mrlana-doc-1-a.pdf',
      'mrlana-doc-2-b.bin',
      'mrlana-salida/Contrato de Ana.pdf',
      'Recibo 15.pdf',
      'Expediente 4321.zip',
      'induccion-42.pdf',
      'induccion-v2-abc.pdf',
      'private-asset-v2-7-x.jpg',
      'otra-cosa.json',
    );
    const borrados = barrerTemporalesDocumentos();
    expect(quedan()).toEqual(['induccion-v2-abc.pdf', 'otra-cosa.json', 'private-asset-v2-7-x.jpg']);
    expect(borrados).toBe(6);
  });

  it('sin nada que borrar devuelve 0 y no lanza', () => {
    expect(barrerTemporalesDocumentos()).toBe(0);
  });

  it('el logout sí borra la caché de inducción y las copias legibles', () => {
    poner('induccion-v2-abc.pdf', 'mrlana-salida/Contrato.pdf', 'private-asset-v2-7-x.jpg', 'private-asset-v2-8-x.jpg');
    clearPrivateAssetCache(7);
    expect(quedan()).toEqual(['private-asset-v2-8-x.jpg']);
  });

  it('reconoce lo abandonado sin tocar imágenes', () => {
    expect(esTemporalAbandonado('mrlana-doc-1.bin')).toBe(true);
    expect(esTemporalAbandonado('foto.jpg')).toBe(false);
    expect(esTemporalAbandonado('induccion-v2-x.pdf')).toBe(false);
  });
});
