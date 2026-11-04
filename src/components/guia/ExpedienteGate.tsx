import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useBloqueoExpediente, useGuia } from '@/hooks/queries/useGuia';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { EstadoExpedienteIncompleto, PasoGuia } from '@/types/guia';
import { rutaDePaso } from '@/utils/guia';

/**
 * Pantalla del «modo completar expediente»: explica EXACTAMENTE qué falta
 * (motivos del backend, en listas) y lleva al siguiente paso. La regla y el
 * candado real están en el backend (423 «expediente_incompleto»); esto solo
 * evita mostrar una pantalla que fallaría.
 */
export function PantallaBloqueoExpediente({
  modulo,
  estado,
  siguiente,
  enTab = false,
}: {
  modulo: string;
  estado: EstadoExpedienteIncompleto;
  siguiente: PasoGuia | null;
  /** Pantalla de tab: encabezado sin «atrás». */
  enTab?: boolean;
}) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AppHeader title={modulo} showBack={!enTab} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.icono}>
          <Ionicons name="lock-closed-outline" size={32} color={Colors.warning} />
        </View>
        <Text style={styles.titulo} accessibilityRole="header">
          {modulo} está en pausa
        </Text>
        <Text style={styles.texto}>
          {estado.mensaje ?? 'Completa tu expediente para usar esta sección.'} En cuanto lo completes se activa sola; los documentos que ya subiste y
          Recursos Humanos está revisando no te detienen.
        </Text>

        {estado.motivos.map((motivo) => (
          <Card key={motivo.clave} style={styles.motivo}>
            <Text style={styles.motivoTitulo}>{motivo.titulo}</Text>
            {motivo.detalle.map((linea) => (
              <View key={linea} style={styles.item}>
                <Text style={styles.vineta}>•</Text>
                <Text style={styles.itemTexto}>{linea}</Text>
              </View>
            ))}
          </Card>
        ))}

        {siguiente?.accion ? (
          <Button
            title={`Siguiente: ${siguiente.titulo}`}
            rightIcon="arrow-forward"
            onPress={() => {
              if (siguiente.accion) router.push(rutaDePaso(siguiente.accion));
            }}
          />
        ) : null}
        <Button title="Ver todos mis pasos" variant="outline" leftIcon="list-outline" onPress={() => router.push('/siguiente-paso')} />
      </ScrollView>
    </View>
  );
}

/**
 * Envuelve una pantalla de autoservicio (solicitudes, vacaciones,
 * préstamos, recibos…): con el expediente incompleto muestra el bloqueo en
 * su lugar. Sin bloqueo (o backend anterior) pinta la pantalla tal cual.
 */
export function ExpedienteGate({ modulo, children, enTab = false }: { modulo: string; children: React.ReactNode; enTab?: boolean }) {
  const estado = useBloqueoExpediente();
  const guia = useGuia(estado.bloqueado);

  if (!estado.bloqueado) return <>{children}</>;
  return <PantallaBloqueoExpediente modulo={modulo} estado={estado} siguiente={guia.data?.siguiente ?? null} enTab={enTab} />;
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: {
      width: '100%',
      maxWidth: Layout.maxContentWidth,
      alignSelf: 'center',
      padding: Spacing.lg,
      gap: Spacing.md,
      paddingBottom: Spacing.xxxl,
    },
    icono: {
      alignSelf: 'center',
      width: 64,
      height: 64,
      borderRadius: Radius.full,
      backgroundColor: Colors.warningSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.lg,
    },
    titulo: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
    texto: { fontSize: FontSize.md, color: Colors.textMuted, lineHeight: 22, textAlign: 'center' },
    motivo: { gap: Spacing.xs },
    motivoTitulo: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    item: { flexDirection: 'row', gap: Spacing.xs },
    vineta: { fontSize: FontSize.sm, color: Colors.textMuted },
    itemTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
  });
