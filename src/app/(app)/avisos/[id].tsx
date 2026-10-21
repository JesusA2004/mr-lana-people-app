import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { avisosApi } from '@/api/avisos';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { API_URL } from '@/constants/config';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useAviso, useMarcarAvisoLeido } from '@/hooks/queries/useAvisos';
import { useAuthStore } from '@/store/authStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { formatDateTime } from '@/utils/dates';
import { getErrorMessage, isNotFoundError } from '@/utils/errors';
import type { AvisoItem } from '@/types/aviso';

/**
 * Detalle de un aviso. Llega desde la bandeja (datos ya en caché, sin
 * esperar red) o desde su push (`aviso_rh` → `/avisos/{id}`, se pide
 * `GET /avisos/{id}`). El adjunto se ve según su tipo: imagen en línea;
 * PDF como tarjeta que abre el visor seguro (descarga con Bearer, nunca una
 * URL pública del NAS).
 *
 * Marca "leído" aquí, al ABRIR, nunca antes (ni en la lista ni al llegar el push).
 */
export default function AvisoDetalleScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((state) => state.token);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
  const { data: aviso, isLoading, error, refetch } = useAviso(id);
  const marcarLeido = useMarcarAvisoLeido();
  const marcadoRef = useRef(false);
  const [pdfAbierto, setPdfAbierto] = useState(false);

  useEffect(() => {
    if (!aviso || aviso.leido || marcadoRef.current) return;
    marcadoRef.current = true;
    marcarLeido.mutate(aviso.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe marcarse una vez por montaje, no en cada cambio de la mutación.
  }, [aviso]);

  const header = <AppHeader title="Aviso" showBack onBackPress={() => router.back()} />;

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

        {tipo === 'pdf' && aviso.archivo ? <TarjetaPdf aviso={aviso} onPress={() => setPdfAbierto(true)} /> : null}
      </ScrollView>

      <Modal visible={pdfAbierto} animationType="slide" onRequestClose={() => setPdfAbierto(false)}>
        {pdfAbierto ? (
          <SecureDocumentViewer
            path={avisosApi.archivoPath(aviso.id)}
            title={aviso.archivo?.nombre ?? aviso.titulo}
            onClose={() => setPdfAbierto(false)}
            // Comunicado dirigido a esta persona (la API valida que sea destinataria):
            // si no se puede previsualizar, «Descargar PDF» / «Abrir con…».
            allowDownload
          />
        ) : null}
      </Modal>
    </View>
  );
}

function tipoAdjunto(aviso: AvisoItem): 'imagen' | 'pdf' | null {
  if (aviso.archivo) return aviso.archivo.tipo;
  // Backend anterior: solo existían imágenes.
  return aviso.imagen_path ? 'imagen' : null;
}

function TarjetaPdf({ aviso, onPress }: { aviso: AvisoItem; onPress: () => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const tamano = aviso.archivo?.tamano
    ? aviso.archivo.tamano >= 1024 * 1024
      ? `${(aviso.archivo.tamano / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(aviso.archivo.tamano / 1024))} KB`
    : null;

  return (
    <PressableScale onPress={onPress} style={styles.pdfCard} accessibilityRole="button" accessibilityLabel={`Ver PDF ${aviso.archivo?.nombre ?? ''}`}>
      <View style={styles.pdfIcon}>
        <Ionicons name="document-text-outline" size={22} color={Colors.danger} />
      </View>
      <View style={styles.pdfBody}>
        <Text style={styles.pdfName} numberOfLines={2}>
          {aviso.archivo?.nombre ?? 'Documento.pdf'}
        </Text>
        <Text style={styles.pdfMeta}>{tamano ? `PDF · ${tamano}` : 'PDF'}</Text>
      </View>
      <Text style={styles.pdfAction}>Ver PDF</Text>
    </PressableScale>
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
    pdfCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      minHeight: 64,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    pdfIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.dangerSoft,
    },
    pdfBody: {
      flex: 1,
      gap: 2,
    },
    pdfName: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: Colors.text,
    },
    pdfMeta: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
    },
    pdfAction: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: Colors.primaryDark,
    },
  });
