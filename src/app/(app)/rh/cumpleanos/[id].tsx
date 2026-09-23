import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useGestionarMuro } from '@/hooks/queries/useBirthdayWall';
import { useRhCumpleano, useRhCumpleanoEnviar } from '@/hooks/queries/useRhCumpleanos';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { confirmAction } from '@/utils/confirm';
import { formatDateLong } from '@/utils/dates';
import { getErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/** Destino real del push `{"type":"rh_cumpleanos","resource_id":<greeting_id>}` (AGENTS.md de este encargo, sección 6). */
export default function RhCumpleanoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((state) => state.token);
  const { data: greeting, isLoading, isError, error, refetch, isRefetching } = useRhCumpleano(id);
  const enviar = useRhCumpleanoEnviar(id);
  const gestionarMuro = useGestionarMuro(id ?? '');
  const muro = greeting?.muro;

  const handleMuro = async (accion: 'abrir' | 'cerrar') => {
    const nombre = greeting?.colaborador.nombre ?? 'el colaborador';
    const ok = await confirmAction(
      accion === 'abrir'
        ? {
            title: 'Abrir muro de felicitaciones',
            message: `Todos los colaboradores recibirán un aviso y podrán dejarle mensajes y fotos a ${nombre}.`,
            confirmLabel: 'Abrir muro',
          }
        : {
            title: 'Cerrar muro',
            message: 'Ya no se podrán dejar mensajes nuevos. Los que ya están se conservan.',
            confirmLabel: 'Cerrar muro',
            destructive: true,
          },
    );
    if (!ok) return;
    gestionarMuro.mutate(accion, {
      onSuccess: () => {
        haptics.success();
        toast.success(accion === 'abrir' ? 'Muro abierto. Avisamos a todos.' : 'Muro cerrado.');
        void refetch();
      },
      onError: (err) => {
        logError('rhCumpleano.muro', err);
        haptics.error();
        toast.error(getErrorMessage(err));
      },
    });
  };
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // El backend real todavía no manda `acciones_permitidas` en este recurso
  // (confirmado contra `Rh\CumpleanosController::show`) — el botón "Enviar"
  // solo aparece si algún día lo agrega, nunca se inventa.
  const canEnviar = Array.isArray(greeting?.acciones_permitidas) && greeting.acciones_permitidas.includes('enviar');

  const handleEnviar = () => {
    enviar.mutate(undefined, {
      onSuccess: () => {
        haptics.success();
        toast.success('Felicitación enviada.');
      },
      onError: (err) => {
        logError('rhCumpleano.enviar', err);
        haptics.error();
        toast.error(getErrorMessage(err));
      },
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Felicitación" showBack onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={260} radius={Radius.xl} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !greeting ? null : (
          <>
            <Card style={styles.profileCard}>
              <ProfileAvatar name={greeting.colaborador.nombre} fotoUrlApi={greeting.colaborador.foto_url_api} size={72} />
              <Text style={styles.name}>{greeting.colaborador.nombre}</Text>
              <Text style={styles.meta}>
                {[greeting.colaborador.puesto, greeting.colaborador.departamento, greeting.colaborador.sucursal].filter(Boolean).join(' · ')}
              </Text>
              <Text style={styles.date}>{formatDateLong(greeting.fecha)}</Text>
            </Card>

            <View style={styles.cardWrapper}>
              {greeting.card_url ? (
                <Image
                  source={{ uri: greeting.card_url, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
                  style={styles.cardImage}
                  contentFit="contain"
                  onLoad={() => setImageStatus('ready')}
                  onError={() => setImageStatus('error')}
                  accessibilityLabel={`Tarjeta de felicitación de ${greeting.colaborador.nombre}`}
                />
              ) : null}
              {(!greeting.card_url || imageStatus === 'loading') && greeting.card_url ? (
                <View style={styles.cardOverlay}>
                  <SkeletonBlock height={220} radius={Radius.xl} />
                </View>
              ) : null}
              {!greeting.card_url || imageStatus === 'error' ? (
                <View style={styles.cardFallback}>
                  <Ionicons name="gift-outline" size={36} color={Colors.primaryDark} />
                  <Text style={styles.cardFallbackText}>Tarjeta no disponible todavía</Text>
                </View>
              ) : null}
            </View>

            {greeting.frase ? <Text style={styles.frase}>&ldquo;{greeting.frase}&rdquo;</Text> : null}

            <View style={styles.statusRow}>
              <Ionicons
                name={greeting.enviada ? 'checkmark-done-circle' : 'time-outline'}
                size={18}
                color={greeting.enviada ? Colors.success : Colors.textMuted}
              />
              <Text style={styles.statusText}>{greeting.enviada ? 'Felicitación enviada al colaborador' : 'Todavía no se ha enviado'}</Text>
            </View>

            {muro ? (
              <Card style={styles.muroCard}>
                <View style={styles.statusRow}>
                  <Ionicons name={muro.abierto ? 'chatbubbles' : 'chatbubbles-outline'} size={18} color={muro.abierto ? Colors.celebration : Colors.textMuted} />
                  <Text style={styles.muroTitle}>Muro de felicitaciones</Text>
                </View>
                <Text style={styles.statusText}>
                  {muro.abierto
                    ? `Abierto · ${muro.mensajes_count} ${muro.mensajes_count === 1 ? 'mensaje' : 'mensajes'}`
                    : muro.publicado
                      ? `Cerrado · ${muro.mensajes_count} ${muro.mensajes_count === 1 ? 'mensaje' : 'mensajes'}`
                      : 'Ábrelo para que todos puedan dejarle un mensaje o una foto.'}
                </Text>
                <View style={styles.muroActions}>
                  {muro.publicado ? (
                    <Button
                      title="Ver muro"
                      variant="outline"
                      leftIcon="eye-outline"
                      fullWidth={false}
                      style={styles.muroButton}
                      onPress={() => router.push(`/muro-cumpleanos/${greeting.greeting_id}` as never)}
                    />
                  ) : null}
                  {muro.puede_gestionar && !muro.abierto ? (
                    <Button
                      title={muro.publicado ? 'Reabrir muro' : 'Abrir muro'}
                      leftIcon="megaphone-outline"
                      fullWidth={false}
                      style={styles.muroButton}
                      loading={gestionarMuro.isPending}
                      onPress={() => void handleMuro('abrir')}
                    />
                  ) : null}
                  {muro.puede_gestionar && muro.abierto ? (
                    <Button
                      title="Cerrar muro"
                      variant="ghost"
                      leftIcon="lock-closed-outline"
                      fullWidth={false}
                      style={styles.muroButton}
                      loading={gestionarMuro.isPending}
                      onPress={() => void handleMuro('cerrar')}
                    />
                  ) : null}
                </View>
              </Card>
            ) : null}

            {canEnviar ? (
              <Button title="Enviar felicitación" leftIcon="paper-plane-outline" onPress={handleEnviar} loading={enviar.isPending} disabled={enviar.isPending} />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  muroCard: {
    gap: Spacing.sm,
  },
  muroTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  muroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  muroButton: {
    flexGrow: 1,
    flexBasis: 130,
    minHeight: 44,
  },
  profileCard: {
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  cardWrapper: {
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 260,
    borderRadius: Radius.xl,
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardFallback: {
    width: '100%',
    height: 200,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  cardFallbackText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  frase: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  statusText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
