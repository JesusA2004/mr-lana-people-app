import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LocalUploadFile } from '@/api/upload';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilePickButton } from '@/components/ciclo/FilePickButton';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { DateField } from '@/components/forms/DateField';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useRhImportarRecibos } from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import type { ReciboImportResult } from '@/types/payroll';
import { toApiDateString } from '@/utils/dates';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { formatCurrencyMXN } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { confirmAction } from '@/utils/confirm';

const IMPORT_TYPES = [
  'text/csv',
  'text/comma-separated-values',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * Importación masiva de recibos internos — `POST /rh/recibos/importar`
 * (`ImportarRecibosRequest`: archivo CSV/TXT/XLSX ≤ 5 MB, periodo, `simular`).
 * Formato largo: `numero_empleado, tipo, concepto, importe, cantidad?,
 * observaciones?`. El backend reporta fila por fila; un colaborador con
 * alguna fila inválida no recibe recibo incompleto. Se recomienda simular
 * primero.
 */
export default function RhImportarRecibosScreen() {
  const router = useRouter();
  const importar = useRhImportarRecibos();
  const { isOffline } = useNetworkStatus();
  const [archivo, setArchivo] = useState<LocalUploadFile | null>(null);
  const [inicio, setInicio] = useState<Date | undefined>();
  const [fin, setFin] = useState<Date | undefined>();
  const [pago, setPago] = useState<Date | undefined>();
  const [resultado, setResultado] = useState<ReciboImportResult | null>(null);

  const listo = !!archivo && !!inicio && !!fin;

  const enviar = async (simular: boolean) => {
    if (!archivo || !inicio || !fin) return;
    if (!simular) {
      const ok = await confirmAction({
        title: 'Importar recibos',
        message: `Se generarán los recibos del archivo «${archivo.name}» para el periodo elegido y cada colaborador podrá verlos. Te recomendamos simular primero.`,
        confirmLabel: 'Importar',
      });
      if (!ok) return;
    }
    importar.mutate(
      { archivo, periodo_inicio: toApiDateString(inicio), periodo_fin: toApiDateString(fin), fecha_pago: pago ? toApiDateString(pago) : null, simular },
      {
        onSuccess: (data) => {
          setResultado(data);
          haptics.success();
          toast.success(simular ? 'Simulación lista: revisa el resultado.' : `${data.recibos_generados} recibo(s) generado(s).`);
        },
        onError: (error) => {
          logError('rhRecibos.importar', error);
          haptics.error();
          toast.error(getActionErrorMessage(error));
        },
      },
    );
  };

  return (
    <Screen title="Importar recibos" subtitle="CSV o XLSX">
      <Notice tone="info">
        Columnas: numero_empleado, tipo (percepcion/deduccion), concepto, importe, cantidad (opcional), observaciones (opcional). Primero simula para
        revisar errores sin generar recibos.
      </Notice>
      <Card style={styles.gap}>
        <FilePickButton label="Archivo" file={archivo} onChange={setArchivo} types={IMPORT_TYPES} maxSizeMb={5} />
        {getFieldError(importar.error, 'archivo') ? <Text style={styles.error}>{getFieldError(importar.error, 'archivo')}</Text> : null}
        <DateField label="Inicio del periodo" value={inicio} onChange={setInicio} error={getFieldError(importar.error, 'periodo_inicio')} />
        <DateField label="Fin del periodo" value={fin} onChange={setFin} error={getFieldError(importar.error, 'periodo_fin')} />
        <DateField label="Fecha de pago (opcional)" value={pago} onChange={setPago} />
      </Card>
      {isOffline ? <Notice tone="warning">Sin conexión: la importación requiere el servidor.</Notice> : null}
      <View style={styles.actions}>
        <Button title="Simular" variant="outline" disabled={!listo || isOffline} loading={importar.isPending && importar.variables?.simular} onPress={() => void enviar(true)} style={styles.flex} />
        <Button title="Importar" disabled={!listo || isOffline} loading={importar.isPending && !importar.variables?.simular} onPress={() => void enviar(false)} style={styles.flex} />
      </View>

      {resultado ? (
        <>
          <Card style={styles.gap}>
            <SectionTitle>{resultado.simulacion ? 'Resultado de la simulación' : 'Resultado de la importación'}</SectionTitle>
            <InfoRow label="Filas leídas" value={resultado.filas_leidas} />
            <InfoRow label="Recibos generados" value={resultado.recibos_generados} emphasis />
            <InfoRow label="Colaboradores válidos" value={resultado.colaboradores.length} />
            <InfoRow label="Errores" value={resultado.errores.length} />
            <InfoRow label="Lote" value={resultado.lote} />
            {!resultado.simulacion && resultado.lote ? (
              <Button
                title="Ver recibos del lote"
                variant="ghost"
                onPress={() => router.push({ pathname: '/(app)/rh/recibos', params: { lote: resultado.lote ?? '' } } as never)}
              />
            ) : null}
          </Card>

          {resultado.errores.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Errores ({resultado.errores.length})</SectionTitle>
              {resultado.errores.map((error, index) => (
                <View key={index} style={styles.errorRow}>
                  <Text style={styles.errorTitle}>
                    {error.fila !== null ? `Fila ${error.fila}` : 'Colaborador'}
                    {error.numero_empleado ? ` · ${error.numero_empleado}` : ''}
                  </Text>
                  <Text style={styles.errorText}>{error.motivo}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {resultado.colaboradores.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Por colaborador</SectionTitle>
              {resultado.colaboradores.map((c) => (
                <InfoRow key={c.numero_empleado} label={`${c.numero_empleado} · ${c.colaborador}`} value={`${formatCurrencyMXN(c.neto)} (${c.conceptos} conceptos)`} />
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
  error: {
    fontSize: FontSize.xs,
    color: Colors.danger,
  },
  errorRow: {
    gap: 2,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  errorTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
  },
});
