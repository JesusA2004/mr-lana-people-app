import { crearLimitador } from '@/utils/limitadorConcurrencia';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('crearLimitador (descargas de fotos)', () => {
  it('nunca deja correr más del máximo y atiende la cola en orden FIFO', async () => {
    const limitador = crearLimitador(2);
    const orden: number[] = [];
    const liberaciones: (() => void)[] = [];

    for (let i = 1; i <= 5; i += 1) {
      void limitador.adquirir().then((liberar) => {
        orden.push(i);
        liberaciones.push(liberar);
      });
    }
    await tick();
    expect(orden).toEqual([1, 2]);
    expect(limitador.activos).toBe(2);
    expect(limitador.enCola).toBe(3);

    liberaciones[0]?.();
    await tick();
    expect(orden).toEqual([1, 2, 3]);
    expect(limitador.activos).toBe(2);

    liberaciones[1]?.();
    liberaciones[2]?.();
    await tick();
    expect(orden).toEqual([1, 2, 3, 4, 5]);
    expect(limitador.enCola).toBe(0);
  });

  it('liberar dos veces no regala un cupo extra', async () => {
    const limitador = crearLimitador(1);
    const liberar = await limitador.adquirir();
    liberar();
    liberar();
    expect(limitador.activos).toBe(0);
    await limitador.adquirir();
    let segundo = false;
    void limitador.adquirir().then(() => {
      segundo = true;
    });
    await tick();
    expect(segundo).toBe(false);
    expect(limitador.activos).toBe(1);
    expect(limitador.enCola).toBe(1);
  });

  it('abortar mientras espera saca de la cola sin ocupar cupo', async () => {
    const limitador = crearLimitador(1);
    const liberar = await limitador.adquirir();
    const controller = new AbortController();
    const esperando = limitador.adquirir(controller.signal);
    expect(limitador.enCola).toBe(1);

    controller.abort();
    await expect(esperando).rejects.toMatchObject({ name: 'AbortError' });
    expect(limitador.enCola).toBe(0);

    liberar();
    expect(limitador.activos).toBe(0);
  });

  it('una señal ya abortada rechaza de inmediato', async () => {
    const limitador = crearLimitador(4);
    const controller = new AbortController();
    controller.abort();
    await expect(limitador.adquirir(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(limitador.activos).toBe(0);
  });
});
