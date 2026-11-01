import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { FadeInView } from '@/components/FadeInView';
import { Spacing } from '@/constants/colors';
import { useLaborDocumentsInfinite } from '@/hooks/queries/useLaborDocuments';
import { formatDateShort } from '@/utils/dates';
import { debeCargarMasParaFiltro } from '@/utils/filtroPaginado';
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

  // Los filtros locales solo ven lo ya cargado: 0 resultados no significa «no hay» mientras queden páginas.
  const buscandoMas = debeCargarMasParaFiltro({ resultados: documentos.length, hayFiltroLocal: !porFirmarServer && filtro !== 'todos', hasNextPage: query.hasNextPage, isFetchingNextPage: query.isFetchingNextPage, fallo: query.isFetchNextPageError });
  const { fetchNextPage } = query;
  useEffect(() => {
    if (buscandoMas) void fetchNextPage();
  }, [buscandoMas, fetchNextPage, query.dataUpdatedAt]);
  const quedanPaginas = documentos.length === 0 && Boolean(query.hasNextPage);

  return (
    <Screen
      title="Documentos laborales"
      subtitle="Contratos y comprobantes emitidos para ti"
      isLoading={query.isLoading}
      error={query.error} hayDatos={query.data !== undefined}
      notFoundMessage="Tu cuenta todavía no está vinculada a un expediente de colaborador. Contacta a RH."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={<FilterChips options={LABOR_DOCUMENT_FILTERS} value={filtro} onChange={setFiltro} />}>
      {quedanPaginas ? (
        <View style={styles.list}>
          {query.isFetchNextPageError ? <Notice tone="warning">No pudimos revisar todos tus documentos. Carga más para seguir buscando.</Notice> : null}
          <LoadMore hasNextPage={query.hasNextPage} isFetching={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />
        </View>
      ) : documentos.length === 0 ? (
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
