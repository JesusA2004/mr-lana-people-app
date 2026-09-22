import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { FadeInView } from '@/components/FadeInView';
import { Spacing } from '@/constants/colors';
import { useLaborDocumentsInfinite } from '@/hooks/queries/useLaborDocuments';
import { formatDateShort } from '@/utils/dates';
import {
  canColaboradorSign,
  colaboradorDocumentHint,
  filterLaborDocuments,
  laborDocumentKicker,
  LABOR_DOCUMENT_FILTERS,
  laborDocumentBadgeStatus,
  type LaborDocumentFilter,
} from '@/utils/laborDocuments';

/**
 * Mi espacio → Documentos laborales: lo que la EMPRESA emite para el
 * colaborador (contratos, comprobantes, recibos internos, documentos de
 * préstamo...). `GET /colaborador/documentos-laborales` — nunca incluye
 * borradores ni cancelados (backend). "Por firmar" usa el filtro real
 * `?estado=pendientes_firma`.
 */
export default function DocumentosLaboralesScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<LaborDocumentFilter>('todos');
  const porFirmarServer = filtro === 'por_firmar';
  const query = useLaborDocumentsInfinite(porFirmarServer ? { estado: 'pendientes_firma' } : {});

  const documentos = useMemo(() => {
    const all = query.data?.pages.flatMap((page) => page.data) ?? [];
    return porFirmarServer ? all : filterLaborDocuments(all, filtro);
  }, [query.data, filtro, porFirmarServer]);

  return (
    <Screen
      title="Documentos laborales"
      subtitle="Contratos y comprobantes emitidos para ti"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Tu cuenta todavía no está vinculada a un expediente de colaborador. Contacta a RH."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={<FilterChips options={LABOR_DOCUMENT_FILTERS} value={filtro} onChange={setFiltro} />}>
      {documentos.length === 0 ? (
        <EmptyMessage
          message={filtro === 'por_firmar' ? 'No tienes documentos pendientes de firma.' : 'Todavía no hay documentos laborales en esta sección.'}
        />
      ) : (
        <View style={styles.list}>
          {documentos.map((documento, index) => (
            <FadeInView key={documento.id} index={Math.min(index, 6)}>
              <ItemCard
                icon={canColaboradorSign(documento) ? 'create-outline' : 'document-text-outline'}
                kicker={laborDocumentKicker(documento)}
                title={documento.titulo}
                subtitle={documento.generado_en ? `Emitido el ${formatDateShort(documento.generado_en)}` : null}
                lines={[colaboradorDocumentHint(documento), documento.requiere_firma_digital ? 'Requiere firma digital: sí' : 'Requiere firma digital: no']}
                status={laborDocumentBadgeStatus(documento.estado)}
                statusLabel={documento.estado_etiqueta}
                onPress={() => router.push({ pathname: '/documentos-laborales/[id]', params: { id: String(documento.id) } })}
              />
            </FadeInView>
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
