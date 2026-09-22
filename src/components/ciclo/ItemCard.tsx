import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';

export interface ItemCardProps {
  icon?: keyof typeof Ionicons.glyphMap;
  /** Etiqueta pequeña superior (tipo/categoría). */
  kicker?: string | null;
  title: string;
  subtitle?: string | null;
  /** Líneas de detalle secundarias (se omiten las vacías). */
  lines?: (string | null | undefined | false)[];
  /** Estado para `StatusBadge` + etiqueta que manda el backend. */
  status?: string | null;
  statusLabel?: string | null;
  /** Valor destacado a la derecha (ej. neto). */
  amount?: string | null;
  onPress?: () => void;
}

/** Card de lista genérica del ciclo laboral (documentos, recibos, préstamos, cierres, actas, tareas...). */
export function ItemCard({ icon, kicker, title, subtitle, lines = [], status, statusLabel, amount, onPress }: ItemCardProps) {
  const visibleLines = lines.filter((line): line is string => typeof line === 'string' && line.length > 0);
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        {icon ? (
          <View style={styles.icon}>
            <Ionicons name={icon} size={18} color={Colors.primaryDark} />
          </View>
        ) : null}
        <View style={styles.titleColumn}>
          {kicker ? (
            <Text style={styles.kicker} numberOfLines={1}>
              {kicker}
            </Text>
          ) : null}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        {onPress ? <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /> : null}
      </View>
      {visibleLines.map((line, index) => (
        <Text key={index} style={styles.line} numberOfLines={2}>
          {line}
        </Text>
      ))}
      {status || statusLabel ? (
        <View style={styles.badgeRow}>
          <StatusBadge status={status ?? undefined} label={statusLabel ?? undefined} />
        </View>
      ) : null}
    </Card>
  );
}

export function LoadMore({ hasNextPage, isFetching, onPress }: { hasNextPage?: boolean; isFetching?: boolean; onPress: () => void }) {
  if (!hasNextPage) return null;
  return <Button title="Cargar más" variant="ghost" loading={isFetching} onPress={onPress} />;
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
    gap: 1,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  line: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
});
