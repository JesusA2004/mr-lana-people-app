import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhColaborador } from '@/hooks/queries/useRhColaboradores';
import { getErrorMessage } from '@/utils/errors';

/** Perfil básico del directorio RH (AGENTS.md sección 13) — nunca inventa expediente aquí; eso vive en `rh/expedientes`. */
export default function RhColaboradorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: colaborador, isLoading, isError, error, refetch, isRefetching } = useRhColaborador(id);

  return (
    <View style={styles.container}>
      <AppHeader title={colaborador?.nombre ?? 'Colaborador'} showBack onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={160} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !colaborador ? null : (
          <>
            <Card style={styles.headerCard}>
              <ProfileAvatar name={colaborador.nombre} size={80} />
              <Text style={styles.name}>{colaborador.nombre}</Text>
              {colaborador.puesto ? <Text style={styles.role}>{colaborador.puesto}</Text> : null}
              {colaborador.sucursal || colaborador.departamento ? (
                <Text style={styles.meta}>{[colaborador.sucursal, colaborador.departamento].filter(Boolean).join(' · ')}</Text>
              ) : null}
              {colaborador.numero_empleado ? <Text style={styles.meta}>N.º {colaborador.numero_empleado}</Text> : null}
              {colaborador.estatus ? <StatusBadge status={colaborador.estatus} /> : null}
            </Card>

            <View style={styles.countRow}>
              <CountTile icon="document-text-outline" label="Solicitudes" value={colaborador.solicitudes_pendientes} />
              <CountTile icon="airplane-outline" label="Vacaciones" value={colaborador.vacaciones_pendientes} />
              <CountTile icon="folder-open-outline" label="Documentos" value={colaborador.documentos_pendientes} />
            </View>

            <Button
              title="Ver expediente"
              leftIcon="folder-open-outline"
              variant="outline"
              onPress={() => router.push(`/(app)/rh/expedientes/${id}` as never)}
            />

            {/* "Generar documento" deliberadamente NO existe aquí: el backend
                real solo expone catálogo + descarga de formatos ya
                generados — preparar/generar/preview siguen solo en el panel
                web (ver docs/BACKEND_GAPS_FINAL.md). El wizard queda
                implementado en rh/formatos/generar.tsx pero sin ningún
                punto de entrada alcanzable desde la navegación normal. */}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CountTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: number }) {
  return (
    <View style={styles.countTile}>
      <Ionicons name={icon} size={18} color={Colors.primaryDark} />
      <Text style={styles.countValue}>{value ?? 0}</Text>
      <Text style={styles.countLabel}>{label}</Text>
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
  headerCard: {
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  role: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  countRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  countTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  countValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  countLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
  },
});
