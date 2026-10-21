import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { BarraAccionInferior, desplazamientoConTeclado, MARGEN_BARRA_INFERIOR, paddingInferiorBarra } from '../BarraAccionInferior';
import { ESPACIO_SOBRE_TECLADO, offsetCampoActivo } from '../FormularioScroll';

const METRICAS = (bottom: number) => ({
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom },
});

function textos(arbol: ReactTestRenderer): string[] {
  return arbol.root.findAllByType(Text).map((nodo) => String(nodo.props.children));
}

describe('paddingInferiorBarra', () => {
  it('sin barra de navegación (inset 0) deja solo el margen: los botones quedan abajo', () => {
    expect(paddingInferiorBarra(0)).toBe(MARGEN_BARRA_INFERIOR);
  });

  it('con barra de navegación sube exactamente el inset más el margen', () => {
    expect(paddingInferiorBarra(48)).toBe(48 + MARGEN_BARRA_INFERIOR);
    expect(paddingInferiorBarra(34)).toBe(34 + MARGEN_BARRA_INFERIOR);
  });

  it('nunca usa un inset negativo', () => {
    expect(paddingInferiorBarra(-10)).toBe(MARGEN_BARRA_INFERIOR);
  });
});

describe('desplazamientoConTeclado', () => {
  it('con el teclado abierto baja el inset (ya queda bajo el teclado), sin hueco extra', () => {
    expect(desplazamientoConTeclado(48)).toBe(48);
    expect(desplazamientoConTeclado(0)).toBe(0);
    expect(desplazamientoConTeclado(-3)).toBe(0);
  });
});

describe('offsetCampoActivo', () => {
  it('sin barra inferior deja el campo un poco arriba del teclado', () => {
    expect(offsetCampoActivo(0)).toBe(ESPACIO_SOBRE_TECLADO);
  });

  it('con barra inferior el campo activo queda ARRIBA de la barra', () => {
    expect(offsetCampoActivo(96)).toBe(96 + ESPACIO_SOBRE_TECLADO);
  });
});

describe('<BarraAccionInferior />', () => {
  it('renderiza sus botones y la nota, con padding inferior según el safe area', () => {
    let arbol!: ReactTestRenderer;
    act(() => {
      arbol = renderer.create(
        <SafeAreaProvider initialMetrics={METRICAS(48)}>
          <BarraAccionInferior nota="Completa los campos obligatorios" testID="barra">
            <Text>Siguiente</Text>
          </BarraAccionInferior>
        </SafeAreaProvider>,
      );
    });

    expect(textos(arbol)).toEqual(expect.arrayContaining(['Completa los campos obligatorios', 'Siguiente']));

    // El primer nodo con testID es el propio componente; el que trae estilos es el View de la barra.
    const barra = arbol.root.findAll((n) => n.props.testID === 'barra' && n.props.style !== undefined)[0]!;
    const estilos = [barra.props.style].flat(Infinity).filter(Boolean) as { paddingBottom?: number }[];
    const padding = estilos.reduce<number | undefined>((acc, s) => (s.paddingBottom !== undefined ? s.paddingBottom : acc), undefined);
    expect(padding).toBe(48 + MARGEN_BARRA_INFERIOR);
  });

  it('sin nota solo muestra los botones', () => {
    let arbol!: ReactTestRenderer;
    act(() => {
      arbol = renderer.create(
        <SafeAreaProvider initialMetrics={METRICAS(0)}>
          <BarraAccionInferior fila>
            <Text>Atrás</Text>
            <Text>Guardar</Text>
          </BarraAccionInferior>
        </SafeAreaProvider>,
      );
    });

    expect(textos(arbol)).toEqual(['Atrás', 'Guardar']);
  });
});
