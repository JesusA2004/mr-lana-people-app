import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { rhActasApi } from '@/api/rh/cicloLaboral';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { StepTimeline } from '@/components/ciclo/StepTimeline';
import { PressableScale } from '@/components/PressableScale';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { useRhActa } from '@/hooks/queries/useRhCicloLaboral';
import { useAuthStore } from '@/store/authStore';
import type { ActaCircunstanciada, ActaPersona } from '@/types/rhCiclo';
import { actaBadge, actaEntregaLabel, actaEstadoLabel, AVISO_ACTAS_SOLO_CONSULTA } from '@/utils/acta';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { joinName, slugifyFilename } from '@/utils/formatters';

/** «Puesto · Área» de una persona del acta (solo lo que mande el backend). */
function puestoArea(persona: Pick<ActaPersona, 'puesto' | 'area'>): string | null {
  return [persona.puesto, persona.area].filter(Boolean).join(' · ') || null;
}

/**
 * Detalle de acta (RH) — SOLO CONSULTA: `GET /rh/actas/{id}`. Muestra los
 * datos capturados (incluida la «Acta administrativa circunstanciada»:
 * incidencia, participantes, entrega de copia), anexos, documento generado
 * y seguimiento. Crear, completar y operar el acta se hace en el Portal RH
 * web; la app no redacta ni modifica nada.
 */
export default function RhActaScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRhActa(id);
  const acta = query.data;
  const user = useAuthStore((state) => state.user);
  const [anexoAbierto, setAnexoAbierto] = useState<{ id: number; nombre: string } | null>(null);

  if (anexoAbierto && acta) {
    return (
      <SecureDocumentViewer
        path={rhActasApi.anexoPath(acta.id, anexoAbierto.id)}
        title={anexoAbierto.nombre}
        watermarkLabel={`${joinName(user?.nombre, user?.apellidos) ?? 'RH'} · ${new Date().toLocaleString('es-MX')}`}
        onClose={() => setAnexoAbierto(null)}
        allowDownload
        downloadFileName={slugifyFilename(anexoAbierto.nombre)}
      />
    );
  }

  const c = acta?.circunstanciada ?? null;

  return (
    <Screen
      title="Acta"
      subtitle={acta?.folio ?? undefined}
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Esta acta ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {acta ? (
        <>
          <Notice tone="info">{AVISO_ACTAS_SOLO_CONSULTA}</Notice>

          <Card style={styles.gap}>
            <View style={styles.header}>
              <Text style={styles.title}>{acta.tipo_etiqueta ?? acta.tipo}</Text>
              <StatusBadge status={actaBadge(acta.estado)} label={actaEstadoLabel(acta.estado)} />
            </View>
            <InfoRow label="Colaborador" value={acta.colaborador?.nombre} icon="person-outline" />
            <InfoRow label="Fecha" value={formatDateLong(acta.fecha)} icon="calendar-outline" />
            <InfoRow label="Hora" value={acta.hora} icon="time-outline" />
            <InfoRow label="Lugar" value={acta.lugar} icon="location-outline" />
            {acta.negativa_firma ? <Notice tone="warning">Negativa a firmar registrada{acta.motivo_negativa ? `: ${acta.motivo_negativa}` : '.'}</Notice> : null}
          </Card>

          {c ? <Incidencia c={c} motivo={acta.motivo} /> : null}

          <Card style={styles.gap}>
            <SectionTitle>Hechos</SectionTitle>
            <Text style={styles.body} selectable>
              {acta.hechos ?? '—'}
            </Text>
          </Card>

          {c ? <Participantes c={c} trabajador={acta.colaborador?.nombre ?? null} /> : null}

          {/* Actas históricas (formatos anteriores): testigos y declaraciones capturados entonces. */}
          {acta.testigos && acta.testigos.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Testigos</SectionTitle>
              {acta.testigos.map((t, i) => (
                <InfoRow key={i} label={t.nombre} value={t.puesto ?? 'Testigo'} />
              ))}
            </Card>
          ) : null}

          {acta.declaraciones && acta.declaraciones.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Declaraciones</SectionTitle>
              {acta.declaraciones.map((d, i) => (
                <View key={i} style={styles.bloque}>
                  <Text style={styles.subTitle}>{d.persona}</Text>
                  <Text style={styles.body}>{d.declaracion}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {c ? (
            <Card style={styles.gap}>
              <SectionTitle>Entrega de copia</SectionTitle>
              <Text style={styles.body}>{actaEntregaLabel(c.entrega.estado)}</Text>
              {c.entrega.motivo ? <Text style={styles.muted}>{c.entrega.motivo}</Text> : null}
              <InfoRow label="Registró" value={c.entrega.por} />
              <InfoRow label="Fecha" value={c.entrega.en ? formatDateTime(c.entrega.en) : null} />
            </Card>
          ) : null}

          <Card style={styles.gap}>
            <SectionTitle>Anexos</SectionTitle>
            {(acta.anexos ?? []).length === 0 ? <Text style={styles.muted}>Sin anexos.</Text> : null}
            {(acta.anexos ?? []).map((anexo) => (
              <PressableScale
                key={anexo.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver anexo ${anexo.nombre ?? ''}`}
                onPress={() => setAnexoAbierto({ id: anexo.id, nombre: anexo.nombre ?? 'Anexo' })}
                style={styles.anexo}>
                <Text style={styles.link}>{anexo.nombre ?? `Anexo ${anexo.id}`}</Text>
                {anexo.descripcion ? <Text style={styles.muted}>{anexo.descripcion}</Text> : null}
                {anexo.fecha_identificacion ? <Text style={styles.muted}>Identificado: {anexo.fecha_identificacion}</Text> : null}
                {anexo.relacion_hechos ? <Text style={styles.muted}>Relación con los hechos: {anexo.relacion_hechos}</Text> : null}
              </PressableScale>
            ))}
          </Card>

          {acta.documento_id ? (
            <Button title="Ver formato generado" variant="outline" leftIcon="document-text-outline" onPress={() => router.push(`/(app)/rh/documentos-laborales/${acta.documento_id}` as never)} />
          ) : (
            <Text style={styles.muted}>El formato del acta todavía no se genera.</Text>
          )}

          {acta.seguimiento && acta.seguimiento.length > 0 ? (
            <Card>
              <SectionTitle>Seguimiento</SectionTitle>
              <View style={styles.timeline}>
                <StepTimeline items={acta.seguimiento.map((s, i) => ({ key: `${i}`, label: s.nota, status: 'done', date: s.fecha }))} />
              </View>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Incidencia({ c, motivo }: { c: ActaCircunstanciada; motivo: string | null }) {
  const styles = useEstilos(crearEstilos);
  const tipo = c.incidencia.tipo === 'otra' ? (c.incidencia.otro ?? c.incidencia.tipo_etiqueta) : (c.incidencia.tipo_etiqueta ?? motivo);
  return (
    <Card style={styles.gap}>
      <SectionTitle>Incidencia</SectionTitle>
      <InfoRow label="Tipo de incidencia" value={tipo} icon="alert-circle-outline" />
      <InfoRow label="Fecha de los hechos" value={c.incidencia.fecha_hechos} icon="calendar-outline" />
      <InfoRow label="Hora de los hechos" value={c.incidencia.hora_hechos} icon="time-outline" />
      <InfoRow label="Lugar de los hechos" value={c.incidencia.lugar_hechos} icon="location-outline" />
      {c.disposiciones ? (
        <View style={styles.bloque}>
          <Text style={styles.subTitle}>Disposiciones aplicables</Text>
          <Text style={styles.body}>{c.disposiciones}</Text>
        </View>
      ) : null}
    </Card>
  );
}

function Participantes({ c, trabajador }: { c: ActaCircunstanciada; trabajador: string | null }) {
  const styles = useEstilos(crearEstilos);
  const manifestacionTrabajador =
    c.trabajador.manifesto === true ? c.trabajador.manifestacion : c.trabajador.manifesto === false ? 'No quiso manifestar nada.' : null;

  return (
    <Card style={styles.gap}>
      <SectionTitle>Participantes</SectionTitle>

      {c.responsable.nombre ? (
        <View style={styles.bloque}>
          <Text style={styles.kicker}>Levanta el acta{c.responsable.caracter_etiqueta ? ` · ${c.responsable.caracter_etiqueta}` : ''}</Text>
          <Text style={styles.subTitle}>{c.responsable.nombre}</Text>
          {puestoArea(c.responsable) ? <Text style={styles.muted}>{puestoArea(c.responsable)}</Text> : null}
          {c.responsable.manifestacion ? <Text style={styles.body}>{c.responsable.manifestacion}</Text> : null}
        </View>
      ) : null}

      {c.jefe.participa && c.jefe.nombre ? (
        <View style={styles.bloque}>
          <Text style={styles.kicker}>Jefe inmediato</Text>
          <Text style={styles.subTitle}>{c.jefe.nombre}</Text>
          {puestoArea(c.jefe) ? <Text style={styles.muted}>{puestoArea(c.jefe)}</Text> : null}
          {c.jefe.manifestacion ? <Text style={styles.body}>{c.jefe.manifestacion}</Text> : null}
        </View>
      ) : null}

      {c.testigos_hechos.map((t, i) => (
        <View key={`h${i}`} style={styles.bloque}>
          <Text style={styles.kicker}>Testigo de hechos</Text>
          <Text style={styles.subTitle}>{t.nombre ?? 'Testigo'}</Text>
          {puestoArea(t) ? <Text style={styles.muted}>{puestoArea(t)}</Text> : null}
          {t.relacion ? <Text style={styles.muted}>{t.relacion === 'otra' && t.relacion_otro ? t.relacion_otro : t.relacion_etiqueta}</Text> : null}
          {t.manifestacion ? <Text style={styles.body}>{t.manifestacion}</Text> : !t.declaro ? <Text style={styles.muted}>No declaró.</Text> : null}
        </View>
      ))}

      {c.testigos_asistencia.map((t, i) => (
        <View key={`a${i}`} style={styles.bloque}>
          <Text style={styles.kicker}>Testigo de asistencia</Text>
          <Text style={styles.subTitle}>{t.nombre ?? 'Testigo'}</Text>
          {puestoArea(t) ? <Text style={styles.muted}>{puestoArea(t)}</Text> : null}
          {t.manifestacion ? <Text style={styles.body}>{t.manifestacion}</Text> : null}
        </View>
      ))}

      {manifestacionTrabajador || c.trabajador.elementos ? (
        <View style={styles.bloque}>
          <Text style={styles.kicker}>Trabajador</Text>
          {trabajador ? <Text style={styles.subTitle}>{trabajador}</Text> : null}
          {manifestacionTrabajador ? <Text style={styles.body}>{manifestacionTrabajador}</Text> : null}
          {c.trabajador.elementos ? <Text style={styles.muted}>Elementos que aportó: {c.trabajador.elementos}</Text> : null}
        </View>
      ) : null}

      {c.incidencias_levantamiento ? (
        <View style={styles.bloque}>
          <Text style={styles.kicker}>Incidencias durante el levantamiento</Text>
          <Text style={styles.body}>{c.incidencias_levantamiento}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    gap: {
      gap: Spacing.xs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    title: {
      fontSize: FontSize.lg,
      fontWeight: '800',
      color: Colors.text,
      flexShrink: 1,
    },
    kicker: {
      fontSize: FontSize.xs,
      fontWeight: '700',
      color: Colors.textMuted,
      textTransform: 'uppercase',
    },
    subTitle: {
      fontSize: FontSize.sm,
      fontWeight: '800',
      color: Colors.text,
    },
    body: {
      fontSize: FontSize.sm,
      color: Colors.text,
      lineHeight: 20,
    },
    muted: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
    },
    bloque: {
      gap: 2,
      paddingVertical: Spacing.xs,
    },
    anexo: {
      minHeight: 44,
      justifyContent: 'center',
      gap: 2,
    },
    link: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: Colors.primaryDark,
    },
    timeline: {
      marginTop: Spacing.md,
    },
  });
