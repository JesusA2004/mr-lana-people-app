import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { solicitudesApi } from '@/api/solicitudes';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { Solicitud } from '@/types/request';
import { formatDateLong } from '@/utils/dates';
import { getErrorMessage, logError } from '@/utils/errors';
import { humanizeRequestType, pickString } from '@/utils/formatters';

type ViewState = 'loading' | 'success' | 'error';

export default function SolicitudDetalleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [state, setState] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setState('loading');
    setErrorMessage(null);
    try {
      const result = await solicitudesApi.getById(id);
      setSolicitud(result);
      setState('success');
    } catch (error) {
      logError('solicitudes.getById', error);
      setErrorMessage(getErrorMessage(error));
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const fecha = pickString(solicitud, ['fecha', 'created_at']);

  const allDetails: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }[] = [
    { icon: 'chatbox-ellipses-outline', label: 'Comentario', value: pickString(solicitud, ['comentario']) },
    { icon: 'reader-outline', label: 'Observaciones', value: pickString(solicitud, ['observaciones']) },
    { icon: 'return-down-back-outline', label: 'Respuesta', value: pickString(solicitud, ['respuesta']) },
  ];
  const details = allDetails.filter((item) => Boolean(item.value));

  return (
    <View style={styles.container}>
      <AppHeader title="Detalle de solicitud" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {state === 'loading' ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={100} radius={Radius.lg} />
            <SkeletonBlock height={160} radius={Radius.lg} />
          </View>
        ) : state === 'error' ? (
          <ErrorState message={errorMessage ?? undefined} onRetry={() => void load()} />
        ) : solicitud ? (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.type}>{humanizeRequestType(solicitud.tipo)}</Text>
                <StatusBadge status={solicitud.estado} />
              </View>
              {solicitud.folio ? <Text style={styles.folio}>Folio {solicitud.folio}</Text> : null}
              {fecha ? <Text style={styles.date}>{formatDateLong(fecha)}</Text> : null}
            </Card>

            {details.length > 0 ? (
              <Card>
                {details.map((item, index) => (
                  <View key={item.label} style={[styles.detailRow, index === details.length - 1 && styles.detailRowLast]}>
                    <View style={styles.detailIcon}>
                      <Ionicons name={item.icon} size={16} color={Colors.primaryDark} />
                    </View>
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>{item.label}</Text>
                      <Text style={styles.detailValue}>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            ) : (
              <Card>
                <Text style={styles.emptyText}>No hay información adicional disponible para esta solicitud.</Text>
              </Card>
            )}
          </>
        ) : null}
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
  headerCard: {
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  type: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    flexShrink: 1,
  },
  folio: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  detailRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: 2,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
