import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { SectionTitle } from '@/components/ciclo/Screen';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { Jerarquia, PersonaResumen } from '@/types/cicloLaboral';

/**
 * Jerarquía de una persona (autoservicio y detalle RH). Solo dibuja lo que
 * el backend manda: un jefe/gerente ausente se indica como "Sin asignar",
 * nunca se inventa una persona.
 */
export function JerarquiaCard({ jerarquia }: { jerarquia: Jerarquia }) {
  const yo = jerarquia.colaborador;
  return (
    <>
      {yo ? (
        <Card style={styles.gap}>
          <SectionTitle>Estructura</SectionTitle>
          <InfoRow label="Puesto" value={yo.puesto} icon="briefcase-outline" />
          <InfoRow label="Departamento" value={yo.departamento} icon="git-network-outline" />
          <InfoRow label="Sucursal" value={yo.sucursal} icon="business-outline" />
          <InfoRow label="Empresa" value={yo.empresa} icon="globe-outline" />
        </Card>
      ) : null}
      <PersonaCard titulo="Jefe inmediato" persona={jerarquia.jefe_inmediato} />
      <PersonaCard titulo="Gerente" persona={jerarquia.gerente} />
      {jerarquia.subordinados_directos.length > 0 ? (
        <Card style={styles.gap}>
          <SectionTitle>Equipo directo ({jerarquia.subordinados_directos.length})</SectionTitle>
          {jerarquia.subordinados_directos.map((persona) => (
            <PersonaRow key={persona.id} persona={persona} />
          ))}
        </Card>
      ) : null}
    </>
  );
}

function PersonaCard({ titulo, persona }: { titulo: string; persona: PersonaResumen | null }) {
  return (
    <Card style={styles.gap}>
      <Text style={styles.kicker}>{titulo}</Text>
      {persona ? <PersonaRow persona={persona} /> : <Text style={styles.empty}>Sin asignar en tu expediente.</Text>}
    </Card>
  );
}

export function PersonaRow({ persona }: { persona: PersonaResumen }) {
  return (
    <View style={styles.personaRow} accessible accessibilityLabel={`${persona.nombre}${persona.puesto ? `, ${persona.puesto}` : ''}`}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={18} color={Colors.primaryDark} />
      </View>
      <View style={styles.personaText}>
        <Text style={styles.nombre}>{persona.nombre}</Text>
        {persona.puesto || persona.sucursal ? (
          <Text style={styles.meta}>{[persona.puesto, persona.sucursal].filter(Boolean).join(' · ')}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.xs,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
  },
  empty: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  personaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaText: {
    flex: 1,
  },
  nombre: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
