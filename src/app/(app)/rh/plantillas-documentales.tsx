import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useRhPlantillasDocumentales } from '@/hooks/queries/useRhCicloLaboral';

/**
 * Plantillas documentales — SOLO CONSULTA en móvil
 * (`GET /rh/plantillas-documentales`, permiso `plantillas_documentales.ver`).
 * Decisión documentada: la carga/versionado de plantillas DOCX/HTML
 * (`POST`/`PATCH`) es administración técnica y se hace en el Portal RH.
 * Esta vista sirve para diagnosticar "por qué no se generó un documento":
 * muestra qué claves del catálogo tienen plantilla activa y cuáles faltan.
 */
export default function RhPlantillasDocumentalesScreen() {
  const query = useRhPlantillasDocumentales();
  const data = query.data;
  const faltantes = (data?.catalogo ?? []).filter((c) => !c.configurada);

  return (
    <Screen
      title="Plantillas documentales"
      subtitle="Consulta"
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {data ? (
        <>
          {faltantes.length > 0 ? (
            <Notice tone="warning">
              {faltantes.length} documento(s) sin plantilla activa. Mientras falten, el sistema no podrá generarlos y quedarán como pendientes. RH/Jurídico
              debe cargarlos en el Portal RH.
            </Notice>
          ) : (
            <Notice tone="success">Todas las plantillas del catálogo están configuradas.</Notice>
          )}
          <Card>
            <SectionTitle>Catálogo</SectionTitle>
            {data.catalogo.map((entrada) => (
              <View key={entrada.clave} style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.nombre}>{entrada.nombre}</Text>
                  <Text style={styles.meta}>{entrada.clave}</Text>
                </View>
                <StatusBadge status={entrada.configurada ? 'aprobado' : 'pendiente'} label={entrada.configurada ? 'Configurada' : 'Falta'} />
              </View>
            ))}
          </Card>
          <Card>
            <SectionTitle>Versiones registradas</SectionTitle>
            {data.plantillas.length === 0 ? <Text style={styles.meta}>Sin plantillas registradas.</Text> : null}
            {data.plantillas.map((plantilla) => (
              <InfoRow
                key={plantilla.id}
                label={`${plantilla.nombre} (v${plantilla.version ?? '?'})`}
                value={`${plantilla.activo ? 'Activa' : 'Inactiva'} · ${plantilla.motor ?? ''}`}
              />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  flex: {
    flex: 1,
  },
  nombre: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
