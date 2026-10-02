import { QUERIES_AGREGADAS, queryClient } from '../queryClient';

jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => jest.fn()) }));

describe('después de cualquier acción no quedan datos viejos', () => {
  afterEach(() => queryClient.clear());

  it('una mutación exitosa invalida mi-proceso, pendientes, bootstrap, avisos…', async () => {
    for (const key of QUERIES_AGREGADAS) {
      queryClient.setQueryData(key, { viejo: true });
    }
    queryClient.setQueryData(['perfil'], { ajeno: true });

    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: async () => 'ok' })
      .execute(undefined);

    for (const key of QUERIES_AGREGADAS) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    // Lo que no es agregado no se toca (sin refetch masivo innecesario).
    expect(queryClient.getQueryState(['perfil'])?.isInvalidated).toBe(false);
  });

  it('una mutación fallida no invalida nada', async () => {
    queryClient.setQueryData(['colaborador', 'mi-proceso'], { viejo: true });
    await expect(
      queryClient
        .getMutationCache()
        .build(queryClient, { mutationFn: async () => Promise.reject(new Error('422')) })
        .execute(undefined),
    ).rejects.toThrow('422');
    expect(queryClient.getQueryState(['colaborador', 'mi-proceso'])?.isInvalidated).toBe(false);
  });
});
