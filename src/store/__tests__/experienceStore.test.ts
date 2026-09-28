/**
 * Cold start por push de Gestión RH: `openPushTarget` fija la experiencia
 * mientras `load()` todavía lee SecureStore. El valor persistido que llega
 * DESPUÉS no debe pisar la elección del push (bug corregido con
 * `explicitSelection`). También cubre el esquema por cuenta
 * (`mrlana-experience:{userId}`) y la migración desde la llave global
 * anterior (`mrlana-experience`, sin sufijo).
 */
import { useExperienceStore } from '../experienceStore';

const mockSecure = new Map<string, string>();
const pendingReads: { key: string; resolve: (value: string | null) => void }[] = [];

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(
    (key: string) =>
      new Promise<string | null>((resolve) => {
        pendingReads.push({ key, resolve });
      }),
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecure.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecure.delete(key);
  }),
}));

function resolveRead(key: string, value: string | null) {
  const index = pendingReads.findIndex((read) => read.key === key);
  if (index === -1) throw new Error(`No hay lectura pendiente para "${key}"`);
  const [read] = pendingReads.splice(index, 1);
  read.resolve(value);
}

beforeEach(() => {
  mockSecure.clear();
  pendingReads.length = 0;
  useExperienceStore.setState({ isLoading: true, experience: null, userId: null });
});

describe('experienceStore (experiencia por cuenta)', () => {
  it('userId null limpia el estado sin leer nada', async () => {
    await useExperienceStore.getState().load(null);
    expect(useExperienceStore.getState()).toMatchObject({ experience: null, isLoading: false, userId: null });
    expect(pendingReads.length).toBe(0);
  });

  it('load(userId) restaura la experiencia persistida de esa cuenta', async () => {
    const loading = useExperienceStore.getState().load('user-A');
    resolveRead('mrlana-experience:user-A', 'rh');
    await loading;
    expect(useExperienceStore.getState()).toMatchObject({ experience: 'rh', isLoading: false, userId: 'user-A' });
  });

  it('cold start: un push RH elige "rh" ANTES de que termine load() y el valor viejo no lo pisa', async () => {
    const loading = useExperienceStore.getState().load('user-A');
    await useExperienceStore.getState().setExperience('rh');
    resolveRead('mrlana-experience:user-A', 'colaborador');
    await loading;

    expect(useExperienceStore.getState().experience).toBe('rh');
    expect(useExperienceStore.getState().isLoading).toBe(false);
  });

  it('cambiar de cuenta mientras la lectura anterior sigue en vuelo no restaura la experiencia de la cuenta previa', async () => {
    const loadingA = useExperienceStore.getState().load('user-A');
    const loadingB = useExperienceStore.getState().load('user-B');

    // B responde primero (sin nada persistido todavía para esa cuenta).
    resolveRead('mrlana-experience:user-B', 'colaborador');
    // A responde tarde con un valor distinto: no debe pisar a B.
    resolveRead('mrlana-experience:user-A', 'rh');
    await Promise.all([loadingA, loadingB]);

    expect(useExperienceStore.getState().userId).toBe('user-B');
    expect(useExperienceStore.getState().experience).toBe('colaborador');
  });

  it('un valor persistido inválido se ignora', async () => {
    const loading = useExperienceStore.getState().load('user-A');
    resolveRead('mrlana-experience:user-A', 'admin');
    await loading;
    expect(useExperienceStore.getState().experience).toBeNull();
  });

  it('setExperience persiste bajo la llave de la cuenta activa', async () => {
    const loading = useExperienceStore.getState().load('user-A');
    // Un valor ya persistido evita la rama de migración (que haría una
    // segunda lectura, de la llave global) — no es lo que este test cubre.
    resolveRead('mrlana-experience:user-A', 'colaborador');
    await loading;

    await useExperienceStore.getState().setExperience('rh');
    expect(mockSecure.get('mrlana-experience:user-A')).toBe('rh');
  });

  it('migra la preferencia global del esquema anterior a la primera cuenta que la lee, y borra la llave global', async () => {
    const loading = useExperienceStore.getState().load('user-A');
    resolveRead('mrlana-experience:user-A', null);
    // Deja correr el microtask que dispara la lectura de la llave global antigua.
    await Promise.resolve();
    resolveRead('mrlana-experience', 'rh');
    await loading;

    expect(useExperienceStore.getState().experience).toBe('rh');
    expect(mockSecure.get('mrlana-experience:user-A')).toBe('rh');
    expect(mockSecure.has('mrlana-experience')).toBe(false);
  });

  it('la migración no se repite para una segunda cuenta una vez que la llave global ya se borró', async () => {
    const loadingA = useExperienceStore.getState().load('user-A');
    resolveRead('mrlana-experience:user-A', null);
    await Promise.resolve();
    resolveRead('mrlana-experience', 'rh');
    await loadingA;
    expect(mockSecure.has('mrlana-experience')).toBe(false);

    const loadingB = useExperienceStore.getState().load('user-B');
    resolveRead('mrlana-experience:user-B', null);
    await Promise.resolve();
    resolveRead('mrlana-experience', null);
    await loadingB;

    expect(useExperienceStore.getState().experience).toBeNull();
  });
});
