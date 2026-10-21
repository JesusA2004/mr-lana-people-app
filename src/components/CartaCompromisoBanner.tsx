import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { TarjetaAviso } from './ui';

import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useCartaCompromisoBannerStore } from '@/store/cartaCompromisoBannerStore';
import { useEstilos } from '@/theme/ThemeProvider';
import { debeMostrarBannerCarta, tituloBannerCarta } from '@/utils/cartaCompromiso';
import { formatDateLong } from '@/utils/dates';

/**
 * Recordatorio en Inicio mientras la carta compromiso está vigente:
 * «Tienes 2 documentos pendientes — te quedan 5 días». Lleva a
 * `/documentos-pendientes`. «Ocultar por ahora» lo quita solo en esta sesión
 * (vuelve al reabrir la app). Los datos vienen de `/me`
 * (`carta_compromiso`, `bloqueo_documentos`).
 */
export function CartaCompromisoBanner() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const carta = useAuthStore((state) => state.user?.carta_compromiso ?? null);
  const bloqueo = useAuthStore((state) => state.user?.bloqueo_documentos ?? null);
  const ocultoFolio = useCartaCompromisoBannerStore((state) => state.ocultoFolio);
  const ocultar = useCartaCompromisoBannerStore((state) => state.ocultar);

  if (!debeMostrarBannerCarta(carta, bloqueo) || ocultoFolio === carta.folio) return null;

  const fecha = formatDateLong(carta.fecha_limite) || carta.fecha_limite;

  return (
    <TarjetaAviso
      icono="document-attach-outline"
      tono="aviso"
      titulo={tituloBannerCarta(bloqueo?.pendientes, carta.dias_restantes)}
      mensaje={`Carta compromiso ${carta.folio} · vence el ${fecha}.`}
      accion="Subir mis documentos"
      onPress={() => router.push('/documentos-pendientes')}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ocultar este aviso por ahora"
        hitSlop={8}
        onPress={() => ocultar(carta.folio)}
        style={({ pressed }) => [styles.ocultar, pressed ? styles.presionado : null]}>
        <Text style={styles.ocultarTexto}>Ocultar por ahora</Text>
      </Pressable>
    </TarjetaAviso>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    ocultar: { alignSelf: 'flex-start', paddingVertical: Spacing.xs },
    ocultarTexto: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted, textDecorationLine: 'underline' },
    presionado: { opacity: 0.6 },
  });
