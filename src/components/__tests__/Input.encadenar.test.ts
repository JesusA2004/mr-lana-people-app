import { debeEncadenarFoco } from '../Input';
import { MODO_CIERRE_TECLADO, offsetCampoActivo } from '../FormularioScroll';

describe('Input: «Siguiente» encadena el foco', () => {
  it('encadena en campos de una línea sin onSubmitEditing propio', () => {
    expect(debeEncadenarFoco({})).toBe(true);
    expect(debeEncadenarFoco({ returnKeyType: 'next' })).toBe(true);
  });

  it('respeta la tecla y el envío que defina la pantalla', () => {
    expect(debeEncadenarFoco({ returnKeyType: 'done' })).toBe(false);
    expect(debeEncadenarFoco({ returnKeyType: 'search' })).toBe(false);
    expect(debeEncadenarFoco({ onSubmitEditing: () => {} })).toBe(false);
  });

  it('nunca encadena en multilínea (Enter = salto de renglón)', () => {
    expect(debeEncadenarFoco({ multiline: true })).toBe(false);
  });
});

describe('FormularioScroll', () => {
  it('deja el campo activo arriba de la barra inferior', () => {
    expect(offsetCampoActivo(0)).toBeGreaterThan(0);
    expect(offsetCampoActivo(80)).toBe(offsetCampoActivo(0) + 80);
    expect(offsetCampoActivo(-5)).toBe(offsetCampoActivo(0));
  });

  it('cierra el teclado al arrastrar', () => {
    expect(['interactive', 'on-drag']).toContain(MODO_CIERRE_TECLADO);
  });
});
