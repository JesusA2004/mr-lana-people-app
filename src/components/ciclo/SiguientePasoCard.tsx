import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice } from '@/components/ciclo/Screen';
import { TransicionEstado } from '@/components/TransicionEstado';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { SiguientePaso } from '@/types/siguientePaso';
import { openRhWeb } from '@/utils/openRhWeb';

const ICONO = { accion: 'arrow-forward-circle-outline', espera: 'time-outline', terminado: 'checkmark-circle-outline' } as const;

/**
 * Qué sigue en el proceso, tal como lo calcula el backend. Solo informa: lo que
 * se hace en la app sigue en sus botones de `acciones_permitidas`, y con
 * `solo_web` se dice que se completa en el portal.
 */
export function SiguientePasoCard({ paso }: { paso: SiguientePaso | null | undefined }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  if (!paso) return null;
  const { accion } = paso;

  return (
    <TransicionEstado estado={`${paso.tipo}-${accion?.clave ?? ''}`}>
      <Card style={styles.card}>
        <View style={styles.fila}>
          <Ionicons name={ICONO[paso.tipo]} size={20} color={paso.tipo === 'terminado' ? Colors.success : Colors.primaryDark} />
          <Text style={styles.titulo} accessibilityRole="header">
            {accion?.etiqueta ?? (paso.tipo === 'terminado' ? 'Proceso terminado' : 'Siguiente paso')}
          </Text>
        </View>
        {paso.mensaje ? <Text style={styles.texto}>{paso.mensaje}</Text> : null}
        {paso.responsable && paso.tipo !== 'terminado' ? <Text style={styles.meta}>Responsable: {paso.responsable}</Text> : null}
        {paso.bloqueos.map((bloqueo, index) => (
          <Notice key={index} tone="warning">
            {bloqueo}
          </Notice>
        ))}
        {accion?.solo_web ? (
          <>
            <Text style={styles.meta}>Se completa en la web.</Text>
            {accion.href ? <Button title="Abrir en el Portal Web" variant="outline" leftIcon="open-outline" onPress={() => void openRhWeb(accion.href as string)} /> : null}
          </>
        ) : null}
      </Card>
    </TransicionEstado>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    card: { gap: Spacing.sm },
    fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    titulo: { flex: 1, fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    texto: { fontSize: FontSize.sm, lineHeight: 20, color: Colors.text },
    meta: { fontSize: FontSize.sm, color: Colors.textMuted },
  });
