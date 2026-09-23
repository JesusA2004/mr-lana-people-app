import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { ModuleGrid, ModuleTile } from '@/components/ciclo/ModuleTile';
import { Notice, SectionTitle } from '@/components/ciclo/Screen';
import { StepTimeline } from '@/components/ciclo/StepTimeline';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { RH_BADGE_DIAMETER, RhIdentityBadge, type RhIdentityBadgeSize } from '@/components/RhIdentityBadge';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { Stepper } from '@/components/Stepper';
import { ColorSchemeAtLaunch, Colors, FontSize, Layout, Palettes, Radius, Spacing, type ColorPalette, type ColorToken } from '@/constants/colors';
import { SHOW_DEV_TOOLS } from '@/constants/config';

const LONG_TEXT =
  'Texto largo de prueba: la solicitud de préstamo personal por gastos médicos extraordinarios fue enviada a revisión del jefe inmediato y de Recursos Humanos de la sucursal Cuernavaca Centro.';

const SWATCHES: ColorToken[] = [
  'background',
  'surface',
  'surfaceMuted',
  'text',
  'textMuted',
  'border',
  'primary',
  'primaryDark',
  'primarySoft',
  'success',
  'warning',
  'danger',
  'info',
  'rhInk',
  'rhAccent',
  'inverseSurface',
];

/**
 * Design QA — SOLO QA (`SHOW_DEV_TOOLS`). Inspección visual de los
 * componentes base en el tema ACTUAL (los estilos son estáticos: el tema se
 * resuelve al abrir la app, así que esta pantalla NO cambia el tema global)
 * y referencia de ambas paletas lado a lado. Incluye casos límite: textos
 * largos, botones largos, labels grandes.
 */
export default function DesignQaScreen() {
  const router = useRouter();
  const [chip, setChip] = useState<'todas' | 'pendientes' | 'aprobadas'>('todas');
  const [input, setInput] = useState('');

  if (!SHOW_DEV_TOOLS) return <Redirect href="/notificaciones" />;

  return (
    <View style={styles.container}>
      <AppHeader title="Design QA" subtitle={`Tema actual: ${ColorSchemeAtLaunch === 'dark' ? 'oscuro' : 'claro'}`} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Notice tone="info">Para ver el otro tema, cambia el tema del sistema y vuelve a abrir la app. Las paletas de abajo son referencia estática.</Notice>

          <SectionTitle>Paletas (referencia)</SectionTitle>
          <View style={styles.palettes}>
            <PaletteColumn title="Light" palette={Palettes.light} />
            <PaletteColumn title="Dark" palette={Palettes.dark} />
          </View>

          <SectionTitle>RhIdentityBadge</SectionTitle>
          <Card style={styles.row}>
            {(Object.keys(RH_BADGE_DIAMETER) as RhIdentityBadgeSize[]).map((size) => (
              <View key={size} style={styles.badgeCell}>
                <RhIdentityBadge size={size} animated={size === 'hero'} />
                <Text style={styles.caption}>
                  {size} · {RH_BADGE_DIAMETER[size]}
                </Text>
              </View>
            ))}
          </Card>
          <View style={[styles.row, styles.inkSample]}>
            <RhIdentityBadge size="md" />
            <Text style={styles.onInk}>Sobre superficie oscura</Text>
          </View>

          <SectionTitle>Avatar</SectionTitle>
          <Card style={styles.row}>
            <Avatar name="Ana López" size={32} />
            <Avatar name="Juan Carlos Pérez" size={48} />
            <Avatar name="María" size={64} ringColor={Colors.primary} />
            <Avatar size={48} />
          </Card>

          <SectionTitle>Button</SectionTitle>
          <View style={styles.stack}>
            <Button title="Primario" onPress={() => {}} />
            <Button title="Secundario" variant="secondary" onPress={() => {}} />
            <Button title="Outline con ícono" variant="outline" leftIcon="download-outline" onPress={() => {}} />
            <Button title="Ghost" variant="ghost" onPress={() => {}} />
            <Button title="Peligro" variant="danger" onPress={() => {}} />
            <Button title="Cargando" loading onPress={() => {}} />
            <Button title="Deshabilitado" disabled onPress={() => {}} />
            <Button title="Botón con un texto muy largo que debe envolver en dos líneas sin desbordar" leftIcon="alert-circle-outline" onPress={() => {}} />
            <View style={styles.row}>
              <Button title="Rechazar" variant="outline" fullWidth={false} style={styles.flex} onPress={() => {}} />
              <Button title="Autorizar préstamo" fullWidth={false} style={styles.flex} onPress={() => {}} />
            </View>
          </View>

          <SectionTitle>Card</SectionTitle>
          <Card>
            <Text style={styles.body}>Card estática con texto normal.</Text>
          </Card>
          <Card onPress={() => {}}>
            <Text style={styles.body}>Card tocable (scale + haptic).</Text>
            <Text style={styles.muted}>{LONG_TEXT}</Text>
          </Card>

          <SectionTitle>Input</SectionTitle>
          <Input label="Nombre" placeholder="Escribe tu nombre" value={input} onChangeText={setInput} />
          <Input label="Etiqueta muy larga para un campo de formulario que tiene que envolver" placeholder="Placeholder" />
          <Input label="Con error" value="abc" error="Este campo es obligatorio." />
          <Input label="Contraseña" secureTextEntry secureToggle value="secreto" />

          <SectionTitle>StatusBadge</SectionTitle>
          <Card style={styles.wrap}>
            {['enviada', 'en_revision', 'aprobada', 'rechazada', 'requiere_correccion', 'cancelada', 'cerrada', 'desconocido'].map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
            <StatusBadge label="Etiqueta del backend muy larga para comprobar wrap" />
          </Card>

          <SectionTitle>Chips</SectionTitle>
          <FilterChips
            options={[
              { value: 'todas', label: 'Todas', count: 24 },
              { value: 'pendientes', label: 'Pendientes de revisión', count: 3 },
              { value: 'aprobadas', label: 'Aprobadas' },
            ]}
            value={chip}
            onChange={setChip}
          />

          <SectionTitle>Notice</SectionTitle>
          <Notice tone="info">Información neutral.</Notice>
          <Notice tone="success">Operación completada.</Notice>
          <Notice tone="warning">Pendiente de visto bueno del jefe inmediato.</Notice>
          <Notice tone="danger">{LONG_TEXT}</Notice>

          <SectionTitle>Skeleton</SectionTitle>
          <Card style={styles.stack}>
            <SkeletonBlock height={18} width="60%" />
            <SkeletonBlock height={14} />
            <SkeletonBlock height={14} width="80%" />
          </Card>

          <SectionTitle>ModuleTile</SectionTitle>
          <ModuleGrid>
            <ModuleTile icon="people-outline" label="Personas" onPress={() => {}} />
            <ModuleTile icon="folder-outline" label="Documentos laborales" badge={12} onPress={() => {}} />
            <ModuleTile icon="cash-outline" label="Préstamos" caption="Autorizaciones y resguardo" onPress={() => {}} />
            <ModuleTile icon="stats-chart-outline" label="Módulo con un nombre bastante largo" badge={150} onPress={() => {}} />
          </ModuleGrid>

          <SectionTitle>Stepper</SectionTitle>
          <Card>
            <Stepper steps={['Tipo', 'Detalle', 'Revisión']} currentIndex={1} />
          </Card>

          <SectionTitle>Timeline</SectionTitle>
          <Card>
            <StepTimeline
              items={[
                { key: 'a', label: 'Enviada', status: 'done', date: '2026-09-20T10:00:00-06:00' },
                { key: 'b', label: 'Visto bueno del jefe', status: 'current', detail: 'Pendiente' },
                { key: 'c', label: 'Autorización RH', status: 'pending' },
                { key: 'd', label: 'Cancelada (ejemplo)', status: 'cancelled' },
              ]}
            />
          </Card>

          <SectionTitle>EmptyState</SectionTitle>
          <Card>
            <EmptyState title="Sin solicitudes" message="Cuando envíes una solicitud aparecerá aquí." actionLabel="Nueva solicitud" onAction={() => {}} />
          </Card>

          <SectionTitle>Tipografía</SectionTitle>
          <Card style={styles.stack}>
            <Text style={[styles.body, { fontSize: FontSize.xxxl, fontWeight: '800' }]}>Título XXXL</Text>
            <Text style={[styles.body, { fontSize: FontSize.xl, fontWeight: '800' }]}>Título XL</Text>
            <Text style={styles.body}>Texto normal (md)</Text>
            <Text style={styles.muted}>Texto secundario (sm)</Text>
            <Text style={styles.body}>{LONG_TEXT}</Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

function PaletteColumn({ title, palette }: { title: string; palette: ColorPalette }) {
  return (
    <View style={[styles.paletteCol, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <Text style={[styles.paletteTitle, { color: palette.text }]}>{title}</Text>
      <View style={[styles.paletteCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={{ color: palette.text, fontWeight: '700', fontSize: FontSize.sm }}>Texto</Text>
        <Text style={{ color: palette.textMuted, fontSize: FontSize.xs }}>Secundario</Text>
        <View style={[styles.paletteButton, { backgroundColor: palette.primary }]}>
          <Text style={{ color: palette.white, fontWeight: '700', fontSize: FontSize.xs }}>Acción</Text>
        </View>
      </View>
      {SWATCHES.map((token) => (
        <View key={token} style={styles.swatchRow}>
          <View style={[styles.swatch, { backgroundColor: palette[token], borderColor: palette.border }]} />
          <Text style={[styles.swatchLabel, { color: palette.textMuted }]} numberOfLines={1}>
            {token}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    gap: Spacing.md,
  },
  palettes: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  paletteCol: {
    flex: 1,
    minWidth: 0,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  paletteTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  paletteCard: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 2,
    marginBottom: 4,
  },
  paletteButton: {
    marginTop: 4,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  swatchLabel: {
    flex: 1,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stack: {
    gap: Spacing.sm,
  },
  flex: {
    flexGrow: 1,
    flexBasis: 120,
  },
  badgeCell: {
    alignItems: 'center',
    gap: 4,
  },
  inkSample: {
    backgroundColor: Colors.inverseSurface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  onInk: {
    color: Colors.onInverseSurface,
    fontWeight: '700',
  },
  caption: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  body: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  muted: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
