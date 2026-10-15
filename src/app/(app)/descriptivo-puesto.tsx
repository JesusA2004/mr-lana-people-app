import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyMessage, Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { Input } from '@/components/Input';
import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useAcusarDescriptivoPuesto, useMarcarDescriptivoLeido, useMiDescriptivoPuesto } from '@/hooks/queries/useDescriptivoPuesto';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { formatDateLong } from '@/utils/dates';
import { PLACEHOLDER_ENTERADO, descriptivoPendiente, puedeEnviarAcuse } from '@/utils/descriptivoPuesto';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/**
 * Mi descriptivo de puesto: el que Recursos Humanos te envió al aprobar tu
 * inducción (contenido del PDF oficial, tal cual). Lo lees, marcas «OK,
 * enterado» y escribes tu comentario. El servidor exige las dos cosas y
 * registra la fecha; la app solo lo refleja.
 */
export default function DescriptivoPuestoScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const query = useMiDescriptivoPuesto();
  const { mutate: marcarLeido } = useMarcarDescriptivoLeido();
  const acusar = useAcusarDescriptivoPuesto();
  const { isOffline } = useNetworkStatus();
  const [enterado, setEnterado] = useState(false);
  const [comentario, setComentario] = useState('');
  const marcado = useRef<number | null>(null);

  const acuse = query.data ?? null;
  const pendiente = descriptivoPendiente(acuse);

  // Al abrirlo por primera vez, el servidor registra la lectura (una sola vez).
  useEffect(() => {
    if (acuse && acuse.leidoEn === null && marcado.current !== acuse.id) {
      marcado.current = acuse.id;
      marcarLeido(acuse.id, { onError: (error) => logError('descriptivoPuesto.leido', error) });
    }
  }, [acuse, marcarLeido]);

  const enviar = () => {
    if (!acuse || !puedeEnviarAcuse(enterado, comentario)) return;
    acusar.mutate(
      { acuseId: acuse.id, comentario: comentario.trim() },
      {
        onSuccess: () => {
          haptics.success();
          toast.success('Listo: Recursos Humanos ya sabe que estás enterado.');
        },
        onError: (error) => {
          logError('descriptivoPuesto.acusar', error);
          haptics.error();
          toast.error(getActionErrorMessage(error));
        },
      },
    );
  };

  const refrescar = () => {
    void query.refetch();
  };
  const descriptivo = acuse?.descriptivo;
  const errorEnterado = getFieldError(acusar.error, 'enterado');

  return (
    <Screen
      title="Mi descriptivo de puesto"
      isLoading={query.isLoading}
      error={query.error}
      onRetry={refrescar}
      refreshing={query.isRefetching}
      onRefresh={refrescar}>
      {!acuse || !descriptivo ? (
        <EmptyMessage message="Recursos Humanos te enviará aquí el descriptivo de tu puesto cuando apruebes tu evaluación de inducción." />
      ) : (
        <>
          <Card style={styles.hero}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Ionicons name="briefcase-outline" size={22} color={Colors.primaryDark} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.kicker}>Descriptivo de puesto</Text>
                <Text style={styles.titulo} accessibilityRole="header">
                  {descriptivo.nombrePuesto}
                </Text>
                {descriptivo.area || descriptivo.fecha ? (
                  <Text style={styles.texto}>
                    {[descriptivo.area, descriptivo.fecha ? `Revisión ${descriptivo.fecha}` : null].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.texto}>
              Aquí están tus actividades y lo que te corresponde en tu puesto. Léelo con calma; al final confirma que estás enterado.
            </Text>
          </Card>

          {descriptivo.objetivo ? (
            <Card style={styles.bloque}>
              <SectionTitle>Objetivo del puesto</SectionTitle>
              <Text style={styles.parrafo}>{descriptivo.objetivo}</Text>
            </Card>
          ) : null}

          {descriptivo.personalACargo ? (
            <Card style={styles.bloque}>
              <SectionTitle>Personal a cargo</SectionTitle>
              <Text style={styles.parrafo}>{descriptivo.personalACargo}</Text>
            </Card>
          ) : null}

          {descriptivo.secciones.map((seccion) => (
            <Card key={seccion.clave} style={styles.bloque}>
              <SectionTitle>{seccion.titulo}</SectionTitle>
              {seccion.elementos.map((elemento, indice) => (
                <View key={`${seccion.clave}-${indice}`} style={styles.item}>
                  <View style={styles.vineta} />
                  <Text style={styles.itemTexto}>{elemento}</Text>
                </View>
              ))}
            </Card>
          ))}

          {pendiente ? (
            <Card style={styles.bloque}>
              <SectionTitle>Confirma que estás enterado</SectionTitle>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={enterado ? 'OK, enterado (marcado)' : 'OK, enterado (sin marcar)'}
                onPress={() => setEnterado((valor) => !valor)}
                style={styles.checkRow}>
                <Ionicons name={enterado ? 'checkbox' : 'square-outline'} size={24} color={enterado ? Colors.primary : Colors.textMuted} />
                <Text style={styles.checkLabel}>OK, enterado</Text>
              </PressableScale>
              {errorEnterado ? <Text style={styles.error}>{errorEnterado}</Text> : null}
              <Input
                label="Tu comentario"
                value={comentario}
                onChangeText={setComentario}
                placeholder={PLACEHOLDER_ENTERADO}
                multiline
                maxLength={2000}
                textAlignVertical="top"
                style={styles.comentario}
                error={getFieldError(acusar.error, 'comentario')}
              />
              {isOffline ? <Notice tone="warning">Sin conexión: tu confirmación necesita llegar al servidor.</Notice> : null}
              <Button
                title="Enviar enterado"
                leftIcon="checkmark-done-outline"
                disabled={!puedeEnviarAcuse(enterado, comentario) || isOffline}
                loading={acusar.isPending}
                onPress={enviar}
              />
            </Card>
          ) : (
            <Card style={styles.bloque}>
              <Notice tone="success">
                Confirmaste que estás enterado{acuse.acusadoEn ? ` el ${formatDateLong(acuse.acusadoEn)}` : ''}.
              </Notice>
              {acuse.comentario ? <Text style={styles.parrafo}>Tu comentario: «{acuse.comentario}»</Text> : null}
            </Card>
          )}

          <Button title="Volver" variant="ghost" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    hero: { gap: Spacing.md },
    heroHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kicker: { fontSize: 11, fontWeight: '800', color: Colors.primaryDark, textTransform: 'uppercase' },
    titulo: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
    texto: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    bloque: { gap: Spacing.sm },
    parrafo: { fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
    item: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    vineta: { width: 6, height: 6, borderRadius: Radius.full, backgroundColor: Colors.primary, marginTop: 8 },
    itemTexto: { flex: 1, fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 48,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: Colors.surfaceMuted,
    },
    checkLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    comentario: { minHeight: 110, paddingVertical: Spacing.sm },
    error: { fontSize: FontSize.xs, color: Colors.danger, fontWeight: '600' },
  });
