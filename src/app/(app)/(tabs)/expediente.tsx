import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';

const CATEGORIES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'card-outline', label: 'Identificación oficial' },
  { icon: 'document-text-outline', label: 'CURP y RFC' },
  { icon: 'medkit-outline', label: 'NSS (IMSS)' },
  { icon: 'home-outline', label: 'Comprobante de domicilio' },
  { icon: 'people-outline', label: 'Acta de nacimiento' },
  { icon: 'card-outline', label: 'Estado de cuenta bancario' },
];

/**
 * Estado de avance (AGENTS.md sección 15-19 y 40): el backend real
 * (App\Services\Expedientes\ExpedienteService) SÍ calcula el expediente
 * digital, pero solo está expuesto a RH en la web — no existe todavía un
 * endpoint /api/v1/colaborador/expediente ni de carga de documentos para la
 * app móvil (ver docs/MOBILE_BACKEND_REQUIREMENTS.md, P0). Esta pantalla
 * comunica el estado real de la función en vez de simular datos o permitir
 * una carga que no llegaría a ningún lado.
 */
export default function ExpedienteScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AppHeader title="Mi expediente" />

      <ScrollView contentContainerStyle={styles.content}>
        <FadeInView index={0}>
          <MascotAssistant message={MascotMessages.expedienteProximamente} type="tip" dismissible={false} size="lg" />
        </FadeInView>

        <FadeInView index={1}>
          <Card style={styles.statusCard}>
            <View style={styles.statusIcon}>
              <Ionicons name="construct-outline" size={22} color={Colors.warning} />
            </View>
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>Función en desarrollo</Text>
              <Text style={styles.statusCaption}>
                La carga de documentos desde la app llegará en una próxima actualización.
              </Text>
            </View>
          </Card>
        </FadeInView>

        <Text style={styles.sectionTitle}>Documentos que integran tu expediente</Text>
        <Card>
          {CATEGORIES.map((category, index) => (
            <View key={category.label} style={[styles.row, index === CATEGORIES.length - 1 && styles.rowLast]}>
              <View style={styles.rowIcon}>
                <Ionicons name={category.icon} size={16} color={Colors.textMuted} />
              </View>
              <Text style={styles.rowLabel}>{category.label}</Text>
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>RH</Text>
              </View>
            </View>
          ))}
        </Card>
        <Text style={styles.footnote}>
          Por ahora, Recursos Humanos gestiona la carga y validación de estos documentos. Puedes usar “Reposición
          documental” en Nueva solicitud si necesitas apoyo con alguno de ellos.
        </Text>

        <View style={{ height: Spacing.xl }} />

        <MascotAssistant
          message="¿Tienes dudas sobre tu expediente?"
          type="info"
          actionLabel="Ver ayuda"
          onAction={() => router.push('/ayuda')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.warningSoft,
    borderColor: Colors.warningSoft,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  statusCaption: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  pendingPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutralSoft,
  },
  pendingPillText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  footnote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
