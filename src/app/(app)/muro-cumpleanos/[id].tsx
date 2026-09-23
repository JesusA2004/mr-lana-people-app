import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import type { LocalUploadFile } from '@/api/upload';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice } from '@/components/ciclo/Screen';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useBirthdayWall, useBirthdayWallMessages, useEliminarMensajeMuro, usePublicarEnMuro } from '@/hooks/queries/useBirthdayWall';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import type { BirthdayWallMessage } from '@/types/birthdayWall';
import { confirmAction } from '@/utils/confirm';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getActionErrorMessage, getErrorMessage, isNotFoundError, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

const MAX_CHARS = 500;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/**
 * Muro de felicitaciones de cumpleaños: lo abre RH y cualquier colaborador
 * deja un mensaje y/o una foto para el cumpleañero. Ruta compartida por Mi
 * espacio y Gestión RH (destino del push `cumpleanos_muro`).
 */
export default function MuroCumpleanosScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((state) => state.token);
  const { isOffline } = useNetworkStatus();
  const wall = useBirthdayWall(id);
  const mensajes = useBirthdayWallMessages(id);
  const publicar = usePublicarEnMuro(id ?? '');
  const eliminar = useEliminarMensajeMuro(id ?? '');
  const [texto, setTexto] = useState('');
  const [foto, setFoto] = useState<LocalUploadFile | null>(null);

  const data = wall.data;
  const items = mensajes.data?.pages.flatMap((page) => page.data ?? []) ?? [];
  const nombre = data?.cumpleanero.nombre ?? 'tu compañero';
  const primerNombre = nombre.split(' ')[0];
  const puedePublicar = Boolean(data?.abierto) && !isOffline && (texto.trim().length > 0 || foto !== null) && !publicar.isPending;

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
      logError('muroCumpleanos.foto', error);
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
          toast.success('¡Tu felicitación ya está en el muro!');
          setTexto('');
          setFoto(null);
        },
        onError: (error) => {
          logError('muroCumpleanos.publicar', error);
          haptics.error();
          toast.error(getActionErrorMessage(error));
          void wall.refetch();
        },
      },
    );
  };

  const borrar = async (mensaje: BirthdayWallMessage) => {
    const ok = await confirmAction({
      title: 'Eliminar mensaje',
      message: mensaje.es_mio ? 'Tu mensaje se quitará del muro.' : 'El mensaje se quitará del muro para todos.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    eliminar.mutate(mensaje.id, {
      onSuccess: () => toast.success('Mensaje eliminado.'),
      onError: (error) => toast.error(getActionErrorMessage(error)),
    });
  };

  const header = data ? (
    <View style={styles.headerBlock}>
      <View style={styles.hero}>
        <View style={styles.heroConfetti} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons name="sparkles" size={18} color={Colors.celebration} style={styles.sparkA} />
          <Ionicons name="gift" size={16} color={Colors.primaryDark} style={styles.sparkB} />
          <Ionicons name="sparkles" size={14} color={Colors.warning} style={styles.sparkC} />
        </View>
        <Avatar
          name={data.cumpleanero.nombre ?? undefined}
          uri={data.cumpleanero.foto_url ?? undefined}
          headers={token ? { Authorization: `Bearer ${token}` } : undefined}
          size={88}
          ringColor={Colors.celebration}
        />
        <Text style={styles.heroEyebrow}>{data.es_mi_muro ? 'Tus compañeros te felicitan' : data.es_hoy ? 'Hoy cumple años' : 'Cumpleaños'}</Text>
        <Text style={styles.heroName} accessibilityRole="header">
          {data.es_mi_muro ? `¡Feliz cumpleaños, ${primerNombre}!` : nombre}
        </Text>
        <Text style={styles.heroMeta}>{[data.cumpleanero.puesto, data.cumpleanero.sucursal].filter(Boolean).join(' · ') || formatDateLong(data.fecha)}</Text>
        <View style={styles.countPill}>
          <Ionicons name="chatbubbles-outline" size={14} color={Colors.celebration} />
          <Text style={styles.countText}>
            {data.mensajes_count} {data.mensajes_count === 1 ? 'felicitación' : 'felicitaciones'}
          </Text>
        </View>
      </View>

      {data.abierto ? (
        <Card style={styles.composer}>
          <Text style={styles.composerTitle}>{data.es_mi_muro ? 'Agradece a tus compañeros' : `Felicita a ${primerNombre}`}</Text>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder={data.es_mi_muro ? '¡Gracias a todos!' : `Escribe algo bonito para ${primerNombre}…`}
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={MAX_CHARS}
            style={styles.input}
            accessibilityLabel="Mensaje de felicitación"
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
            <Button title="Publicar" leftIcon="send" fullWidth={false} disabled={!puedePublicar} loading={publicar.isPending} onPress={enviar} style={styles.publishButton} />
          </View>
          {isOffline ? <Text style={styles.offline}>Sin conexión: podrás publicar cuando vuelva la red.</Text> : null}
        </Card>
      ) : (
        <Notice tone="info">Recursos Humanos cerró este muro. Las felicitaciones se quedan aquí para {data.es_mi_muro ? 'ti' : primerNombre}.</Notice>
      )}
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Muro de cumpleaños" showBack onBackPress={() => router.back()} />
      {wall.isLoading ? (
        <View style={styles.loading}>
          <SkeletonBlock height={220} radius={Radius.xl} />
          <SkeletonCardList count={3} />
        </View>
      ) : wall.isError ? (
        <View style={styles.loading}>
          {isNotFoundError(wall.error) ? (
            <EmptyState icon="gift-outline" title="Este muro no está disponible" message="Recursos Humanos todavía no lo abre o ya no está visible." />
          ) : (
            <ErrorState message={getErrorMessage(wall.error)} onRetry={() => void wall.refetch()} />
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={wall.isRefetching || mensajes.isRefetching}
              onRefresh={() => {
                void wall.refetch();
                void mensajes.refetch();
              }}
              tintColor={Colors.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (mensajes.hasNextPage && !mensajes.isFetchingNextPage) void mensajes.fetchNextPage();
          }}
          ListEmptyComponent={
            mensajes.isLoading ? (
              <SkeletonCardList count={2} />
            ) : (
              <EmptyState icon="chatbubble-ellipses-outline" message={data?.es_mi_muro ? 'Aún no hay mensajes. ¡Pronto llegarán!' : `Sé el primero en felicitar a ${primerNombre}.`} />
            )
          }
          ListFooterComponent={mensajes.isFetchingNextPage ? <ActivityIndicator style={{ marginTop: Spacing.lg }} color={Colors.primary} /> : null}
          renderItem={({ item }) => <MensajeCard mensaje={item} token={token} onDelete={() => void borrar(item)} />}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function MensajeCard({ mensaje, token, onDelete }: { mensaje: BirthdayWallMessage; token: string | null; onDelete: () => void }) {
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
        {mensaje.puede_eliminar ? (
          <PressableScale accessibilityLabel="Eliminar mensaje" onPress={onDelete} hitSlop={10} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </PressableScale>
        ) : null}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
  },
  list: {
    width: '100%',
    maxWidth: Layout.maxFormWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  headerBlock: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.celebrationSoft,
    overflow: 'hidden',
  },
  heroConfetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkA: { position: 'absolute', top: 18, left: 28 },
  sparkB: { position: 'absolute', top: 30, right: 34 },
  sparkC: { position: 'absolute', bottom: 26, left: 48 },
  heroEyebrow: {
    marginTop: Spacing.md,
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.celebration,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  heroMeta: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
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
  countText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text,
  },
  composer: {
    gap: Spacing.sm,
  },
  composerTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
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
  preview: {
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: Radius.md,
  },
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
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  publishButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
  },
  offline: {
    fontSize: FontSize.xs,
    color: Colors.warning,
  },
  message: {
    gap: Spacing.sm,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  messageAuthor: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  authorMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  messagePhoto: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
});
