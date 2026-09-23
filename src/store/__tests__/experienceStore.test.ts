/**
 * Cold start por push de Gestión RH: `openPushTarget` fija la experiencia
 * mientras `load()` todavía lee SecureStore. El valor persistido que llega
 * DESPUÉS no debe pisar la elección del push (bug corregido con
 * `explicitSelection`).
 */
import { useExperienceStore } from '../experienceStore';

const mockSecure = new Map<string, string>();
let mockPendingRead: ((value: string | null) => void) | null = null;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(
    () =>
      new Promise<string | null>((resolve) => {
        mockPendingRead = resolve;
      }),
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecure.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecure.delete(key);
  }),
}));

beforeEach(() => {
  mockSecure.clear();
  mockPendingRead = null;
  useExperienceStore.setState({ isLoading: true, experience: null });
});

describe('experienceStore', () => {
  it('load() normal restaura la experiencia persistida', async () => {
    const loading = useExperienceStore.getState().load();
    mockPendingRead?.('rh');
    await loading;
    expect(useExperienceStore.getState()).toMatchObject({ experience: 'rh', isLoading: false });
  });

  it('cold start: un push RH elige "rh" ANTES de que termine load() y el valor viejo no lo pisa', async () => {
    const loading = useExperienceStore.getState().load();
    // El push llega mientras SecureStore sigue leyendo.
    await useExperienceStore.getState().setExperience('rh');
    // SecureStore responde tarde con la experiencia anterior.
    mockPendingRead?.('colaborador');
    await loading;

    expect(useExperienceStore.getState().experience).toBe('rh');
    expect(useExperienceStore.getState().isLoading).toBe(false);
  });

  it('logout durante load(): la lectura en vuelo de la cuenta anterior no restaura su experiencia', async () => {
    const loading = useExperienceStore.getState().load();
    await useExperienceStore.getState().reset();
    mockPendingRead?.('rh');
    await loading;
    expect(useExperienceStore.getState().experience).toBeNull();
  });

  it('un valor persistido inválido se ignora', async () => {
    const loading = useExperienceStore.getState().load();
    mockPendingRead?.('admin');
    await loading;
    expect(useExperienceStore.getState().experience).toBeNull();
  });
});
