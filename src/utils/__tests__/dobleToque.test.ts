import { crearGuardiaDobleToque } from '../dobleToque';

describe('sin doble acción', () => {
  it('ignora el segundo toque inmediato aunque la acción sea síncrona (mutate)', () => {
    let t = 1000;
    const guardia = crearGuardiaDobleToque(800, () => t);
    const accion = jest.fn();

    expect(guardia.ejecutar(accion)).toBe(true);
    t += 50;
    expect(guardia.ejecutar(accion)).toBe(false);
    t += 900;
    expect(guardia.ejecutar(accion)).toBe(true);
    expect(accion).toHaveBeenCalledTimes(2);
  });

  it('mientras la promesa no termina, ningún toque pasa (doble aprobación / doble pago)', async () => {
    let t = 0;
    const guardia = crearGuardiaDobleToque(10, () => t);
    let resolver: () => void = () => undefined;
    const accion = jest.fn(() => new Promise<void>((r) => (resolver = r)));
    const alTerminar = jest.fn();

    expect(guardia.ejecutar(accion, alTerminar)).toBe(true);
    expect(guardia.ocupado).toBe(true);
    t += 5000;
    expect(guardia.ejecutar(accion, alTerminar)).toBe(false);

    resolver();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(guardia.ocupado).toBe(false);
    expect(alTerminar).toHaveBeenCalledTimes(1);
    expect(guardia.ejecutar(accion)).toBe(true);
    expect(accion).toHaveBeenCalledTimes(2);
  });

  it('una acción que falla libera el botón', async () => {
    const guardia = crearGuardiaDobleToque(0, () => 0);
    guardia.ejecutar(() => Promise.reject(new Error('422')));
    await new Promise((r) => setTimeout(r, 0));
    expect(guardia.ocupado).toBe(false);
  });
});
