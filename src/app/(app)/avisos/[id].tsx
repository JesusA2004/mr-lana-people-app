import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { avisosApi } from '@/api/avisos';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { DocumentoProtegido } from '@/components/DocumentoProtegido';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { API_URL } from '@/constants/config';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useAviso, useMarcarAvisoLeido } from '@/hooks/queries/useAvisos';
import { useAuthStore } from '@/store/authStore';
import { useEstilos } from '@/theme/ThemeProvider';
import { formatDateTime } from '@/utils/dates';
import { getErrorMessage, isNotFoundError } from '@/utils/errors';
import type { AvisoItem } from '@/types/aviso';

/**
 * Detalle de un aviso. Llega desde la bandeja (datos ya en caché, sin
 * esperar red) o desde su push (`aviso_rh` → `/avisos/{id}`, se pide
 * `GET /avisos/{id}`). El adjunto se ve según su tipo: imagen en línea;
 * PDF como tarjeta de descarga con Bearer (nunca una URL pública del NAS).
 *
 * Marca "leído" aquí, al ABRIR, nunca antes (ni en la lista ni al llegar el push).
 */
export default function AvisoDetalleScreen() {
  const styles = useEstilos(crearEstilos);
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((state) => state.token);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
  const { data: aviso, isLoading, error, refetch } = useAviso(id);
  const marcarLeido = useMarcarAvisoLeido();
  const marcadoRef = useRef(false);

  useEffect(() => {
    if (!aviso || aviso.leido || marcadoRef.current) return;
    marcadoRef.current = true;
    marcarLeido.mutate(aviso.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe marcarse una vez por montaje, no en cada cambio de la mutación.
  }, [aviso]);

  const header = <AppHeader title="Aviso" showBack />;

  if (!aviso) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.content}>
          {isLoading ? (
            <SkeletonBlock height={220} radius={Radius.lg} />
          ) : error && !isNotFoundError(error) ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
          ) : (
            <EmptyState icon="megaphone-outline" message="Este aviso ya no está disponible." />
          )}
        </View>
      </View>
    );
  }

  const tipo = tipoAdjunto(aviso);

  return (
    <View style={styles.container}>
      {header}

      <ScrollView contentContainerStyle={styles.content}>
        {tipo === 'imagen' ? (
          <Image
            source={{ uri: `${API_URL}${avisosApi.archivoPath(aviso.id)}`, headers: authHeaders }}
            style={styles.image}
            contentFit="cover"
            transition={180}
            accessibilityLabel={aviso.archivo?.nombre ?? 'Imagen del aviso'}
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

        {tipo === 'pdf' && aviso.archivo ? (
          <DocumentoProtegido
            titulo={aviso.archivo.nombre ?? aviso.titulo}
            modo="descarga"
            path={avisosApi.archivoPath(aviso.id)}
            puedeDescargar={aviso.archivo.puede_descargar === true}
            tamanoConocido={aviso.archivo.tamano}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function tipoAdjunto(aviso: AvisoItem): 'imagen' | 'pdf' | null {
  if (aviso.archivo) return aviso.archivo.tipo;
  // Backend anterior: solo existían imágenes.
  return aviso.imagen_path ? 'imagen' : null;
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
