import { Image } from 'expo-image';
import { Platform } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { WebView } from 'react-native-webview';

import { PdfViewer } from '../PdfViewer';
import { SecureDocumentViewer } from '../SecureDocumentViewer';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- los mocks oficiales se cargan con require dentro de jest.mock.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- idem.
jest.mock('expo-file-system', () => require('@/test/fakeFileSystem').fakeExpoFileSystem);
jest.mock('expo-screen-capture', () => ({ preventScreenCaptureAsync: jest.fn(async () => undefined), allowScreenCaptureAsync: jest.fn(async () => undefined) }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@/store/authStore', () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({ token: 'tkn', expirarSesion: jest.fn() }) }));

function montar(element: React.ReactElement): ReactTestRenderer {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = renderer.create(element);
  });
  return arbol;
}

afterEach(() => {
  Platform.OS = 'ios';
});

describe('imagen confidencial', () => {
  it('no se guarda en la caché de expo-image', () => {
    const arbol = montar(<SecureDocumentViewer title="INE" onClose={() => {}} archivoLocal={{ uri: 'file:///cache/mrlana-doc-1.png', tipo: 'png' }} />);
    expect(arbol.root.findByType(Image).props.cachePolicy).toBe('none');
  });
});

describe('PDF en iOS', () => {
  const visor = () => montar(<PdfViewer fileUri="file:///cache/mrlana-doc-1.pdf" />).root.findByType(WebView);

  it('sin selección, sin menú de copiar o compartir y sin vista previa de enlaces', () => {
    const { props } = visor();
    expect(props.textInteractionEnabled).toBe(false);
    expect(props.suppressMenuItems).toEqual(expect.arrayContaining(['copy', 'share', 'select', 'selectAll', 'lookup', 'translate']));
    expect(props.allowsLinkPreview).toBe(false);
    expect(props.cacheEnabled).toBe(false);
  });

  it('un enlace del PDF no navega ni abre otra app; el archivo local sí carga', () => {
    const { props } = visor();
    // La lista blanca debe admitir todo: lo que no pasa por ella se entrega a `Linking.openURL`.
    expect(props.originWhitelist).toEqual(['*']);
    expect(props.onShouldStartLoadWithRequest({ url: 'file:///cache/mrlana-doc-1.pdf' })).toBe(true);
    expect(props.onShouldStartLoadWithRequest({ url: 'https://example.com/' })).toBe(false);
    expect(props.onShouldStartLoadWithRequest({ url: 'mailto:rh@example.com' })).toBe(false);
  });
});
