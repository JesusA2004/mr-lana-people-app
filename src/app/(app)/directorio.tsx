import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { paddingInferiorBarra } from '@/components/BarraAccionInferior';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useDirectorio, useOpcionesDirectorio } from '@/hooks/queries/useDirectorio';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { ColaboradorDirectorio } from '@/types/directorio';
import { getErrorMessage } from '@/utils/errors';

/**
 * Directorio de la empresa (compartido por Mi espacio y Gestión RH): busca a
 * cualquier compañero activo y su CONTACTO CORPORATIVO. Solo pinta los
 * campos que manda el backend (nombre, puesto, sucursal, departamento,
 * correo y teléfono corporativos) — nunca datos personales.
 */
export default function DirectorioScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [sucursal, setSucursal] = useState('todas');

  useEffect(() => {
    const handle = setTimeout(() => setBusqueda(texto.trim()), 300);
    return () => clearTimeout(handle);
  }, [texto]);

  const opciones = useOpcionesDirectorio();
  const filtros = useMemo(
    () => ({ busqueda: busqueda || undefined, sucursal_id: sucursal === 'todas' ? undefined : Number(sucursal) }),
    [busqueda, sucursal],
  );
  const query = useDirectorio(filtros);
  const colaboradores = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta.total;

  const chipsSucursal = [
    { value: 'todas', label: 'Todas' },
    ...(opciones.data?.sucursales ?? []).map((s) => ({ value: String(s.id), label: s.nombre })),
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Directorio" subtitle={typeof total === 'number' ? `${total} colaboradores` : undefined} showBack onBackPress={() => router.back()} />

      <View style={styles.busqueda}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Nombre o número de empleado"
          placeholderTextColor={Colors.textMuted}
          style={styles.busquedaInput}
          autoCorrect={false}
          accessibilityLabel="Buscar en el directorio"
        />
        {texto ? (
          <PressableScale haptic={false} accessibilityLabel="Limpiar búsqueda" onPress={() => setTexto('')} style={styles.limpiar}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </PressableScale>
        ) : null}
      </View>
      {chipsSucursal.length > 1 ? (
        <View style={styles.chips}>
          <FilterChips options={chipsSucursal} value={sucursal} onChange={setSucursal} />
        </View>
      ) : null}

      <FlatList
        data={colaboradores}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.lista, { paddingBottom: paddingInferiorBarra(insets.bottom) }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        renderItem={({ item }) => <FilaDirectorio colaborador={item} />}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} style={styles.footer} /> : null}
        ListEmptyComponent={
          query.isLoading ? (
            <SkeletonCardList count={5} />
          ) : query.isError ? (
            <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <Text style={styles.vacio}>{busqueda ? 'Nadie coincide con tu búsqueda.' : 'No hay colaboradores para mostrar.'}</Text>
          )
        }
      />
    </View>
  );
}

function FilaDirectorio({ colaborador }: { colaborador: ColaboradorDirectorio }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const detalle = [colaborador.puesto, colaborador.sucursal, colaborador.departamento].filter(Boolean).join(' · ');

  const abrir = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast.error('No se pudo abrir la aplicación en este teléfono.');
    }
  };

  return (
    <Card style={styles.fila}>
      <Text style={styles.nombre}>{colaborador.nombre}</Text>
      {detalle ? <Text style={styles.detalle}>{detalle}</Text> : null}
      <View style={styles.acciones}>
        {colaborador.correoCorporativo ? (
          <PressableScale
            accessibilityRole="link"
            accessibilityLabel={`Escribir a ${colaborador.correoCorporativo}`}
            onPress={() => void abrir(`mailto:${colaborador.correoCorporativo}`)}
            style={styles.contacto}>
            <Ionicons name="mail-outline" size={18} color={Colors.primary} />
            <Text style={styles.contactoTexto} numberOfLines={1}>
              {colaborador.correoCorporativo}
            </Text>
          </PressableScale>
        ) : (
          <Text style={styles.sinDato}>Sin correo corporativo</Text>
        )}
        {colaborador.telefonoCorporativo ? (
          <PressableScale
            accessibilityRole="link"
            accessibilityLabel={`Llamar al ${colaborador.telefonoCorporativo}`}
            onPress={() => void abrir(`tel:${colaborador.telefonoCorporativo?.replace(/[^\d+]/g, '')}`)}
            style={styles.contacto}>
            <Ionicons name="call-outline" size={18} color={Colors.primary} />
            <Text style={styles.contactoTexto}>{colaborador.telefonoCorporativo}</Text>
          </PressableScale>
        ) : null}
      </View>
    </Card>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    busqueda: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      minHeight: 44,
      borderRadius: Radius.full,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    busquedaInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, minHeight: 44 },
    limpiar: { minWidth: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    chips: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
    lista: { width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', padding: Spacing.lg, paddingTop: 0, flexGrow: 1 },
    fila: { gap: Spacing.xs },
    nombre: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    detalle: { fontSize: FontSize.sm, color: Colors.textMuted },
    acciones: { gap: Spacing.xs, marginTop: Spacing.xs },
    contacto: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 44,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Colors.primarySoft,
    },
    contactoTexto: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
    sinDato: { fontSize: FontSize.xs, color: Colors.textMuted },
    footer: { paddingVertical: Spacing.lg },
    vacio: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
  });
