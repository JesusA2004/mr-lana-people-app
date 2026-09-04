import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';

import { Colors, FontSize, Spacing } from '@/constants/colors';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  /** Detalle técnico (método/URL/status) — pásalo solo desde `getDevErrorDetail()`; nunca se muestra fuera de DEV. */
  devDetail?: string;
}

export function ErrorState({ message = 'Ocurrió un error inesperado.', onRetry, devDetail }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons name="alert-circle-outline" size={32} color={Colors.danger} />
      </View>
      <Text style={styles.title}>Algo salió mal</Text>
      <Text style={styles.message}>{message}</Text>
      {__DEV__ && devDetail ? <Text style={styles.devDetail}>{devDetail}</Text> : null}
      {onRetry ? (
        <Button title="Reintentar" onPress={onRetry} variant="outline" fullWidth={false} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  devDetail: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontFamily: 'monospace',
  },
  action: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
});
