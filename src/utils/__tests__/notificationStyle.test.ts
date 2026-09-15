import { Colors } from '@/constants/colors';
import { notificacionCumpleanos, notificacionDesconocida, notificacionItem } from '@/test/fixtures/backend';
import { notificationPalette, notificationStyle } from '../notificationStyle';

describe('notificationStyle', () => {
  it('usa el emoji del backend tal cual, sin catálogo propio de íconos', () => {
    expect(notificationStyle(notificacionItem).emoji).toBe('📝');
    expect(notificationStyle(notificacionCumpleanos).emoji).toBe('🎂');
  });

  it('traduce la paleta cerrada a tokens de la app, no al hexadecimal del backend', () => {
    expect(notificationStyle(notificacionItem).color).toBe(Colors.info);
    expect(notificationStyle(notificacionCumpleanos).color).toBe(Colors.celebration);
    // El backend manda '#ec4899' para celebración; la app usa su propio token.
    expect(notificationStyle(notificacionCumpleanos).color).not.toBe('#ec4899');
  });

  it('cubre los seis colores del catálogo del backend', () => {
    for (const color of ['success', 'info', 'warning', 'danger', 'celebracion', 'neutral'] as const) {
      const palette = notificationPalette(color);
      expect(palette.color).toBeDefined();
      expect(palette.background).toBeDefined();
    }
    expect(notificationPalette('success').color).toBe(Colors.success);
    expect(notificationPalette('danger').color).toBe(Colors.danger);
    expect(notificationPalette('warning').color).toBe(Colors.warning);
    expect(notificationPalette('neutral').color).toBe(Colors.neutral);
  });

  it('un tipo/color desconocido cae en 🔔 + neutral, nunca rompe', () => {
    const style = notificationStyle({ emoji: undefined, color: 'fucsia_futurista' });

    expect(style.emoji).toBe('🔔');
    expect(style.color).toBe(Colors.neutral);
  });

  it('respeta el emoji aunque el color sea desconocido', () => {
    expect(notificationStyle(notificacionDesconocida).emoji).toBe('🔔');
    expect(notificationStyle({ emoji: '🚀', color: 'nope' }).emoji).toBe('🚀');
  });

  it('un emoji vacío también cae en el de respaldo', () => {
    expect(notificationStyle({ emoji: '   ', color: 'info' }).emoji).toBe('🔔');
  });
});
