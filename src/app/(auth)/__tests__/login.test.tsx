import React, { act } from 'react';
import TestRenderer, { type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';

/**
 * UX del login (sección 19): "Siguiente" en Usuario enfoca Contraseña,
 * "Listo" en Contraseña dispara el submit. Se verifica con el componente
 * real; `Input` se sustituye por un doble que expone `focus()` (igual que el
 * `forwardRef` real reenvía al TextInput interno) para poder aseverarlo.
 */

const mockLogin = jest.fn<Promise<void>, [string, string]>().mockResolvedValue(undefined);
const mockPush = jest.fn();

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { login: typeof mockLogin; user: null }) => unknown) => selector({ login: mockLogin, user: null }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));

// Doble de Input: reenvía su ref a un objeto con `focus()` espía (por label),
// tal como el Input real reenvía al TextInput interno via forwardRef.
jest.mock('@/components/Input', () => {
  const ReactMock = require('react');
  return {
    Input: ReactMock.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const store = (globalThis as Record<string, unknown>).__focusSpies as Record<string, jest.Mock> | undefined ?? ((globalThis as Record<string, unknown>).__focusSpies = {} as Record<string, jest.Mock>);
      const label = String(props.label);
      const spy = store[label] ?? (store[label] = jest.fn());
      ReactMock.useImperativeHandle(ref, () => ({ focus: spy }), [spy]);
      return ReactMock.createElement('Input', props);
    }),
  };
});
jest.mock('@/components/Button', () => ({ Button: (props: Record<string, unknown>) => require('react').createElement('Button', props) }));

function focusSpies(): Record<string, jest.Mock> {
  return ((globalThis as Record<string, unknown>).__focusSpies as Record<string, jest.Mock>) ?? {};
}

function renderLogin(): ReactTestRenderer {
  const LoginScreen = require('../login').default as React.ComponentType;
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(LoginScreen));
  });
  return renderer;
}

function input(renderer: ReactTestRenderer, label: string): ReactTestInstance {
  const nodo = renderer.root.findAll((n) => (n.props as Record<string, unknown>)?.label === label)[0];
  if (!nodo) throw new Error(`No se encontró el Input "${label}"`);
  return nodo;
}

beforeEach(() => {
  mockLogin.mockClear();
  (globalThis as Record<string, unknown>).__focusSpies = {};
});

describe('login UX: foco y envío por teclado', () => {
  it('Usuario usa returnKeyType="next" y mantiene el teclado (submitBehavior="submit")', () => {
    const r = renderLogin();
    const usuario = input(r, 'Usuario');
    expect(usuario.props.returnKeyType).toBe('next');
    expect(usuario.props.submitBehavior).toBe('submit');
  });

  it('"Siguiente" en Usuario enfoca el campo Contraseña', () => {
    const r = renderLogin();
    act(() => {
      input(r, 'Usuario').props.onSubmitEditing();
    });
    expect(focusSpies()['Contraseña']).toHaveBeenCalledTimes(1);
  });

  it('Contraseña es segura, con toggle y returnKeyType="done"', () => {
    const r = renderLogin();
    const pass = input(r, 'Contraseña');
    expect(pass.props.secureTextEntry).toBe(true);
    expect(pass.props.secureToggle).toBe(true);
    expect(pass.props.returnKeyType).toBe('done');
    expect(pass.props.textContentType).toBe('password');
  });

  it('"Listo" en Contraseña envía el formulario con usuario normalizado y contraseña', async () => {
    const r = renderLogin();
    await act(async () => {
      input(r, 'Usuario').props.onChangeText('  Ana   Lopez  ');
    });
    await act(async () => {
      input(r, 'Contraseña').props.onChangeText('secreta123');
    });
    await act(async () => {
      await input(r, 'Contraseña').props.onSubmitEditing();
    });
    expect(mockLogin).toHaveBeenCalledWith('Ana Lopez', 'secreta123');
  });

  it('no envía con campos vacíos (validación zod)', async () => {
    const r = renderLogin();
    await act(async () => {
      await input(r, 'Contraseña').props.onSubmitEditing();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
