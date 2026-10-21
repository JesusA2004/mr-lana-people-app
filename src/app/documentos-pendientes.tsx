import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cartaCompromisoApi } from '@/api/cartaCompromiso';
import { queryKeys } from '@/api/queryKeys';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { CartaCompromisoVisor, type VisorCartaCompromiso } from '@/components/CartaCompromisoVisor';
import { DocumentUploadSheet, type PickedDocumentFile } from '@/components/DocumentUploadSheet';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { IconoTono, Pill, TarjetaAviso, type Tono } from '@/components/ui';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useUploadDocumento } from '@/hooks/queries/useIncorporacion';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { CartaCompromiso, DocumentoPendienteCarta } from '@/types/cartaCompromiso';
import { cartaRecienGenerada, encabezadoPendientes, puedeSubirPendiente, textoDiasRestantes } from '@/utils/cartaCompromiso';
import { confirmAction } from '@/utils/confirm';
import { formatDateLong } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

function tonoEstado(estado: string): Tono {
  if (estado === 'rechazado' || estado === 'requiere_correccion' || estado === 'vencido') return 'peligro';
  if (estado === 'en_revision' || estado === 'cargado' || estado === 'cambio_solicitado') return 'info';
  if (estado === 'aprobado') return 'exito';
  return 'aviso';
}

/**
 * DOCUMENTOS PENDIENTES (carta compromiso).
 *
 * - Cuenta BLOQUEADA (`user.bloqueo_documentos.activo`): es la única
 *   pantalla de la app (`Stack.Protected` en `_layout.tsx`); el backend
 *   además responde 403 «documentos_pendientes» al resto de la API. Al subir
 *   lo que falta, `GET colaborador/carta-compromiso` + `/me` liberan la
 *   puerta solos y se entra a Inicio.
 * - Sin bloqueo (carta vigente): pantalla normal a la que lleva el banner
 *   de Inicio, con «Regresar».
 *
 * La subida reutiliza `DocumentUploadSheet` y el mismo endpoint del
 * expediente (`POST colaborador/incorporacion/documentos/{id}/subir`).
 */
export default function DocumentosPendientesScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bloqueoUsuario = useAuthStore((state) => state.user?.bloqueo_documentos ?? null);
  const aplicarBloqueoDocumentos = useAuthStore((state) => state.aplicarBloqueoDocumentos);
  const refrescarUsuario = useAuthStore((state) => state.refrescarUsuario);
  const logout = useAuthStore((state) => state.logout);
  const onboardingCompleto = useOnboardingStore((state) => state.completed);
  const bloqueado = bloqueoUsuario?.activo === true;

  const query = useQuery({ queryKey: queryKeys.cartaCompromiso, queryFn: cartaCompromisoApi.estado });
  const upload = useUploadDocumento();
  const [documentoActivo, setDocumentoActivo] = useState<DocumentoPendienteCarta | null>(null);
  const [visor, setVisor] = useState<VisorCartaCompromiso | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const data = query.data;
  const carta = data?.carta ?? null;
  const pendientes = data?.documentos_pendientes ?? [];
  // El bloqueo más reciente (endpoint) manda sobre el de `/me`.
  const bloqueo = data?.bloqueo ?? bloqueoUsuario;
  const encabezado = encabezadoPendientes(bloqueo, carta);

  // Carta generada sola (motivo `excede_maximo_carta`: al bajar sus
  // faltantes al máximo, el backend la genera): antes de liberar la app se
  // muestra la carta (folio, fecha límite, descarga) y la persona continúa.
  const [cartaNueva, setCartaNueva] = useState<CartaCompromiso | null>(null);
  const previoRef = useRef<{ bloqueo: typeof bloqueoUsuario; carta: CartaCompromiso | null }>({ bloqueo: bloqueoUsuario, carta: null });

  // Lo que diga el endpoint se refleja en la sesión: si ya no hay bloqueo,
  // la puerta de `_layout.tsx` se libera sola (salvo mientras se muestra la
  // carta recién generada: se libera al tocar «Continuar a la app»).
  useEffect(() => {
    if (!data) return;
    const nueva = cartaRecienGenerada(previoRef.current, data);
    previoRef.current = { bloqueo: data.bloqueo, carta: data.carta };
    if (nueva) {
      haptics.success();
      setCartaNueva(nueva);
      return;
    }
    if (!cartaNueva) aplicarBloqueoDocumentos(data.bloqueo);
  }, [data, cartaNueva, aplicarBloqueoDocumentos]);

  // Bloqueado → liberado: aviso y a Inicio.
  const estabaBloqueado = useRef(bloqueado);
  useEffect(() => {
    if (estabaBloqueado.current && !bloqueado) {
      haptics.success();
      toast.success('¡Listo! Recuperaste el acceso completo a la app.');
      if (onboardingCompleto) router.replace('/');
    }
    estabaBloqueado.current = bloqueado;
  }, [bloqueado, onboardingCompleto, router]);

  const actualizar = async () => {
    await Promise.all([query.refetch(), refrescarUsuario()]);
  };

  const onRefresh = async () => {
    setRefrescando(true);
    try {
      await actualizar();
    } finally {
      setRefrescando(false);
    }
  };

  const subir = async (file: PickedDocumentFile, onProgress: (percent: number) => void) => {
    if (!documentoActivo) return;
    await upload.mutateAsync({
      documentTypeId: documentoActivo.document_type_id,
      fileUri: file.uri,
      fileName: file.name,
      mimeType: file.mimeType,
      onProgress,
    });
    toast.success(`Recibimos «${documentoActivo.nombre}». Recursos Humanos lo revisará.`);
    // Esperando la carta automática: solo se consulta el endpoint (si la
    // carta aparece, se muestra antes de refrescar la sesión y liberar la app).
    const esperaCarta = bloqueo?.activo === true && bloqueo.motivo === 'excede_maximo_carta' && !carta;
    if (esperaCarta) await query.refetch();
    else await actualizar();
  };

  const continuarConCarta = () => {
    if (data?.bloqueo) aplicarBloqueoDocumentos(data.bloqueo);
    setCartaNueva(null);
    void refrescarUsuario();
  };

  const salir = async () => {
    const ok = await confirmAction({
      title: 'Cerrar sesión',
      message: 'Puedes volver a entrar con tu usuario y contraseña para subir tus documentos.',
      confirmLabel: 'Cerrar sesión',
    });
    if (ok) await logout();
  };

  const regresar = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const porSubir = pendientes.filter((d) => puedeSubirPendiente(d.estado)).length;

  if (cartaNueva) {
    return (
      <View style={styles.container}>
        <AppHeader title="Carta compromiso" showBack={false} />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Spacing.xxl + insets.bottom }]}>
          <View style={styles.contenido}>
            <TarjetaAviso
              icono="checkmark-done-outline"
              tono="exito"
              titulo="¡Listo! Generamos tu carta compromiso"
              mensaje="Ya te faltan pocos documentos: con esta carta puedes usar la app mientras los entregas."
            />
            <View style={styles.tarjeta}>
              <View style={styles.datoFila}>
                <Text style={styles.datoEtiqueta}>Folio</Text>
                <Text style={styles.datoValor}>{cartaNueva.folio}</Text>
              </View>
              <View style={styles.datoFila}>
                <Text style={styles.datoEtiqueta}>Fecha límite</Text>
                <Text style={styles.datoValor}>{formatDateLong(cartaNueva.fecha_limite) || cartaNueva.fecha_limite}</Text>
              </View>
              <View style={styles.datoFila}>
                <Text style={styles.datoEtiqueta}>Días para entregarlos</Text>
                <Text style={styles.datoValor}>{cartaNueva.dias_restantes === 1 ? '1 día' : `${cartaNueva.dias_restantes} días`}</Text>
              </View>
              <View style={styles.lista}>
                <Text style={styles.seccion}>{cartaNueva.documentos.length === 1 ? 'Documento por entregar' : 'Documentos por entregar'}</Text>
                {cartaNueva.documentos.map((documento) => (
                  <View key={documento.document_type_id} style={styles.fila}>
                    <IconoTono icono="document-text-outline" tono="aviso" tamano={32} />
                    <Text style={[styles.titulo, styles.textos]}>{documento.nombre}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.ayuda}>
                Súbelos antes de la fecha límite. Si la carta vence, la app volverá a quedar limitada a subir documentos hasta que los entregues.
              </Text>
              <Button
                title="Descargar carta compromiso"
                variant="outline"
                leftIcon="download-outline"
                onPress={() => setVisor({ tipo: 'carta', folio: cartaNueva.folio })}
              />
            </View>
            <Button title="Continuar a la app" rightIcon="log-in-outline" onPress={continuarConCarta} />
          </View>
        </ScrollView>
        <CartaCompromisoVisor visor={visor} onClose={() => setVisor(null)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Documentos pendientes"
        showBack={!bloqueado}
        onBackPress={regresar}
        right={
          bloqueado ? (
            <PressableScale accessibilityLabel="Cerrar sesión" haptic={false} onPress={() => void salir()} style={styles.salir}>
              <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.salirTexto}>Salir</Text>
            </PressableScale>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.xxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => void onRefresh()} tintColor={Colors.primary} />}>
        <View style={styles.contenido}>
          <TarjetaAviso
            icono={bloqueado ? 'lock-closed-outline' : 'time-outline'}
            tono={encabezado.tono}
            titulo={encabezado.titulo}
            mensaje={encabezado.mensaje}
          />

          {query.isLoading ? (
            <View style={styles.lista}>
              <SkeletonBlock height={96} radius={Radius.lg} />
              <SkeletonBlock height={96} radius={Radius.lg} />
            </View>
          ) : query.isError && !data ? (
            <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <>
              {carta ? (
                <View style={styles.tarjeta}>
                  <View style={styles.fila}>
                    <IconoTono icono="document-text-outline" tono={bloqueado ? 'peligro' : 'aviso'} tamano={44} />
                    <View style={styles.textos}>
                      <Text style={styles.titulo}>{`Carta compromiso ${carta.folio}`}</Text>
                      <Text style={styles.ayuda}>
                        {`Fecha límite: ${formatDateLong(carta.fecha_limite) || carta.fecha_limite}`}
                        {carta.dias_restantes > 0 && !bloqueado ? ` · ${textoDiasRestantes(carta.dias_restantes)}` : ''}
                      </Text>
                      <Pill texto={carta.estado_etiqueta} tono={bloqueado ? 'peligro' : 'aviso'} />
                    </View>
                  </View>
                  <Button
                    title="Descargar carta compromiso"
                    variant="outline"
                    leftIcon="download-outline"
                    onPress={() => setVisor({ tipo: 'carta', folio: carta.folio })}
                  />
                </View>
              ) : null}

              {pendientes.length > 0 ? (
                <View style={styles.lista}>
                  <Text style={styles.seccion} accessibilityRole="header">
                    {porSubir === 1 ? '1 documento por subir' : porSubir > 1 ? `${porSubir} documentos por subir` : 'Tus documentos'}
                  </Text>
                  {pendientes.map((documento) => {
                    const subible = puedeSubirPendiente(documento.estado);
                    return (
                      <View key={documento.document_type_id} style={styles.tarjeta}>
                        <View style={styles.fila}>
                          <IconoTono icono={subible ? 'cloud-upload-outline' : 'hourglass-outline'} tono={subible ? 'primario' : 'info'} tamano={44} />
                          <View style={styles.textos}>
                            <Text style={styles.titulo}>{documento.nombre}</Text>
                            {documento.descripcion ? <Text style={styles.ayuda}>{documento.descripcion}</Text> : null}
                            <Pill texto={documento.estado_etiqueta} tono={tonoEstado(documento.estado)} />
                          </View>
                        </View>
                        {subible ? (
                          <Button title="Subir documento" leftIcon="cloud-upload-outline" onPress={() => setDocumentoActivo(documento)} />
                        ) : (
                          <Text style={styles.ayuda}>Ya lo recibimos. Recursos Humanos lo está revisando.</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={[styles.tarjeta, styles.listo]}>
                  <View style={styles.fila}>
                    <IconoTono icono="checkmark-done-outline" tono="exito" tamano={44} />
                    <View style={styles.textos}>
                      <Text style={styles.titulo}>No tienes documentos por subir</Text>
                      <Text style={styles.ayuda}>
                        {bloqueado ? 'Estamos actualizando tu acceso. Desliza hacia abajo o toca «Actualizar».' : 'Todo está en orden con tu expediente.'}
                      </Text>
                    </View>
                  </View>
                  {bloqueado ? <Button title="Actualizar" variant="outline" leftIcon="refresh-outline" onPress={() => void onRefresh()} loading={refrescando} /> : null}
                </View>
              )}

              {bloqueado ? (
                <Text style={styles.nota}>Si crees que es un error o ya entregaste tus documentos en persona, comunícate con Recursos Humanos.</Text>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <DocumentUploadSheet
        visible={documentoActivo !== null}
        title={documentoActivo?.nombre ?? ''}
        onClose={() => setDocumentoActivo(null)}
        onConfirm={subir}
      />
      <CartaCompromisoVisor visor={visor} onClose={() => setVisor(null)} />
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Spacing.lg },
    contenido: { width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap: Spacing.lg },
    salir: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: Layout.minTouchTarget, paddingHorizontal: Spacing.sm },
    salirTexto: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
    lista: { gap: Spacing.md },
    seccion: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
    tarjeta: {
      gap: Spacing.md,
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.lg,
    },
    listo: { borderColor: Colors.successSoft },
    fila: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    textos: { flex: 1, minWidth: 0, gap: Spacing.xs, alignItems: 'flex-start' },
    titulo: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    ayuda: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    nota: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19, textAlign: 'center' },
    datoFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
    datoEtiqueta: { fontSize: FontSize.sm, color: Colors.textMuted },
    datoValor: { flexShrink: 1, fontSize: FontSize.md, fontWeight: '800', color: Colors.text, textAlign: 'right' },
  });
