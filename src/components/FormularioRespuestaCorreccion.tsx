import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import type { DatoPropuesto } from '@/types/correcciones';
import { camposEditables, RESPUESTA_MAX } from '@/utils/correcciones';

export interface FormularioRespuestaCorreccionProps {
  mensaje: string;
  onMensaje: (texto: string) => void;
  errorMensaje?: string | null;
  /** `datos_propuestos` de la solicitud (lo que la persona pidió). */
  datos: DatoPropuesto[];
  valores: Record<string, string>;
  onValor: (campo: string, valor: string) => void;
  erroresDatos?: Record<string, string>;
  editable?: boolean;
}

/**
 * Respuesta a Recursos Humanos cuando pidió más información: mensaje
 * obligatorio y, si quiere, corregir lo que había propuesto. Solo los
 * campos de texto libre se corrigen aquí (ver `camposEditables`). El botón
 * «Enviar respuesta» va en la `BarraAccionInferior` de la pantalla.
 */
export function FormularioRespuestaCorreccion({
  mensaje,
  onMensaje,
  errorMensaje,
  datos,
  valores,
  onValor,
  erroresDatos = {},
  editable = true,
}: FormularioRespuestaCorreccionProps) {
  const styles = useEstilos(crearEstilos);
  const editables = camposEditables(datos);

  return (
    <Card style={styles.tarjeta}>
      <Text style={styles.titulo} accessibilityRole="header">
        Responde a Recursos Humanos
      </Text>
      <Input
        label="Tu respuesta"
        accessibilityLabel="Tu respuesta para Recursos Humanos"
        placeholder="Explica o aclara lo que te pidieron"
        value={mensaje}
        onChangeText={onMensaje}
        multiline
        maxLength={RESPUESTA_MAX}
        editable={editable}
        error={errorMensaje ?? undefined}
        style={styles.textarea}
        testID="respuesta-mensaje"
      />
      <Text style={styles.contador}>
        {mensaje.length}/{RESPUESTA_MAX}
      </Text>

      {editables.length > 0 ? (
        <View style={styles.datos}>
          <Text style={styles.subtitulo}>Corrige lo que propusiste (opcional)</Text>
          {editables.map((dato) => (
            <Input
              key={dato.campo}
              label={dato.etiqueta}
              accessibilityLabel={`${dato.etiqueta}, valor propuesto`}
              value={valores[dato.campo] ?? dato.propuesto}
              onChangeText={(texto) => onValor(dato.campo, texto)}
              autoCapitalize={dato.campo === 'curp' || dato.campo === 'rfc' ? 'characters' : 'sentences'}
              editable={editable}
              error={erroresDatos[dato.campo]}
              testID={`respuesta-dato-${dato.campo}`}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    tarjeta: {
      gap: Spacing.md,
    },
    titulo: {
      fontSize: FontSize.md,
      fontWeight: '800',
      color: Colors.text,
    },
    subtitulo: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: Colors.textMuted,
    },
    textarea: {
      minHeight: 110,
      textAlignVertical: 'top',
    },
    contador: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
      textAlign: 'right',
      marginTop: -Spacing.sm,
    },
    datos: {
      gap: Spacing.md,
    },
  });
