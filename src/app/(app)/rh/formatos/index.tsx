import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhFormatos } from '@/hooks/queries/useRhFormatos';
import type { RhFormato } from '@/types/formato';
import { formatDateShort } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';

const TIPO_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  contrato: 'document-text-outline',
  aviso_privacidad: 'shield-checkmark-outline',
  consentimiento_datos: 'shield-checkmark-outline',
  carta_confidencialidad: 'mail-outline',
  formato_permiso: 'exit-outline',
  formato_vacaciones: 'airplane-outline',
  formato_incapacidad: 'medkit-outline',
  formato_alta: 'person-add-outline',
  formato_baja: 'person-remove-outline',
  constancia_laboral: 'ribbon-outline',
  actualizacion_datos: 'create-outline',
  reposicion_documental: 'refresh-outline',
  solicitud_general: 'document-text-outline',
  resguardo: 'lock-closed-outline',
  acuse: 'checkmark-done-outline',
  otro: 'document-outline',
};

/**
 * Catálogo de formatos automáticos RH (AGENTS.md de este encargo, sección
 * 13) — espejo EXACTO de `FormatoCatalogoService::listar()` en
 * capacitaciones, YA IMPLEMENTADO en el backend real. Solo lectura: el
 * backend real solo ofrece a móvil catálogo + descarga de lo YA generado
 * (generar/preparar/preview siguen solo en el panel web, ver
 * `docs/BACKEND_GAPS_FINAL.md`) — por eso ninguna fila navega a ningún
 * lado todavía; mostrar el catálogo como referencia (nombre, tipo, cuántas
 * veces se ha generado, último uso) sin prometer una acción que hoy daría
 * 404. El filtro por texto es enteramente local (el backend no acepta
 * ningún query param en `index()`), nunca se manda al servidor.
 */
export default function RhFormatosListScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useRhFormatos(true);
  const formatos = useMemo(() => {
    const all = data ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return all;
    return all.filter((formato) => formato.nombre.toLowerCase().includes(query) || formato.tipo_etiqueta.toLowerCase().includes(query));
  }, [data, q]);

  return (
    <View style={styles.container}>
      <AppHeader title="Formatos" showBack onBackPress={() => router.back()} />

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar formato"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar formato"
        />
      </View>

      <FlatList
        data={formatos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item }) => <FormatoRow formato={item} />}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonCardList count={4} />
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
          ) : (
            <MascotAssistant message="Todavía no hay formatos disponibles." type="tip" dismissible={false} />
          )
        }
      />

      <View style={styles.footerNote}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.footerNoteText}>Generar un documento nuevo todavía solo está disponible desde el panel web.</Text>
      </View>
    </View>
  );
}

function FormatoRow({ formato }: { formato: RhFormato }) {
  return (
    <Card style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={TIPO_ICON[formato.tipo] ?? 'document-outline'} size={20} color={Colors.primaryDark} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {formato.nombre}
        </Text>
        <Text style={styles.rowType} numberOfLines={1}>
          {formato.tipo_etiqueta}
        </Text>
        {formato.descripcion ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {formato.descripcion}
          </Text>
        ) : null}
        <Text style={styles.rowMeta}>
          {formato.veces_generado > 0
            ? `Generado ${formato.veces_generado} ${formato.veces_generado === 1 ? 'vez' : 'veces'}${formato.ultimo_uso ? ` · último uso ${formatDateShort(formato.ultimo_uso)}` : ''}`
            : 'Sin generar todavía'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  rowType: {
    fontSize: FontSize.xs,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rowMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  footerNoteText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
