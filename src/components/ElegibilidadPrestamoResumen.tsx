import { StyleSheet, View } from 'react-native';

import { FilaLista, GrupoLista, TarjetaAviso } from '@/components/ui';
import { Spacing } from '@/constants/colors';
import type { ElegibilidadPrestamo } from '@/types/loan';
import { vistaElegibilidad } from '@/utils/prestamoElegibilidad';

/**
 * Antigüedad y disponibilidad para pedir préstamo, tal cual las calcula el
 * backend con su fecha: «Antigüedad actual: 5 meses 12 días» y «Disponible
 * desde: 08/11/2026». Si no cumple, aviso con el mensaje del backend.
 */
export function ElegibilidadPrestamoResumen({ elegibilidad }: { elegibilidad: ElegibilidadPrestamo | null | undefined }) {
  const vista = vistaElegibilidad(elegibilidad);
  if (!vista.antiguedad && !vista.fechaDisponible && !vista.aviso) return null;

  return (
    <View style={styles.contenedor}>
      {vista.antiguedad || vista.fechaDisponible ? (
        <GrupoLista titulo="Tu antigüedad" descripcion="Calculada con tu fecha de ingreso registrada por Recursos Humanos.">
          {elegibilidad?.antiguedad_texto ? (
            <FilaLista etiqueta="Antigüedad actual" icono="time-outline" titulo={elegibilidad.antiguedad_texto} accessibilityLabel={vista.antiguedad ?? undefined} />
          ) : null}
          {vista.fechaDisponible ? (
            <FilaLista
              etiqueta="Disponible desde"
              icono="calendar-outline"
              tono={vista.botonHabilitado ? 'exito' : 'aviso'}
              titulo={vista.fechaDisponible}
              accessibilityLabel={vista.disponibleDesde ?? undefined}
            />
          ) : null}
        </GrupoLista>
      ) : null}
      {vista.aviso ? <TarjetaAviso icono="hourglass-outline" tono="aviso" titulo={vista.aviso.titulo} mensaje={vista.aviso.mensaje} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
});
