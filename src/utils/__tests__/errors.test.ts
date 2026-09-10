import { normalizeError } from '../errors';

/** Simula el shape mínimo de un `AxiosError` sin depender de axios real. */
function axiosError(overrides: { response?: { status: number; data?: unknown } }): unknown {
  return { isAxiosError: true, response: overrides.response };
}

describe('normalizeError — caso QR: registro con red ambigua', () => {
  it('un error de red real (la petición nunca obtuvo respuesta) se marca isNetworkError', () => {
    // El registro pudo haberse completado en el backend aunque el cliente
    // nunca vio la respuesta — este es el único caso donde
    // `incorporacion/qr/[token].tsx` debe mostrar "Tu registro pudo haberse
    // completado" en vez del error de validación normal.
    const result = normalizeError(axiosError({ response: undefined }));
    expect(result.isNetworkError).toBe(true);
  });

  it('un 422 real (el backend sí respondió, el registro de verdad falló) NUNCA se marca como red', () => {
    const result = normalizeError(axiosError({ response: { status: 422, data: { errors: { email: ['ya está en uso'] } } } }));
    expect(result.isNetworkError).toBeUndefined();
    expect(result.validationErrors).toEqual({ email: ['ya está en uso'] });
  });

  it('un 409 (token de invitación ya usado por un reintento normal) tampoco es ambiguo', () => {
    const result = normalizeError(axiosError({ response: { status: 409 } }));
    expect(result.isNetworkError).toBeUndefined();
  });

  it('un error que no es de axios nunca se marca como red por accidente', () => {
    const result = normalizeError(new Error('algo distinto'));
    expect(result.isNetworkError).toBeUndefined();
  });
});
