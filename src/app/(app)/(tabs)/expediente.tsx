import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { FilaLista, GrupoLista, TarjetaAviso, TarjetaProgreso, type Tono } from '@/components/ui';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useMiExpediente } from '@/hooks/queries/useCicloLaboral';
import { useIncorporacion } from '@/hooks/queries/useIncorporacion';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import type { DocumentoIncorporacion } from '@/types/document';
import { getDevErrorDetail, getErrorMessage } from '@/utils/errors';
import { documentStatusGlyph, progressBreakdown, progressHeadline, toExpedienteProgress, type DocumentGlyphTone } from '@/utils/expedienteProgress';

/** Tono de la UI base para el estado de cada documento (ícono + palabra, nunca solo color). */
const TONO_DOCUMENTO: Record<DocumentGlyphTone, Tono> = {
  success: 'exito',
  warning: 'info',
  danger: 'peligro',
  neutral: 'neutral',
};

/**
 * Mi expediente: cuánto llevo (regla del backend: solo documentos
 * obligatorios APROBADOS cuentan) y una lista compacta con el estado de
 * cada documento en ícono + palabra. Tocar un documento abre su detalle
 * (subir, reemplazar, solicitar cambio).
 */
export default function ExpedienteScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useIncorporacion();
  const estadoReal = useMiExpediente();
  // Correcciones (datos, documentos, foto): mismo contador que el tab Perfil.
  const bootstrap = useMobileBootstrap(true);
  const correccionesPendientes = bootstrap.data?.counts.correcciones_pendientes ?? 0;
  const correccionesAbiertas = bootstrap.data?.counts.correcciones_abiertas ?? 0;

  const progreso = toExpedienteProgress(data?.progreso);
  const breakdown = progressBreakdown(progreso);
  const documentos = data?.documentos ?? [];
  // El expediente pide los documentos requeridos; lo opcional entra por
  // Solicitudes. Excepción: el backend también manda el PAR opcional de un
  // requerido (la «Carta de recomendación 2», backend 2026-10-27) con
  // `obligatorio: false`; se lista junto a los requeridos marcado «(opcional)».
  const requeridos = documentos.filter((d) => d.obligatorio || d.par);
  const abrir = (documento: DocumentoIncorporacion) => router.push({ pathname: '/expediente/[tipoId]', params: { tipoId: String(documento.id) } });

  return (
    <View style={styles.container}>
      <AppHeader title="Mi expediente" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
              void estadoReal.refetch();
            }}
            tintColor={Colors.primary}
          />
        }>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={140} radius={Radius.lg} />
            <SkeletonCardList count={4} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} devDetail={getDevErrorDetail(error)} onRetry={() => void refetch()} />
        ) : data ? (
          <>
            <FadeInView index={0}>
              <TarjetaProgreso
                sobretitulo={progreso.completo ? 'Expediente completo' : 'Mi expediente'}
                titulo={progreso.completo ? `${progreso.completos} de ${progreso.total} documentos aprobados` : progressHeadline(progreso)}
                porcentaje={progreso.sinObligatorios ? null : progreso.porcentaje}
                completo={progreso.completo}
                detalle={
                  !progreso.completo && progreso.pendientes > 0 ? (
                    <Text style={styles.heroPending}>
                      {progreso.pendientes} {progreso.pendientes === 1 ? 'pendiente' : 'pendientes'}
                      {breakdown ? <Text style={styles.heroBreakdown}> · {breakdown}</Text> : null}
                    </Text>
                  ) : undefined
                }
              />
            </FadeInView>

            {estadoReal.data?.expediente_cerrado ? (
              <TarjetaAviso icono="lock-closed-outline" tono="info" titulo="Tu expediente está cerrado" mensaje="Si necesitas algo, contacta a Recursos Humanos." />
            ) : null}
            {progreso.rechazados > 0 ? (
              <TarjetaAviso
                icono="alert-circle-outline"
                tono="peligro"
                titulo={progreso.rechazados === 1 ? 'Un documento necesita corrección' : `${progreso.rechazados} documentos necesitan corrección`}
                mensaje="Tócalo en la lista para ver la observación de Recursos Humanos y subir la versión correcta."
              />
            ) : null}

            {requeridos.length > 0 ? <DocumentList title="Documentos" documentos={requeridos} onOpen={abrir} /> : null}

            <GrupoLista titulo="Correcciones" descripcion="Nadie edita su propio expediente: pides el cambio y Recursos Humanos lo revisa.">
              <FilaLista
                icono="create-outline"
                tono={correccionesPendientes > 0 ? 'aviso' : 'primario'}
                titulo="Mis correcciones"
                subtitulo={
                  correccionesPendientes > 0
                    ? 'Recursos Humanos espera tu respuesta'
                    : correccionesAbiertas > 0
                      ? `${correccionesAbiertas} en revisión`
                      : 'Estado de los cambios que pediste'
                }
                badge={correccionesPendientes}
                onPress={() => router.push('/correcciones')}
              />
            </GrupoLista>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DocumentList({ title, documentos, onOpen }: { title: string; documentos: DocumentoIncorporacion[]; onOpen: (d: DocumentoIncorporacion) => void }) {
  return (
    <GrupoLista titulo={title} descripcion="Toca un documento para subirlo, reemplazarlo o ver su observación.">
      {documentos.map((documento) => {
        const glyph = documentStatusGlyph(documento.estado);
        return (
          <FilaLista
            key={documento.id}
            icono={glyph.icon}
            tono={TONO_DOCUMENTO[glyph.tone]}
            titulo={documento.obligatorio ? documento.nombre : `${documento.nombre} (opcional)`}
            subtitulo={glyph.label}
            subtituloConTono
            accessibilityLabel={`${documento.nombre}${documento.obligatorio ? '' : ' (opcional)'}: ${glyph.label}`}
            onPress={() => onOpen(documento)}
          />
        );
      })}
    </GrupoLista>
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
      maxWidth: Layout.maxContentWidth,
      alignSelf: 'center',
      padding: Spacing.lg,
      gap: Spacing.lg,
      paddingBottom: Spacing.xxxl,
    },
    heroPending: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: Colors.text,
    },
    heroBreakdown: {
      fontSize: FontSize.sm,
      fontWeight: '500',
      color: Colors.textMuted,
    },
  });
