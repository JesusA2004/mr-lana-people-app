import { canApprove, canAuthorizeChange, canReject, canRequestCorrection, hasAction } from '../rhActions';

describe('rhActions', () => {
  it('canApprove solo es true si "aprobar" está en acciones_permitidas', () => {
    expect(canApprove(['ver', 'aprobar', 'rechazar'])).toBe(true);
    expect(canApprove(['ver', 'rechazar'])).toBe(false);
  });

  it('canReject respeta exactamente el arreglo del backend', () => {
    expect(canReject(['ver'])).toBe(false);
    expect(canReject(['ver', 'rechazar'])).toBe(true);
  });

  it('canRequestCorrection y canAuthorizeChange son independientes', () => {
    expect(canRequestCorrection(['ver', 'solicitar_correccion'])).toBe(true);
    expect(canAuthorizeChange(['ver', 'solicitar_correccion'])).toBe(false);
  });

  it('hasAction tolera undefined sin lanzar', () => {
    expect(hasAction(undefined, 'aprobar')).toBe(false);
  });
});
