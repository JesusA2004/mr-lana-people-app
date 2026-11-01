import { AxiosError, type AxiosResponse } from 'axios';
import { Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { Screen } from '../Screen';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- los mocks oficiales se cargan con require dentro de jest.mock.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), canGoBack: () => true }) }));
jest.mock('@/components/AppHeader', () => ({ AppHeader: () => null }));

const httpError = (status: number) => new AxiosError(`HTTP ${status}`, 'ERR', undefined, undefined, { status, data: {}, statusText: '', headers: {}, config: {} } as AxiosResponse);
const red = new AxiosError('Network Error', 'ERR_NETWORK');

function textos(error: unknown, hayDatos: boolean): string {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = renderer.create(
      <Screen title="X" error={error} hayDatos={hayDatos} onRetry={() => undefined}>
        <Text>Datos cargados</Text>
      </Screen>,
    );
  });
  return arbol.root.findAllByType(Text).map((t) => t.props.children).flat().join(' | ');
}

describe('<Screen /> ante errores', () => {
  it('refresco fallido por red: conserva los datos y avisa', () => {
    const t = textos(red, true);
    expect(t).toContain('Datos cargados');
    expect(t).toContain('No pudimos actualizar');
  });

  it('5xx con datos: los conserva', () => {
    expect(textos(httpError(500), true)).toContain('Datos cargados');
  });

  it('sin datos: pantalla de error, nunca un vacío', () => {
    const t = textos(red, false);
    expect(t).not.toContain('Datos cargados');
    expect(t).toContain('Algo salió mal');
  });

  it('403 o 404 con datos viejos: ya no se muestran', () => {
    expect(textos(httpError(403), true)).not.toContain('Datos cargados');
    expect(textos(httpError(404), true)).not.toContain('Datos cargados');
  });
});
