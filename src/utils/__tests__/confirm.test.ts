import { Alert } from 'react-native';

import { confirmAction } from '../confirm';

type Btn = { text: string; onPress?: () => void };

describe('confirmAction', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(Alert, 'alert');
  });
  afterEach(() => spy.mockRestore());

  it('resuelve true solo al tocar el botón de confirmar', async () => {
    spy.mockImplementation((_t: string, _m: string, buttons: Btn[]) => buttons[1].onPress?.());
    await expect(confirmAction({ title: 'Solicitar cambio', message: 'm', confirmLabel: 'Solicitar cambio' })).resolves.toBe(true);
    expect(spy.mock.calls[0][2][1].text).toBe('Solicitar cambio');
  });

  it('cancelar resuelve false', async () => {
    spy.mockImplementation((_t: string, _m: string, buttons: Btn[]) => buttons[0].onPress?.());
    await expect(confirmAction({ title: 't', message: 'm', confirmLabel: 'Ok' })).resolves.toBe(false);
  });

  it('cerrar el diálogo (Android: atrás / tocar fuera) cuenta como cancelar', async () => {
    spy.mockImplementation((_t: string, _m: string, _b: Btn[], options: { onDismiss?: () => void }) => options.onDismiss?.());
    await expect(confirmAction({ title: 't', message: 'm', confirmLabel: 'Ok' })).resolves.toBe(false);
  });

  it('acción destructiva usa estilo destructive', async () => {
    spy.mockImplementation((_t: string, _m: string, buttons: (Btn & { style?: string })[]) => {
      expect(buttons[1].style).toBe('destructive');
      buttons[0].onPress?.();
    });
    await confirmAction({ title: 't', message: 'm', confirmLabel: 'Borrar', destructive: true });
  });
});
