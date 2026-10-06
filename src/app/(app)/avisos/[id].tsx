import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';
import { queryKeys } from '@/api/queryKeys';
import { API_URL } from '@/constants/config';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { useMarcarAvisoLeido } from '@/hooks/queries/useAvisos';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/utils/dates';
import type { PaginatedResponse } from '@/types/api';
import type { AvisoItem } from '@/types/aviso';

/**
 * Detalle de un aviso: siempre se llega desde una card ya cargada en la
 * bandeja (`/avisos`), nunca por deep link directo (el push a `aviso_rh`
 * abre la bandeja, nunca un aviso concreto — `utils/appLinks.ts`). Por eso
 * los datos se leen del caché de React Query en vez de pedir un endpoint
 * `GET /avisos/{id}` que no existe en el backend.
 *
 * Marca "leído" aquí, al ABRIR, nunca antes (ni en la lista ni al llegar el push).
 */
export default function AvisoDetalleScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((state) => state.token);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
  const queryClient = useQueryClient();
  const marcarLeido = useMarcarAvisoLeido();
  const marcadoRef = useRef(false);

  const aviso = useMemo(() => {
    const cache = queryClient.getQueryData<InfiniteData<PaginatedResponse<AvisoItem>>>(queryKeys.avisos);
    return cache?.pages.flatMap((page) => page.data).find((item) => String(item.id) === String(id));
  }, [queryClient, id]);

  useEffect(() => {
    if (!aviso || aviso.leido || marcadoRef.current) return;
    marcadoRef.current = true;
    marcarLeido.mutate(aviso.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe marcarse una vez por montaje, no en cada cambio de la mutación.
  }, [aviso]);

  if (!aviso) {
    return (
      <View style={styles.container}>
        <AppHeader title="Aviso" showBack onBackPress={() => router.back()} />
        <EmptyState icon="megaphone-outline" message="Este aviso ya no está disponible." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Aviso" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {aviso.imagen_path ? (
          <Image
            source={{ uri: `${API_URL}/avisos/${aviso.id}/imagen`, headers: authHeaders }}
            style={styles.image}
            contentFit="cover"
            transition={180}
            accessibilityLabel="Imagen del aviso"
          />
        ) : null}

        <Card>
          <Text style={styles.title}>{aviso.titulo}</Text>
          <Text style={styles.date}>{aviso.enviado_en ? formatDateTime(aviso.enviado_en) : ''}</Text>
          <Text style={styles.message}>{aviso.mensaje}</Text>
          {aviso.creado_por ? (
            <Text style={styles.author}>
              Enviado por {[aviso.creado_por.name, aviso.creado_por.apellidos].filter(Boolean).join(' ')}
            </Text>
          ) : null}
        </Card>
      </ScrollView>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    content: {
      width: '100%',
      maxWidth: Layout.maxFormWidth,
      alignSelf: 'center',
      padding: Spacing.lg,
      gap: Spacing.lg,
      paddingBottom: Spacing.xxxl,
    },
    image: {
      width: '100%',
      aspectRatio: 16 / 10,
      borderRadius: Radius.lg,
      backgroundColor: Colors.surfaceMuted,
    },
    title: {
      fontSize: FontSize.lg,
      fontWeight: '800',
      color: Colors.text,
    },
    date: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
      marginTop: 2,
    },
    message: {
      fontSize: FontSize.md,
      color: Colors.text,
      lineHeight: 22,
      marginTop: Spacing.md,
    },
    author: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
      marginTop: Spacing.lg,
    },
  });
