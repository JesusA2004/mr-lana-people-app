import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Spacing } from '@/constants/colors';
import type { FlujoAprobacion } from '@/types/aprobaciones';
import { etiquetasAccion, modoAcciones } from '@/utils/flujoAprobacion';

export interface BotonesAprobacionProps {
  flujo: FlujoAprobacion;
  tipo: string;
  ocupado?: boolean;
  /** Sin conexión: nada se decide offline. */
  offline?: boolean;
  aprobando?: boolean;
  onAprobar: () => void;
  onRechazar: () => void;
  onRevisarDetalle: () => void;
}

/**
 * Botones GRANDES de la barra inferior de una aprobación. Solo se activan si
 * el backend dice que la cuenta puede actuar AHORA
 * (`puede_actuar_usuario_actual`); si no, «Aprobar» se ve deshabilitado y la
 * nota de la barra (`motivoSinTurno`) explica por qué.
 */
export function BotonesAprobacion({ flujo, tipo, ocupado = false, offline = false, aprobando = false, onAprobar, onRechazar, onRevisarDetalle }: BotonesAprobacionProps) {
  const modo = modoAcciones(flujo, tipo);
  const etiquetas = etiquetasAccion(flujo.accion_usuario_actual);

  if (modo === 'sin_turno') {
    return <Button title="Aprobar" leftIcon="lock-closed-outline" disabled onPress={() => undefined} />;
  }

  if (modo === 'revisar_detalle') {
    return <Button title={etiquetas.aprobar === 'Aprobar' ? 'Revisar y decidir' : etiquetas.aprobar} leftIcon="open-outline" disabled={offline} onPress={onRevisarDetalle} />;
  }

  return (
    <View style={styles.fila}>
      <Button title={etiquetas.rechazar} variant="outline" leftIcon="close" disabled={ocupado || offline} onPress={onRechazar} style={styles.flex} />
      <Button title={etiquetas.aprobar} leftIcon="checkmark" loading={aprobando} disabled={ocupado || offline} onPress={onAprobar} style={styles.flex} />
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
