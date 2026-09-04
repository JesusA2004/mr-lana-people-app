import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { solicitudesApi } from '@/api/solicitudes';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import type { Solicitud } from '@/types/request';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getErrorMessage, logError } from '@/utils/errors';
import { humanizeRequestType } from '@/utils/formatters';

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

  interface DetailItem {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string | null;
  }

  const hasDateRange = Boolean(solicitud?.fecha_inicio || solicitud?.fecha_fin);
  const allDetails: DetailItem[] = [
    { icon: 'chatbox-ellipses-outline', label: 'Motivo', value: solicitud?.motivo },
    { icon: 'reader-outline', label: 'Observaciones', value: solicitud?.observaciones },
    {
      icon: 'calendar-outline',
      label: 'Fechas',
      value: hasDateRange
        ? [solicitud?.fecha_inicio, solicitud?.fecha_fin]
            .filter((value): value is string => Boolean(value))
            .map((value) => formatDateLong(value))
            .join(' — ')
        : undefined,
    },
    { icon: 'time-outline', label: 'Última revisión', value: solicitud?.revisado_en ? formatDateTime(solicitud.revisado_en) : undefined },
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
                <Text style={styles.type}>{solicitud.tipo_etiqueta ?? humanizeRequestType(solicitud.tipo)}</Text>
                <StatusBadge status={solicitud.estado} label={solicitud.estado_etiqueta} />
              </View>
              {solicitud.folio ? <Text style={styles.folio}>Folio {solicitud.folio}</Text> : null}
              {solicitud.creada_en ? <Text style={styles.date}>{formatDateLong(solicitud.creada_en)}</Text> : null}
            </Card>

            {solicitud.estado === 'requiere_correccion' && solicitud.motivo_rechazo ? (
              <MascotAssistant
                message={MascotMessages.documentoRechazado}
                type="warning"
                priority="high"
                dismissible={false}
              />
            ) : null}

            {solicitud.motivo_rechazo ? (
              <Card style={styles.rejectionCard}>
                <View style={styles.rejectionHeader}>
                  <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                  <Text style={styles.rejectionTitle}>Motivo de rechazo / corrección</Text>
                </View>
                <Text style={styles.rejectionText}>{solicitud.motivo_rechazo}</Text>
              </Card>
            ) : null}

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
  rejectionCard: {
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.dangerSoft,
    gap: Spacing.xs,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rejectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.danger,
  },
  rejectionText: {
    fontSize: FontSize.sm,
    color: Colors.text,
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
