import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { RequestCard } from '@/components/RequestCard';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { useVacacionesSaldo, useVacacionesUnificadas } from '@/hooks/queries/useVacaciones';
import { formatDateLong } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';

/**
 * "Mis vacaciones" — experiencia dedicada sobre SOLICITUDES UNIFICADAS.
 *
 * La pantalla se conserva porque vacaciones merece su propio espacio (saldo,
 * próximas, historial), pero por debajo ya no existe un módulo aparte:
 *   - el saldo viene de `GET /vacaciones/saldo`, único consumo de lectura que
 *     queda del módulo legacy (ver `src/api/vacaciones.ts`);
 *   - la lista sale de `GET /solicitudes` filtrada por `tipo=vacaciones`;
 *   - "Solicitar vacaciones" abre el MISMO wizard unificado con
 *     `?tipo=vacaciones` — no hay un segundo formulario (secciones 2/3/49).
 */
export default function VacacionesScreen() {
  const router = useRouter();
  const saldoQuery = useVacacionesSaldo();
  const solicitudesQuery = useVacacionesUnificadas();

  const isLoading = saldoQuery.isLoading || solicitudesQuery.isLoading;
  const isError = saldoQuery.isError || solicitudesQuery.isError;
  const isRefetching = saldoQuery.isFetching || solicitudesQuery.isFetching;
  const errorMessage = saldoQuery.error
    ? getErrorMessage(saldoQuery.error)
    : solicitudesQuery.error
      ? getErrorMessage(solicitudesQuery.error)
      : undefined;

  const refetchAll = () => {
    void saldoQuery.refetch();
    void solicitudesQuery.refetch();
  };

  const saldo = saldoQuery.data;
  const { proximas, historial } = solicitudesQuery;

  const solicitar = () => router.push({ pathname: '/solicitud/nueva', params: { tipo: 'vacaciones' } });

  return (
    <View style={styles.container}>
      <AppHeader title="Mis vacaciones" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchAll} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={120} radius={Radius.lg} />
            <SkeletonCardList count={3} />
          </View>
        ) : isError ? (
          <ErrorState message={errorMessage} onRetry={refetchAll} />
        ) : (
          <>
            {saldo?.vigencia_fin ? <Text style={styles.vigenciaText}>Vigencia hasta {formatDateLong(saldo.vigencia_fin)}</Text> : null}

            <View style={styles.balanceGrid}>
              <FadeInView index={0} style={styles.tileFlex}>
                <BalanceTile label="Generados" value={saldo?.dias_generados} icon="trending-up-outline" />
              </FadeInView>
              <FadeInView index={1} style={styles.tileFlex}>
                <BalanceTile label="Usados" value={saldo?.dias_usados} icon="checkmark-done-outline" />
              </FadeInView>
              <FadeInView index={2} style={styles.tileFlex}>
                <BalanceTile label="Disponibles" value={saldo?.dias_disponibles} icon="airplane-outline" highlight />
              </FadeInView>
              <FadeInView index={3} style={styles.tileFlex}>
                <BalanceTile label="En solicitud" value={saldo?.dias_en_solicitud} icon="hourglass-outline" />
              </FadeInView>
            </View>

            <Button title="Solicitar vacaciones" leftIcon="add-circle-outline" onPress={solicitar} />

            {proximas.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Próximas</Text>
                <View style={styles.list}>
                  {proximas.map((item, index) => (
                    <FadeInView key={String(item.id)} index={index}>
                      <RequestCard
                        solicitud={item}
                        onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: String(item.id) } })}
                      />
                    </FadeInView>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Historial</Text>
            {historial.length === 0 && proximas.length === 0 ? (
              <MascotAssistant
                message={MascotMessages.vacaciones}
                type="tip"
                dismissible={false}
                actionLabel="Solicitar vacaciones"
                onAction={solicitar}
              />
            ) : historial.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>Todavía no tienes vacaciones resueltas este periodo.</Text>
              </Card>
            ) : (
              <View style={styles.list}>
                {historial.map((item, index) => (
                  <FadeInView key={String(item.id)} index={index}>
                    <RequestCard
                      solicitud={item}
                      onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: String(item.id) } })}
                    />
                  </FadeInView>
                ))}
              </View>
            )}

            {solicitudesQuery.hasNextPage ? (
              <Button
                title="Cargar más"
                variant="ghost"
                loading={solicitudesQuery.isFetchingNextPage}
                onPress={() => void solicitudesQuery.fetchNextPage()}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function BalanceTile({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value?: number;
  icon: keyof typeof Ionicons.glyphMap;
  highlight?: boolean;
}) {
  return (
    <Card style={[styles.tile, highlight && styles.tileHighlight]} padded>
      <Ionicons name={icon} size={20} color={highlight ? Colors.primaryDark : Colors.textMuted} />
      <Text style={[styles.tileValue, highlight && styles.tileValueHighlight]}>{typeof value === 'number' ? value : '—'}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  vigenciaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  tileFlex: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  tile: {
    gap: Spacing.xs,
    alignItems: 'flex-start',
  },
  tileHighlight: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoft,
  },
  tileValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  tileValueHighlight: {
    color: Colors.primaryDark,
  },
  tileLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  list: {
    gap: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
