import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { Spacing } from '@/constants/colors';
import { useRhDocumentosLaborales, useRhDocumentosLaboralesPendientes } from '@/hooks/queries/useRhCicloLaboral';
import { ETAPAS_DOCUMENTO_LABORAL, type EtapaDocumentoLaboral } from '@/types/laborDocument';
import { formatDateShort } from '@/utils/dates';
import { ETAPA_LABELS, laborDocumentBadgeStatus, laborDocumentKicker } from '@/utils/laborDocuments';

type Filtro = 'todos' | EtapaDocumentoLaboral;

/**
 * Documentos laborales (RH) — `GET /rh/documentos-laborales?etapa=` +
 * conteos reales de `GET /rh/documentos-laborales/pendientes`. Acotado
 * por alcance organizacional en el backend.
 */
export default function RhDocumentosLaboralesScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('imprimir');
  const conteos = useRhDocumentosLaboralesPendientes();
  const query = useRhDocumentosLaborales(filtro === 'todos' ? {} : { etapa: filtro });
  const documentos = query.data?.pages.flatMap((page) => page.data) ?? [];

  const opciones = [
    ...ETAPAS_DOCUMENTO_LABORAL.map((etapa) => ({ value: etapa as Filtro, label: ETAPA_LABELS[etapa], count: conteos.data?.[etapa] })),
    { value: 'todos' as Filtro, label: 'Todos' },
  ];

  return (
    <Screen
      title="Documentos laborales"
      subtitle="Firmas y original físico"
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
        void conteos.refetch();
      }}
      header={<FilterChips options={opciones} value={filtro} onChange={setFiltro} />}>
      {documentos.length === 0 ? (
        <EmptyMessage message="No hay documentos en esta etapa." />
      ) : (
        <View style={styles.list}>
          {documentos.map((documento) => (
            <ItemCard
              key={documento.id}
              icon="document-text-outline"
              kicker={laborDocumentKicker(documento)}
              title={documento.titulo}
              subtitle={documento.colaborador ? `${documento.colaborador.nombre}${documento.colaborador.numero_empleado ? ` · ${documento.colaborador.numero_empleado}` : ''}` : null}
              lines={[documento.generado_en ? `Generado el ${formatDateShort(documento.generado_en)}` : null]}
              status={laborDocumentBadgeStatus(documento.estado)}
              statusLabel={documento.estado_etiqueta}
              onPress={() => router.push(`/(app)/rh/documentos-laborales/${documento.id}` as never)}
            />
          ))}
          <LoadMore hasNextPage={query.hasNextPage} isFetching={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
});
