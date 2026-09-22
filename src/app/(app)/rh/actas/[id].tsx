import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { rhActasApi } from '@/api/rh/cicloLaboral';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { StepTimeline } from '@/components/ciclo/StepTimeline';
import { DocumentUploadSheet } from '@/components/DocumentUploadSheet';
import { MotivoModal } from '@/components/MotivoModal';
import { PressableScale } from '@/components/PressableScale';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhActa, useRhOperarActa, type RhActaOperacion } from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { actaBadge, actaEstadoLabel, availableActaOperations } from '@/utils/acta';
import { formatDateLong } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { joinName, slugifyFilename } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';

type Sheet = null | 'anexo' | 'negativa' | 'seguimiento';

/**
 * Detalle de acta (RH): hechos capturados, testigos, declaraciones, anexos,
 * seguimiento y acciones según `ActaAdministrativaPolicy`. El texto
 * jurídico sale de la plantilla del tipo (RH/Jurídico); la app no redacta
 * cláusulas.
 */
export default function RhActaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRhActa(id);
  const acta = query.data;
  const bootstrap = useMobileBootstrap(true);
  const user = useAuthStore((state) => state.user);
  const operar = useRhOperarActa(Number(id));
  const { isOffline } = useNetworkStatus();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [anexoAbierto, setAnexoAbierto] = useState<{ id: number; nombre: string } | null>(null);

  if (anexoAbierto && acta) {
    return (
      <SecureDocumentViewer
        path={rhActasApi.anexoPath(acta.id, anexoAbierto.id)}
        title={anexoAbierto.nombre}
        watermarkLabel={`${joinName(user?.nombre, user?.apellidos) ?? 'RH'} · ${new Date().toLocaleString('es-MX')}`}
        onClose={() => setAnexoAbierto(null)}
        allowDownload
        downloadFileName={slugifyFilename(anexoAbierto.nombre)}
      />
    );
  }

  const ops = acta ? availableActaOperations(acta, bootstrap.data?.user.permissions) : [];

  const ejecutar = (op: RhActaOperacion, exito: string) =>
    operar.mutate(op, {
      onSuccess: () => {
        haptics.success();
        toast.success(exito);
        setSheet(null);
      },
      onError: (error) => {
        logError('rhActa.operar', error);
        haptics.error();
        toast.error(getActionErrorMessage(error));
      },
    });

  return (
    <Screen
      title="Acta"
      subtitle={acta?.folio ?? undefined}
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Esta acta ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {acta ? (
        <>
          <Card style={styles.gap}>
            <View style={styles.header}>
              <Text style={styles.title}>{acta.tipo_etiqueta ?? acta.tipo}</Text>
              <StatusBadge status={actaBadge(acta.estado)} label={actaEstadoLabel(acta.estado)} />
            </View>
            <InfoRow label="Colaborador" value={acta.colaborador?.nombre} icon="person-outline" />
            <InfoRow label="Fecha" value={formatDateLong(acta.fecha)} icon="calendar-outline" />
            <InfoRow label="Hora" value={acta.hora} icon="time-outline" />
            <InfoRow label="Lugar" value={acta.lugar} icon="location-outline" />
            {acta.negativa_firma ? <Notice tone="warning">Negativa a firmar registrada{acta.motivo_negativa ? `: ${acta.motivo_negativa}` : '.'}</Notice> : null}
          </Card>

          <Card style={styles.gap}>
            <SectionTitle>Hechos</SectionTitle>
            <Text style={styles.body} selectable>
              {acta.hechos ?? '—'}
            </Text>
          </Card>

          {acta.testigos && acta.testigos.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Testigos</SectionTitle>
              {acta.testigos.map((t, i) => (
                <InfoRow key={i} label={t.nombre} value={t.puesto ?? 'Testigo'} />
              ))}
            </Card>
          ) : null}

          {acta.declaraciones && acta.declaraciones.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Declaraciones</SectionTitle>
              {acta.declaraciones.map((d, i) => (
                <View key={i} style={styles.declaracion}>
                  <Text style={styles.subTitle}>{d.persona}</Text>
                  <Text style={styles.body}>{d.declaracion}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          <Card style={styles.gap}>
            <SectionTitle>Anexos</SectionTitle>
            {(acta.anexos ?? []).length === 0 ? <Text style={styles.muted}>Sin anexos.</Text> : null}
            {(acta.anexos ?? []).map((anexo) => (
              <PressableScale
                key={anexo.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver anexo ${anexo.nombre ?? ''}`}
                onPress={() => setAnexoAbierto({ id: anexo.id, nombre: anexo.nombre ?? 'Anexo' })}
                style={styles.anexo}>
                <Text style={styles.link}>{anexo.nombre ?? `Anexo ${anexo.id}`}</Text>
                {anexo.descripcion ? <Text style={styles.muted}>{anexo.descripcion}</Text> : null}
              </PressableScale>
            ))}
          </Card>

          {acta.documento_id ? (
            <Button title="Ver formato generado" variant="outline" leftIcon="document-text-outline" onPress={() => router.push(`/(app)/rh/documentos-laborales/${acta.documento_id}` as never)} />
          ) : null}

          {acta.seguimiento && acta.seguimiento.length > 0 ? (
            <Card>
              <SectionTitle>Seguimiento</SectionTitle>
              <View style={styles.timeline}>
                <StepTimeline items={acta.seguimiento.map((s, i) => ({ key: `${i}`, label: s.nota, status: 'done', date: s.fecha }))} />
              </View>
            </Card>
          ) : null}

          {ops.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Acciones</SectionTitle>
              {isOffline ? <Notice tone="warning">Sin conexión: requiere confirmación del servidor.</Notice> : null}
              {ops.includes('editar') ? (
                <Button
                  title="Editar borrador"
                  variant="outline"
                  leftIcon="create-outline"
                  onPress={() => router.push({ pathname: '/(app)/rh/actas/editar', params: { actaId: String(acta.id) } } as never)}
                />
              ) : null}
              {ops.includes('anexo') ? <Button title="Agregar anexo" variant="outline" leftIcon="attach-outline" disabled={isOffline} onPress={() => setSheet('anexo')} /> : null}
              {ops.includes('generar_documento') ? (
                <Button
                  title={acta.documento_id ? 'Regenerar formato' : 'Generar formato'}
                  variant="outline"
                  disabled={isOffline || operar.isPending}
                  onPress={() =>
                    Alert.alert('Generar formato', 'Se generará el documento con la plantilla del tipo de acta cargada por RH/Jurídico.', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Generar', onPress: () => ejecutar({ tipo: 'generar_documento' }, 'Formato generado.') },
                    ])
                  }
                />
              ) : null}
              {ops.includes('negativa_firma') && !acta.negativa_firma ? (
                <Button title="Registrar negativa a firmar" variant="outline" disabled={isOffline} onPress={() => setSheet('negativa')} />
              ) : null}
              {ops.includes('seguimiento') ? <Button title="Agregar seguimiento" variant="outline" disabled={isOffline} onPress={() => setSheet('seguimiento')} /> : null}
              {ops.includes('cerrar') ? (
                <Button
                  title="Cerrar acta"
                  variant="danger"
                  disabled={isOffline || operar.isPending}
                  onPress={() =>
                    Alert.alert('Cerrar acta', 'El acta quedará cerrada; ya no admitirá anexos ni cambios.', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Cerrar', style: 'destructive', onPress: () => ejecutar({ tipo: 'cerrar' }, 'Acta cerrada.') },
                    ])
                  }
                />
              ) : null}
            </Card>
          ) : null}

          <DocumentUploadSheet
            visible={sheet === 'anexo'}
            title="Anexo del acta"
            onClose={() => setSheet(null)}
            onConfirm={async (file) => {
              await operar.mutateAsync({ tipo: 'anexo', archivo: { uri: file.uri, name: file.name, mimeType: file.mimeType } });
              haptics.success();
              toast.success('Anexo agregado.');
              setSheet(null);
            }}
          />
          <MotivoModal
            visible={sheet === 'negativa'}
            title="Negativa a firmar"
            description="Describe lo ocurrido (hechos). Queda registrado en el acta."
            confirmLabel="Registrar"
            submitting={operar.isPending}
            onCancel={() => setSheet(null)}
            onConfirm={(motivo) => ejecutar({ tipo: 'negativa_firma', motivo }, 'Negativa registrada.')}
          />
          <MotivoModal
            visible={sheet === 'seguimiento'}
            title="Agregar seguimiento"
            description="Nota de seguimiento del acta."
            confirmLabel="Agregar"
            submitting={operar.isPending}
            onCancel={() => setSheet(null)}
            onConfirm={(nota) => ejecutar({ tipo: 'seguimiento', nota }, 'Seguimiento agregado.')}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    flexShrink: 1,
  },
  subTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  muted: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  declaracion: {
    gap: 2,
    paddingVertical: Spacing.xs,
  },
  anexo: {
    minHeight: 44,
    justifyContent: 'center',
  },
  link: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  timeline: {
    marginTop: Spacing.md,
  },
});
