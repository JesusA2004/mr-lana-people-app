import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MotivoModal } from '@/components/MotivoModal';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { FontSize, Layout, Spacing, type ColorPalette } from '@/constants/colors';
import { useRevisarCambioFoto, useRhCambiosFoto } from '@/hooks/queries/useRhCambiosFoto';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { RhCambioFoto } from '@/types/rh';
import { formatDateTime } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/**
 * Cambios de foto de perfil por revisar (RH / gerentes con
 * `expedientes.revisar`): foto actual junto a la propuesta, aprobar o
 * rechazar con motivo. La foto actual sigue siendo la oficial hasta aprobar.
 */
export default function RhCambiosFotoScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { data, isLoading, isError, error, refetch, isRefetching } = useRhCambiosFoto();
  const revisar = useRevisarCambioFoto();
  const [rechazando, setRechazando] = useState<RhCambioFoto | null>(null);

  const ejecutar = (cambio: RhCambioFoto, accion: 'aprobar' | 'rechazar', motivo?: string) => {
    revisar.mutate(
      { id: cambio.id, accion, motivo },
      {
        onSuccess: () => {
          haptics.success();
          toast.success(accion === 'aprobar' ? 'Foto aprobada: ya es la oficial.' : 'Cambio rechazado. Se avisó al colaborador.');
          setRechazando(null);
        },
        onError: (e) => {
          haptics.error();
          toast.error(getErrorMessage(e));
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Cambios de foto" showBack onBackPress={() => router.back()} />

      {isLoading ? (
        <View style={styles.content}>
          <SkeletonCardList />
        </View>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState icon="image-outline" title="Sin cambios por revisar" message="Cuando alguien pida cambiar su foto aparecerá aquí." />}
          renderItem={({ item, index }) => (
            <FadeInView index={index}>
              <Card style={styles.card}>
                <Text style={styles.nombre}>{item.colaborador.nombre}</Text>
                <Text style={styles.meta}>{[item.colaborador.puesto, item.colaborador.sucursal].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.meta}>Solicitado {formatDateTime(item.solicitada_en)}</Text>

                <View style={styles.fotos}>
                  <View style={styles.foto}>
                    <ProfileAvatar name={item.colaborador.nombre} fotoUrlApi={item.foto_actual_url} size={96} />
                    <Text style={styles.fotoEtiqueta}>Actual</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={Colors.textMuted} />
                  <View style={styles.foto}>
                    <Image
                      source={{ uri: item.foto_propuesta_url, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
                      style={styles.propuesta}
                      accessibilityLabel={`Foto propuesta de ${item.colaborador.nombre}`}
                    />
                    <Text style={[styles.fotoEtiqueta, { color: Colors.primaryDark, fontWeight: '700' }]}>Propuesta</Text>
                  </View>
                </View>

                <View style={styles.acciones}>
                  <Button title="Rechazar" variant="outline" onPress={() => setRechazando(item)} disabled={revisar.isPending} style={{ flex: 1 }} />
                  <Button title="Aprobar" onPress={() => ejecutar(item, 'aprobar')} loading={revisar.isPending && revisar.variables?.id === item.id && revisar.variables?.accion === 'aprobar'} disabled={revisar.isPending} style={{ flex: 1 }} />
                </View>
              </Card>
            </FadeInView>
          )}
        />
      )}

      <MotivoModal
        visible={rechazando !== null}
        title="Rechazar cambio de foto"
        description="La foto actual se conserva. El motivo se le envía al colaborador."
        confirmLabel="Rechazar"
        submitting={revisar.isPending}
        onCancel={() => setRechazando(null)}
        onConfirm={(motivo) => rechazando && ejecutar(rechazando, 'rechazar', motivo)}
      />
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Spacing.lg, gap: Spacing.md, maxWidth: Layout.maxContentWidth, width: '100%', alignSelf: 'center' },
    card: { gap: Spacing.sm },
    nombre: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    meta: { fontSize: FontSize.sm, color: Colors.textMuted },
    fotos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, marginVertical: Spacing.sm },
    foto: { alignItems: 'center', gap: Spacing.xs },
    propuesta: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.surfaceMuted, borderWidth: 2.5, borderColor: Colors.primary },
    fotoEtiqueta: { fontSize: FontSize.xs, color: Colors.textMuted },
    acciones: { flexDirection: 'row', gap: Spacing.sm },
  });
