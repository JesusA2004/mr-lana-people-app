import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { celebracionesApi } from '@/api/celebraciones';
import type { LocalUploadFile } from '@/api/upload';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { API_URL } from '@/constants/config';
import { useCelebracion, useCelebracionMensajes, usePublicarMensajeCelebracion } from '@/hooks/queries/useCelebraciones';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import type { CelebracionMensaje } from '@/types/celebracion';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getActionErrorMessage, getErrorMessage, isNotFoundError, logError } from '@/utils/errors';
import { volverAtras } from '@/utils/navegacion';
import { haptics } from '@/utils/haptics';

const MAX_CHARS = 500;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/**
 * Celebración unificada (cumpleaños o aniversario laboral) — destino real
 * de los pushes `cumpleanos`/`aniversario_laboral`/`cumpleanos_general`/
 * `aniversario_general`/`celebracion_mensaje` (`utils/appLinks.ts`).
 *
 * Mensajes PRIVADOS (docs/CELEBRACIONES.md): un compañero solo ve y puede
 * escribir el suyo; el homenajeado (o RH con permiso) ve todos. Nunca se
 * dibuja un feed público como el muro de cumpleaños clásico
 * (`muro-cumpleanos/[id].tsx`, que es un sistema aparte).
 */
export default function CelebracionScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((state) => state.token);
  const { isOffline } = useNetworkStatus();
  const celebracion = useCelebracion(id);
  const mensajes = useCelebracionMensajes(celebracion.data?.puede_ver_todos ? id : undefined);
  const publicar = usePublicarMensajeCelebracion(id ?? '');
  const [texto, setTexto] = useState('');
  const [foto, setFoto] = useState<LocalUploadFile | null>(null);

  const data = celebracion.data;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
  const primerNombre = data?.homenajeado.nombre.split(' ')[0] ?? 'tu compañero';
  const puedePublicar = Boolean(data?.puede_escribir) && !isOffline && (texto.trim().length > 0 || foto !== null) && !publicar.isPending;
  const items = mensajes.data?.pages.flatMap((page) => page.data ?? []) ?? [];

  const elegirFoto = async (origen: 'camara' | 'galeria') => {
    try {
      const permiso = origen === 'camara' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        toast.error(origen === 'camara' ? 'Necesitamos permiso de cámara para tomar la foto.' : 'Necesitamos permiso para elegir una foto.');
        return;
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.75 };
      const result = origen === 'camara' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
        toast.error('La foto pesa más de 8 MB.');
        return;
      }
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      setFoto({ uri: asset.uri, name: asset.fileName ?? `felicitacion.${extension}`, mimeType });
      haptics.selection();
    } catch (error) {
      logError('celebracion.foto', error);
      toast.error('No fue posible adjuntar la foto.');
    }
  };

  const enviar = () => {
    if (!puedePublicar) return;
    publicar.mutate(
      { mensaje: texto, foto },
      {
        onSuccess: () => {
          haptics.success();
          toast.success('¡Tu felicitación se envió!');
          setTexto('');
          setFoto(null);
        },
        onError: (error) => {
          logError('celebracion.publicar', error);
          haptics.error();
          toast.error(getActionErrorMessage(error));
          void celebracion.refetch();
        },
      },
    );
  };

  const header = data ? (
    <View style={styles.headerBlock}>
      <View style={styles.hero}>
        <Avatar
          name={data.homenajeado.nombre}
          uri={data.homenajeado.foto_url ? `${API_URL}${celebracionesApi.fotoPath(data.id)}` : undefined}
          headers={authHeaders}
          size={88}
          ringColor={Colors.celebration}
        />
        <Text style={styles.heroEyebrow}>
          {data.tipo_etiqueta}
          {data.es_hoy ? ' · Hoy' : ` · ${formatDateLong(data.fecha)}`}
        </Text>
        <Text style={styles.heroName} accessibilityRole="header">
          {data.es_mia ? (data.tipo === 'aniversario_laboral' ? `Hoy cumples ${data.anios} años con nosotros` : `¡Feliz cumpleaños, ${primerNombre}!`) : data.titulo}
        </Text>
        <Text style={styles.heroMeta}>{[data.homenajeado.puesto, data.homenajeado.sucursal].filter(Boolean).join(' · ')}</Text>
        {data.puede_ver_todos && data.mensajes_count !== null ? (
          <View style={styles.countPill}>
            <Ionicons name="chatbubbles-outline" size={14} color={Colors.celebration} />
            <Text style={styles.countText}>
              {data.mensajes_count} {data.mensajes_count === 1 ? 'felicitación' : 'felicitaciones'}
            </Text>
          </View>
        ) : null}
      </View>

      <Card style={styles.tarjetaCard}>
        <Image
          source={{ uri: `${API_URL}${celebracionesApi.tarjetaPath(data.id)}`, headers: authHeaders }}
          style={styles.tarjetaImage}
          contentFit="contain"
          transition={180}
          accessibilityLabel="Tarjeta de la celebración"
        />
      </Card>

      {data.recibe_mensajes && data.puede_escribir ? (
        <Card style={styles.composer}>
          <Text style={styles.composerTitle}>{data.es_mia ? 'Agradece a tus compañeros' : `Felicita a ${primerNombre}`}</Text>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder={data.es_mia ? '¡Gracias a todos!' : `Escribe algo bonito para ${primerNombre}…`}
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={MAX_CHARS}
            style={styles.input}
            accessibilityLabel="Tu mensaje"
          />
          {foto ? (
            <View style={styles.preview}>
              <Image source={{ uri: foto.uri }} style={styles.previewImage} contentFit="cover" />
              <PressableScale accessibilityLabel="Quitar foto" onPress={() => setFoto(null)} style={styles.previewRemove} hitSlop={8}>
                <Ionicons name="close" size={16} color={Colors.white} />
              </PressableScale>
            </View>
          ) : null}
          <View style={styles.composerActions}>
            <PressableScale accessibilityLabel="Tomar foto" onPress={() => void elegirFoto('camara')} style={styles.iconButton}>
              <Ionicons name="camera-outline" size={20} color={Colors.primaryDark} />
            </PressableScale>
            <PressableScale accessibilityLabel="Elegir foto de la galería" onPress={() => void elegirFoto('galeria')} style={styles.iconButton}>
              <Ionicons name="image-outline" size={20} color={Colors.primaryDark} />
            </PressableScale>
            <Text style={styles.counter}>
              {texto.length}/{MAX_CHARS}
            </Text>
            <Button title="Enviar" leftIcon="send" fullWidth={false} disabled={!puedePublicar} loading={publicar.isPending} onPress={enviar} style={styles.publishButton} />
          </View>
          {isOffline ? <Text style={styles.offline}>Sin conexión: podrás enviarlo cuando vuelva la red.</Text> : null}
        </Card>
      ) : data.mi_mensaje ? (
        <Card style={styles.message}>
          <Text style={styles.authorName}>Tu mensaje</Text>
          {data.mi_mensaje.mensaje ? <Text style={styles.messageText}>{data.mi_mensaje.mensaje}</Text> : null}
        </Card>
      ) : null}
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Celebración" showBack onBackPress={() => volverAtras(router)} />
      {celebracion.isLoading ? (
        <View style={styles.loading}>
          <SkeletonBlock height={220} radius={Radius.xl} />
          <SkeletonCardList count={2} />
        </View>
      ) : celebracion.isError ? (
        <View style={styles.loading}>
          {isNotFoundError(celebracion.error) ? (
            <EmptyState icon="sparkles-outline" title="Esta celebración ya no está disponible" message="Puede que ya haya pasado o que no tengas acceso a verla." />
          ) : (
            <ErrorState message={getErrorMessage(celebracion.error)} onRetry={() => void celebracion.refetch()} />
          )}
        </View>
      ) : (
        <FlatList
          data={data?.puede_ver_todos ? items : []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          refreshControl={<RefreshControl refreshing={celebracion.isRefetching} onRefresh={() => void celebracion.refetch()} tintColor={Colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (mensajes.hasNextPage && !mensajes.isFetchingNextPage) void mensajes.fetchNextPage();
          }}
          ListEmptyComponent={
            data?.puede_ver_todos && mensajes.isLoading ? (
              <SkeletonCardList count={2} />
            ) : data?.puede_ver_todos ? (
              <EmptyState icon="chatbubble-ellipses-outline" message="Aún no hay felicitaciones." />
            ) : null
          }
          ListFooterComponent={mensajes.isFetchingNextPage ? <ActivityIndicator style={{ marginTop: Spacing.lg }} color={Colors.primary} /> : null}
          renderItem={({ item }) => <MensajeCard mensaje={item} token={token} />}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function MensajeCard({ mensaje, token }: { mensaje: CelebracionMensaje; token: string | null }) {
  const styles = useEstilos(crearEstilos);
  return (
    <Card style={styles.message}>
      <View style={styles.messageHeader}>
        <Avatar name={mensaje.autor.nombre ?? undefined} size={36} />
        <View style={styles.messageAuthor}>
          <Text style={styles.authorName} numberOfLines={1}>
            {mensaje.es_mio ? 'Tú' : (mensaje.autor.nombre ?? 'Colaborador')}
          </Text>
          <Text style={styles.authorMeta} numberOfLines={1}>
            {[mensaje.autor.puesto, formatDateTime(mensaje.creado_en)].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      {mensaje.mensaje ? <Text style={styles.messageText}>{mensaje.mensaje}</Text> : null}
      {mensaje.foto_url ? (
        <Image
          source={{ uri: mensaje.foto_url, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
          style={styles.messagePhoto}
          contentFit="cover"
          transition={180}
          accessibilityLabel={`Foto de ${mensaje.autor.nombre ?? 'un compañero'}`}
        />
      ) : null}
    </Card>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { padding: Spacing.lg, gap: Spacing.lg, width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center' },
  list: { width: '100%', maxWidth: Layout.maxFormWidth, alignSelf: 'center', padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerBlock: { gap: Spacing.lg, marginBottom: Spacing.lg },
  hero: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.celebrationSoft,
  },
  heroEyebrow: {
    marginTop: Spacing.md,
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.celebration,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  heroMeta: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  countPill: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  countText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text },
  tarjetaCard: { alignItems: 'center', padding: Spacing.sm },
  tarjetaImage: { width: '100%', aspectRatio: 4 / 5, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted },
  composer: { gap: Spacing.sm },
  composerTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  input: {
    minHeight: 80,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  preview: { alignSelf: 'flex-start' },
  previewImage: { width: 120, height: 120, borderRadius: Radius.md },
  previewRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconButton: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  counter: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
  publishButton: { minHeight: 44, paddingHorizontal: Spacing.lg },
  offline: { fontSize: FontSize.xs, color: Colors.warning },
  message: { gap: Spacing.sm },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  messageAuthor: { flex: 1, minWidth: 0 },
  authorName: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text },
  authorMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  messageText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
  messagePhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted },
});
