import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { DocumentUploadSheet } from '@/components/DocumentUploadSheet';
import { MotivoModal } from '@/components/MotivoModal';
import { PressableScale } from '@/components/PressableScale';
import { StatusBadge } from '@/components/StatusBadge';
import { Stepper } from '@/components/Stepper';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhCierre, useRhOperarCierre, type RhCierreOperacion } from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import type { FiniquitoRenglon } from '@/types/rhCiclo';
import { availableCierreOperations, cierreBadge, CIERRE_STEPS, cierreStepIndex, cierreSiguientePaso } from '@/utils/cierre';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { formatCurrencyMXN, parseCurrencyInput } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';

type Sheet = null | 'aviso' | 'calcular' | 'concepto' | 'firmado' | 'pago' | 'cancelar';

/**
 * Cierre laboral por pasos (motivo → aviso → finiquito → firma → pago →
 * baja → expediente cerrado). Cada acción llama a su endpoint real y el
 * backend valida el orden; la app solo ofrece lo que el permiso y el
 * estado permiten (`availableCierreOperations`). Los montos del finiquito
 * los calcula el backend (`FiniquitoService`): aquí nunca se suma nada.
 */
export default function RhCierreDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRhCierre(id);
  const cierre = query.data;
  const bootstrap = useMobileBootstrap(true);
  const operar = useRhOperarCierre(Number(id), cierre?.colaborador?.id ?? null);
  const { isOffline } = useNetworkStatus();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [sueldoMensual, setSueldoMensual] = useState('');
  const [sueldoPendiente, setSueldoPendiente] = useState('');
  const [referencia, setReferencia] = useState('');
  const [concepto, setConcepto] = useState<{ id: number | null; tipo: 'percepcion' | 'deduccion'; concepto: string; importe: string; cantidad: string; observaciones: string }>({
    id: null,
    tipo: 'percepcion',
    concepto: '',
    importe: '',
    cantidad: '',
    observaciones: '',
  });

  const ops = cierre ? availableCierreOperations(cierre, bootstrap.data?.user.permissions) : [];
  const has = (op: (typeof ops)[number]) => ops.includes(op);

  const ejecutar = (op: RhCierreOperacion, exito: string) =>
    operar.mutate(op, {
      onSuccess: () => {
        haptics.success();
        toast.success(exito);
        setSheet(null);
      },
      onError: (error) => {
        logError('rhCierre.operar', error);
        haptics.error();
        toast.error(getActionErrorMessage(error));
      },
    });

  const confirmar = (titulo: string, mensaje: string, op: RhCierreOperacion, exito: string, destructive = false) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: destructive ? 'destructive' : 'default', onPress: () => ejecutar(op, exito) },
    ]);

  const abrirConcepto = (renglon?: FiniquitoRenglon) =>
    {
      setConcepto(
        renglon && renglon.id !== null
          ? {
              id: renglon.id,
              tipo: renglon.tipo === 'deduccion' ? 'deduccion' : 'percepcion',
              concepto: renglon.concepto,
              importe: renglon.importe !== null ? String(renglon.importe) : '',
              cantidad: renglon.cantidad !== null ? String(renglon.cantidad) : '',
              observaciones: renglon.observaciones ?? '',
            }
          : { id: null, tipo: 'percepcion', concepto: '', importe: '', cantidad: '', observaciones: '' },
      );
      setSheet('concepto');
    };

  const guardarConcepto = () => {
    const importe = parseCurrencyInput(concepto.importe);
    if (importe === undefined || concepto.concepto.trim() === '') return;
    const cantidad = concepto.cantidad.trim() ? Number(concepto.cantidad) : null;
    const payload = { tipo: concepto.tipo, concepto: concepto.concepto.trim(), importe, cantidad, observaciones: concepto.observaciones.trim() || null };
    if (concepto.id !== null) ejecutar({ tipo: 'actualizar_concepto', conceptoId: concepto.id, payload }, 'Concepto actualizado.');
    else ejecutar({ tipo: 'agregar_concepto', payload }, 'Concepto agregado.');
  };

  const desglose = cierre?.finiquito?.desglose ?? [];
  const percepciones = desglose.filter((r) => r.tipo === 'percepcion');
  const deducciones = desglose.filter((r) => r.tipo === 'deduccion');

  return (
    <Screen
      title="Cierre laboral"
      subtitle={cierre?.colaborador?.nombre}
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Este cierre ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {cierre ? (
        <>
          <Card style={styles.gap}>
            <View style={styles.header}>
              <Text style={styles.title}>{cierre.tipo_baja_etiqueta ?? cierre.tipo_baja}</Text>
              <StatusBadge status={cierreBadge(cierre.estado)} label={cierre.estado_etiqueta ?? undefined} />
            </View>
            {cierre.estado !== 'cancelado' ? <Stepper steps={[...CIERRE_STEPS]} currentIndex={cierreStepIndex(cierre.estado)} /> : null}
            {cierreSiguientePaso(cierre) ? <Notice tone="info">{cierreSiguientePaso(cierre)}</Notice> : null}
            <InfoRow label="Motivo" value={cierre.motivo} />
            <InfoRow label="Fecha efectiva" value={formatDateLong(cierre.fecha_efectiva)} icon="calendar-outline" />
            <InfoRow label="Aviso / renuncia" value={formatDateTime(cierre.aviso_registrado_en)} />
            <InfoRow label="Pago confirmado" value={formatDateTime(cierre.pago_confirmado_en)} />
            <InfoRow label="Referencia de pago" value={cierre.referencia_pago} />
            <InfoRow label="Baja ejecutada" value={formatDateTime(cierre.baja_ejecutada_en)} />
            <InfoRow label="Expediente cerrado" value={formatDateTime(cierre.expediente_cerrado_en)} />
            {cierre.colaborador ? (
              <Button
                title="Ver colaborador"
                variant="ghost"
                leftIcon="person-outline"
                onPress={() => router.push(`/(app)/rh/colaboradores/${cierre.colaborador?.id}` as never)}
              />
            ) : null}
          </Card>

          <Card style={styles.gap}>
            <SectionTitle>Finiquito</SectionTitle>
            {!cierre.finiquito ? (
              <Text style={styles.muted}>Todavía no se calcula el finiquito.</Text>
            ) : (
              <>
                <InfoRow label="Estado" value={cierre.finiquito.estado} />
                {cierre.finiquito.estado === 'firmado' || cierre.finiquito.estado === 'pagado' ? (
                  <Notice tone="info">Finiquito firmado: es de solo lectura.</Notice>
                ) : null}
                <Text style={styles.subTitle}>Percepciones</Text>
                {percepciones.length === 0 ? <Text style={styles.muted}>Sin percepciones.</Text> : null}
                {percepciones.map((r, i) => (
                  <Renglon key={`p-${r.id ?? i}`} renglon={r} editable={has('conceptos') && r.id !== null} onEdit={() => abrirConcepto(r)} />
                ))}
                <Text style={styles.subTitle}>Deducciones</Text>
                {deducciones.length === 0 ? <Text style={styles.muted}>Sin deducciones.</Text> : null}
                {deducciones.map((r, i) => (
                  <Renglon key={`d-${r.id ?? i}`} renglon={r} editable={has('conceptos') && r.id !== null} onEdit={() => abrirConcepto(r)} />
                ))}
                <View style={styles.divider} />
                <InfoRow label="Total percepciones" value={formatCurrencyMXN(cierre.finiquito.total_percepciones)} />
                <InfoRow label="Total deducciones" value={formatCurrencyMXN(cierre.finiquito.total_deducciones)} />
                <InfoRow label="Neto" value={formatCurrencyMXN(cierre.finiquito.neto)} emphasis />
                {cierre.finiquito.documento_id ? (
                  <Button
                    title="Ver documento de finiquito"
                    variant="outline"
                    leftIcon="document-text-outline"
                    onPress={() => router.push(`/(app)/rh/documentos-laborales/${cierre.finiquito?.documento_id}` as never)}
                  />
                ) : null}
              </>
            )}
            {has('conceptos') ? <Button title="Agregar concepto" variant="ghost" leftIcon="add-circle-outline" onPress={() => abrirConcepto()} /> : null}
          </Card>

          {ops.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Acciones</SectionTitle>
              {isOffline ? <Notice tone="warning">Sin conexión: estas acciones requieren confirmación del servidor.</Notice> : null}
              {has('aviso') ? <Button title="Subir aviso / renuncia firmada" variant="outline" leftIcon="cloud-upload-outline" disabled={isOffline} onPress={() => setSheet('aviso')} /> : null}
              {has('generar_aviso') ? (
                <Button
                  title="Generar aviso de término (plantilla)"
                  variant="outline"
                  disabled={isOffline || operar.isPending}
                  onPress={() => confirmar('Generar aviso', 'Se generará el aviso de término con la plantilla cargada por RH/Jurídico.', { tipo: 'generar_aviso' }, 'Aviso generado.')}
                />
              ) : null}
              {has('calcular') ? (
                <Button title={cierre.finiquito ? 'Recalcular finiquito' : 'Calcular finiquito'} variant="outline" leftIcon="calculator-outline" disabled={isOffline} onPress={() => setSheet('calcular')} />
              ) : null}
              {has('revisar') ? (
                <Button
                  title="Marcar finiquito como revisado"
                  variant="outline"
                  disabled={isOffline || operar.isPending}
                  onPress={() => confirmar('Revisar finiquito', 'Confirmas que revisaste montos y conceptos.', { tipo: 'revisar' }, 'Finiquito revisado.')}
                />
              ) : null}
              {has('generar_finiquito') ? (
                <Button
                  title="Generar documento de finiquito"
                  variant="outline"
                  disabled={isOffline || operar.isPending}
                  onPress={() => confirmar('Generar finiquito', 'Se generará el PDF del finiquito y se archivará en el expediente.', { tipo: 'generar_finiquito' }, 'Documento de finiquito generado.')}
                />
              ) : null}
              {has('finiquito_firmado') ? <Button title="Subir finiquito firmado" variant="outline" leftIcon="cloud-upload-outline" disabled={isOffline} onPress={() => setSheet('firmado')} /> : null}
              {has('confirmar_pago') ? <Button title="Confirmar pago del finiquito" leftIcon="cash-outline" disabled={isOffline} onPress={() => setSheet('pago')} /> : null}
              {has('ejecutar_baja') ? (
                <Button
                  title="Ejecutar baja"
                  variant="danger"
                  disabled={isOffline || operar.isPending}
                  onPress={() =>
                    confirmar(
                      'Ejecutar baja',
                      'El colaborador quedará inactivo, se revocarán sus accesos y dispositivos y su contrato se terminará. Su historial se conserva.',
                      { tipo: 'ejecutar_baja' },
                      'Baja ejecutada.',
                      true,
                    )
                  }
                />
              ) : null}
              {has('cerrar_expediente') ? (
                <Button
                  title="Cerrar expediente"
                  variant="danger"
                  disabled={isOffline || operar.isPending}
                  onPress={() => confirmar('Cerrar expediente', 'El expediente quedará cerrado. El colaborador nunca se elimina.', { tipo: 'cerrar_expediente' }, 'Expediente cerrado.', true)}
                />
              ) : null}
              {has('cancelar') ? <Button title="Cancelar cierre" variant="ghost" disabled={isOffline} onPress={() => setSheet('cancelar')} /> : null}
            </Card>
          ) : null}

          <DocumentUploadSheet
            visible={sheet === 'aviso' || sheet === 'firmado'}
            title={sheet === 'aviso' ? 'Aviso de término o renuncia firmada' : 'Finiquito firmado'}
            onClose={() => setSheet(null)}
            onConfirm={async (file) => {
              const archivo = { uri: file.uri, name: file.name, mimeType: file.mimeType };
              await operar.mutateAsync(sheet === 'aviso' ? { tipo: 'aviso', archivo } : { tipo: 'finiquito_firmado', archivo });
              haptics.success();
              toast.success(sheet === 'aviso' ? 'Aviso registrado.' : 'Finiquito firmado registrado.');
              setSheet(null);
            }}
          />

          <FormSheet
            visible={sheet === 'calcular'}
            title="Calcular finiquito"
            description="El cálculo lo realiza el sistema con las reglas del backend. Captura solo los insumos."
            confirmLabel="Calcular"
            submitting={operar.isPending}
            confirmDisabled={parseCurrencyInput(sueldoMensual) === undefined}
            onCancel={() => setSheet(null)}
            onConfirm={() =>
              ejecutar(
                { tipo: 'calcular', sueldoMensual: parseCurrencyInput(sueldoMensual) ?? 0, sueldoPendiente: parseCurrencyInput(sueldoPendiente) ?? null },
                'Finiquito calculado.',
              )
            }>
            <Field label="Sueldo mensual" keyboardType="decimal-pad" value={sueldoMensual} onChangeText={setSueldoMensual} error={getFieldError(operar.error, 'sueldo_mensual')} />
            <Field label="Sueldo pendiente (opcional)" keyboardType="decimal-pad" value={sueldoPendiente} onChangeText={setSueldoPendiente} error={getFieldError(operar.error, 'sueldo_pendiente')} />
          </FormSheet>

          <FormSheet
            visible={sheet === 'concepto'}
            title={concepto.id !== null ? 'Editar concepto' : 'Agregar concepto'}
            description="Un cambio de montos regresa el finiquito a borrador para volver a revisarlo."
            confirmLabel="Guardar"
            submitting={operar.isPending}
            confirmDisabled={concepto.concepto.trim() === '' || parseCurrencyInput(concepto.importe) === undefined}
            onCancel={() => setSheet(null)}
            onConfirm={guardarConcepto}>
            <View style={styles.chips}>
              <FilterChips
                options={[
                  { value: 'percepcion', label: 'Percepción' },
                  { value: 'deduccion', label: 'Deducción' },
                ]}
                value={concepto.tipo}
                onChange={(tipo) => setConcepto((c) => ({ ...c, tipo }))}
              />
            </View>
            <Field label="Concepto" value={concepto.concepto} onChangeText={(v) => setConcepto((c) => ({ ...c, concepto: v }))} maxLength={150} error={getFieldError(operar.error, 'concepto')} />
            <Field label="Importe" keyboardType="decimal-pad" value={concepto.importe} onChangeText={(v) => setConcepto((c) => ({ ...c, importe: v }))} error={getFieldError(operar.error, 'importe')} />
            <Field label="Cantidad (opcional)" keyboardType="decimal-pad" value={concepto.cantidad} onChangeText={(v) => setConcepto((c) => ({ ...c, cantidad: v }))} />
            <Field label="Observaciones (opcional)" value={concepto.observaciones} onChangeText={(v) => setConcepto((c) => ({ ...c, observaciones: v }))} maxLength={500} />
            {concepto.id !== null ? (
              <Button
                title="Eliminar concepto"
                variant="ghost"
                onPress={() =>
                  confirmar('Eliminar concepto', `¿Eliminar «${concepto.concepto}»?`, { tipo: 'eliminar_concepto', conceptoId: concepto.id as number }, 'Concepto eliminado.', true)
                }
              />
            ) : null}
          </FormSheet>

          <FormSheet
            visible={sheet === 'pago'}
            title="Confirmar pago del finiquito"
            description="Confirmación administrativa: el pago se realiza fuera de MR. LANA PEOPLE."
            confirmLabel="Confirmar pago"
            submitting={operar.isPending}
            confirmDisabled={referencia.trim() === ''}
            onCancel={() => setSheet(null)}
            onConfirm={() => ejecutar({ tipo: 'confirmar_pago', referencia: referencia.trim() }, 'Pago confirmado.')}>
            <Field label="Referencia de pago" value={referencia} onChangeText={setReferencia} maxLength={120} error={getFieldError(operar.error, 'referencia_pago')} />
          </FormSheet>

          <MotivoModal
            visible={sheet === 'cancelar'}
            title="Cancelar cierre laboral"
            description="El cierre se cancelará y el colaborador seguirá activo."
            confirmLabel="Cancelar cierre"
            submitting={operar.isPending}
            onCancel={() => setSheet(null)}
            onConfirm={(motivo) => ejecutar({ tipo: 'cancelar', motivo }, 'Cierre cancelado.')}
          />
        </>
      ) : null}
    </Screen>
  );
}

function Renglon({ renglon, editable, onEdit }: { renglon: FiniquitoRenglon; editable: boolean; onEdit: () => void }) {
  const content = (
    <View style={styles.renglon}>
      <View style={styles.flex}>
        <Text style={styles.renglonName}>{renglon.concepto}</Text>
        <Text style={styles.muted}>
          {renglon.origen === 'manual' ? 'Manual' : 'Automático'}
          {renglon.cantidad !== null && renglon.cantidad !== 1 ? ` · cantidad ${renglon.cantidad}` : ''}
          {renglon.observaciones ? ` · ${renglon.observaciones}` : ''}
        </Text>
      </View>
      <Text style={styles.renglonAmount}>{formatCurrencyMXN(renglon.importe)}</Text>
      {editable ? <Ionicons name="create-outline" size={18} color={Colors.primaryDark} /> : null}
    </View>
  );
  return editable ? (
    <PressableScale accessibilityRole="button" accessibilityLabel={`Editar ${renglon.concepto}`} onPress={onEdit}>
      {content}
    </PressableScale>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.sm,
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
    marginTop: Spacing.xs,
  },
  muted: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.xs,
  },
  renglon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
  },
  renglonName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  renglonAmount: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  flex: {
    flex: 1,
  },
  chips: {
    marginHorizontal: -Spacing.lg,
  },
});
