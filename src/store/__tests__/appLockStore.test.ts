import { useAppLockStore } from '../appLockStore';

const ORIGINAL_NOW = Date.now;

beforeEach(() => {
  useAppLockStore.setState({ isLocked: false, backgroundedAt: null });
  Date.now = ORIGINAL_NOW;
});

afterEach(() => {
  Date.now = ORIGINAL_NOW;
});

describe('appLockStore', () => {
  it('onForeground bloquea si el tiempo en background superó el umbral', () => {
    let now = 1_000_000;
    Date.now = () => now;

    useAppLockStore.getState().onBackground();
    now += 6 * 60_000; // 6 minutos
    useAppLockStore.getState().onForeground(5 * 60_000);

    expect(useAppLockStore.getState().isLocked).toBe(true);
    expect(useAppLockStore.getState().backgroundedAt).toBeNull();
  });

  it('onForeground NO bloquea si el tiempo en background fue menor al umbral', () => {
    let now = 1_000_000;
    Date.now = () => now;

    useAppLockStore.getState().onBackground();
    now += 2 * 60_000; // 2 minutos
    useAppLockStore.getState().onForeground(5 * 60_000);

    expect(useAppLockStore.getState().isLocked).toBe(false);
  });

  it('lock() fuerza el bloqueo (arranque en frío con sesión restaurada)', () => {
    useAppLockStore.getState().lock();
    expect(useAppLockStore.getState().isLocked).toBe(true);
  });

  it('unlock() libera el bloqueo', () => {
    useAppLockStore.getState().lock();
    useAppLockStore.getState().unlock();
    expect(useAppLockStore.getState().isLocked).toBe(false);
  });

  it('reset() limpia el bloqueo y el timestamp de background (logout)', () => {
    useAppLockStore.getState().onBackground();
    useAppLockStore.getState().lock();
    useAppLockStore.getState().reset();
    expect(useAppLockStore.getState()).toMatchObject({ isLocked: false, backgroundedAt: null });
  });
});
