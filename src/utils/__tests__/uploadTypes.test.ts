import { archivoPermitido, esVideo, mimesAceptados, nombrePorDefecto } from '../uploadTypes';

describe('tipos de carga por acción', () => {
  it('por defecto (expediente/solicitudes) NO acepta video: no se rompen las demás pantallas', () => {
    expect(mimesAceptados(false)).toEqual(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);
    expect(archivoPermitido('video/mp4', false)).toBe(false);
    expect(archivoPermitido('application/pdf', false)).toBe(true);
  });

  it('el socioeconómico acepta jpg/png/pdf/mp4/mov como el backend', () => {
    const mimes = mimesAceptados(true);
    for (const m of ['application/pdf', 'image/jpeg', 'image/png', 'video/mp4', 'video/quicktime']) {
      expect(mimes).toContain(m);
      expect(archivoPermitido(m, true)).toBe(true);
    }
    expect(archivoPermitido('application/zip', true)).toBe(false);
    expect(archivoPermitido(undefined, true)).toBe(false);
  });

  it('nombres por defecto con la extensión real (nunca "undefined")', () => {
    expect(nombrePorDefecto('video/quicktime', 1)).toBe('video-1.mov');
    expect(nombrePorDefecto('video/mp4', 1)).toBe('video-1.mp4');
    expect(nombrePorDefecto(undefined, 1)).toBe('foto-1.jpg');
    expect(esVideo('video/mp4')).toBe(true);
    expect(esVideo('image/png')).toBe(false);
  });
});
