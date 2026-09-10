import { extensionForSniffedType, sniffFileType } from '../fileSniff';

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

describe('sniffFileType', () => {
  it('reconoce un PDF por su firma "%PDF-"', () => {
    expect(sniffFileType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34))).toBe('pdf');
  });

  it('reconoce un PNG por su firma', () => {
    expect(sniffFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png');
  });

  it('reconoce un JPEG por su firma', () => {
    expect(sniffFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
  });

  it('un archivo desconocido (application/octet-stream real, o corrupto) nunca se disfraza de imagen', () => {
    expect(sniffFileType(bytes(0x00, 0x01, 0x02, 0x03))).toBe('unknown');
  });

  it('un arreglo vacío (archivo de 0 bytes) es desconocido, no truena', () => {
    expect(sniffFileType(new Uint8Array(0))).toBe('unknown');
  });

  it('unos pocos bytes que no alcanzan para ninguna firma es desconocido', () => {
    expect(sniffFileType(bytes(0x25, 0x50))).toBe('unknown');
  });
});

describe('extensionForSniffedType', () => {
  it('mapea cada tipo a su extensión real', () => {
    expect(extensionForSniffedType('pdf')).toBe('pdf');
    expect(extensionForSniffedType('png')).toBe('png');
    expect(extensionForSniffedType('jpeg')).toBe('jpg');
    expect(extensionForSniffedType('unknown')).toBe('bin');
  });
});
