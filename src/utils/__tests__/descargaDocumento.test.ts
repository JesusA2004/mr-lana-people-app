import {
  esErrorDeRed,
  etiquetaDescarga,
  formatearTamano,
  mensajeErrorDescarga,
  mensajeParaErrorDescarga,
  mimeParaTipo,
  nombreArchivoSeguro,
  porcentajeDescarga,
  statusDesdeErrorDescarga,
  tipoLegible,
  utiParaTipo,
} from '../descargaDocumento';

describe('formatearTamano', () => {
  it('devuelve null si no hay tamaño', () => {
    expect(formatearTamano(null)).toBeNull();
    expect(formatearTamano(undefined)).toBeNull();
    expect(formatearTamano(0)).toBeNull();
    expect(formatearTamano(Number.NaN)).toBeNull();
  });

  it('formatea B, KB y MB', () => {
    expect(formatearTamano(512)).toBe('512 B');
    expect(formatearTamano(2048)).toBe('2 KB');
    expect(formatearTamano(1024 * 1024 * 1.25)).toBe('1.3 MB');
    expect(formatearTamano(1024 * 1024 * 12.4)).toBe('12 MB');
  });
});

describe('porcentajeDescarga', () => {
  it('es null sin Content-Length', () => {
    expect(porcentajeDescarga(100, -1)).toBeNull();
    expect(porcentajeDescarga(100, 0)).toBeNull();
  });

  it('acota a 0–100', () => {
    expect(porcentajeDescarga(50, 200)).toBe(25);
    expect(porcentajeDescarga(300, 200)).toBe(100);
  });
});

describe('nombreArchivoSeguro', () => {
  it('quita acentos y caracteres prohibidos y pone la extensión real', () => {
    expect(nombreArchivoSeguro('Contrato: Juan Pérez / 2026', 'pdf')).toBe('Contrato Juan Perez 2026.pdf');
  });

  it('no duplica la extensión del título', () => {
    expect(nombreArchivoSeguro('recibo-001.PDF', 'pdf')).toBe('recibo-001.pdf');
  });

  it('usa «documento» si el título queda vacío', () => {
    expect(nombreArchivoSeguro('***', 'pdf')).toBe('documento.pdf');
    expect(nombreArchivoSeguro(null, '.jpg')).toBe('documento.jpg');
  });

  it('recorta títulos larguísimos', () => {
    const nombre = nombreArchivoSeguro('a'.repeat(200), 'pdf');
    expect(nombre.length).toBeLessThanOrEqual(84);
    expect(nombre.endsWith('.pdf')).toBe(true);
  });
});

describe('tipos', () => {
  it('mime, UTI y etiqueta legible', () => {
    expect(mimeParaTipo('pdf')).toBe('application/pdf');
    expect(mimeParaTipo('unknown')).toBe('application/octet-stream');
    expect(utiParaTipo('pdf')).toBe('com.adobe.pdf');
    expect(utiParaTipo('unknown')).toBeUndefined();
    expect(tipoLegible('pdf')).toBe('Documento PDF');
    expect(tipoLegible('image/jpeg')).toBe('Imagen JPG');
    expect(tipoLegible('docx')).toBe('Documento de Word');
    expect(tipoLegible(null)).toBe('Archivo');
  });

  it('texto del botón', () => {
    expect(etiquetaDescarga('pdf')).toBe('Descargar PDF');
    expect(etiquetaDescarga('jpeg')).toBe('Descargar imagen');
    expect(etiquetaDescarga('docx')).toBe('Descargar archivo');
  });
});

describe('errores de descarga', () => {
  it('lee el status del mensaje nativo (Android/iOS) y de Axios', () => {
    expect(statusDesdeErrorDescarga(new Error('HTTP 404'))).toBe(404);
    expect(statusDesdeErrorDescarga(new Error('server returned HTTP 403'))).toBe(403);
    expect(statusDesdeErrorDescarga({ response: { status: 413 } })).toBe(413);
    expect(statusDesdeErrorDescarga(new Error('algo'))).toBeUndefined();
  });

  it('detecta errores de red', () => {
    expect(esErrorDeRed(new Error('Network request failed'))).toBe(true);
    expect(esErrorDeRed(new Error('HTTP 500'))).toBe(false);
  });

  it('mensajes humanos por status', () => {
    expect(mensajeErrorDescarga(401)).toMatch(/sesión/);
    expect(mensajeErrorDescarga(403)).toMatch(/permiso/);
    expect(mensajeErrorDescarga(404)).toMatch(/ya no está disponible/);
    expect(mensajeErrorDescarga(413)).toMatch(/demasiado grande/);
    expect(mensajeErrorDescarga(502)).toMatch(/nuestro lado/);
    expect(mensajeErrorDescarga(undefined, true)).toMatch(/conexión/);
    expect(mensajeParaErrorDescarga(new Error('HTTP 403'))).toMatch(/permiso/);
  });
});
