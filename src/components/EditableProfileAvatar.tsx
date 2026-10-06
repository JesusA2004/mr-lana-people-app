import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfilePhotoSheet } from './ProfilePhotoSheet';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { FotoPerfilEstado } from '@/types/collaborator';

export interface EditableProfileAvatarProps {
  name?: string;
  fotoUrlApi?: string | null;
  fotoUrl?: string | null;
  estado?: FotoPerfilEstado | null;
  size?: number;
  ringColor?: string;
  /** Muestra la etiqueta de estado debajo (Perfil / Configuración). */
  mostrarEstado?: boolean;
}

/**
 * Avatar propio que se puede tocar: sin foto → «Agregar foto de perfil»;
 * con foto → «Solicitar cambio de foto» (aprobación de RH). Iniciales si
 * no hay foto o falla la carga.
 */
export function EditableProfileAvatar({ name, fotoUrlApi, fotoUrl, estado, size = 96, ringColor, mostrarEstado = false }: EditableProfileAvatarProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const [abierto, setAbierto] = useState(false);
  const sinFoto = !estado || estado.estado === 'sin_foto';
  const etiquetaAccion = sinFoto ? 'Agregar foto de perfil' : estado?.estado === 'cambio_pendiente' ? 'Cambio de foto pendiente' : 'Solicitar cambio de foto';

  return (
    <View style={styles.wrap}>
      <PressableScale accessibilityRole="button" accessibilityLabel={etiquetaAccion} onPress={() => setAbierto(true)}>
        <ProfileAvatar name={name} fotoUrlApi={fotoUrlApi} fotoUrl={fotoUrl} size={size} ringColor={ringColor} />
        <View style={[styles.badge, { backgroundColor: estado?.estado === 'cambio_pendiente' ? Colors.warning : Colors.primary }]}>
          <Ionicons name={estado?.estado === 'cambio_pendiente' ? 'time-outline' : sinFoto ? 'add' : 'camera-outline'} size={size > 60 ? 16 : 12} color={Colors.white} />
        </View>
      </PressableScale>

      {mostrarEstado ? (
        <View style={styles.estado}>
          <Text style={styles.estadoTexto}>{estado?.estado === 'cambio_pendiente' ? 'Cambio pendiente de aprobación' : (estado?.etiqueta ?? 'Sin foto')}</Text>
          {estado?.estado !== 'cambio_pendiente' && estado?.ultimo_cambio ? (
            <Text style={[styles.estadoTexto, { color: estado.ultimo_cambio.estado === 'rechazado' ? Colors.warning : Colors.primaryDark }]}>
              {estado.ultimo_cambio.etiqueta}
              {estado.ultimo_cambio.estado === 'rechazado' && estado.ultimo_cambio.motivo_rechazo ? `: ${estado.ultimo_cambio.motivo_rechazo}` : ''}
            </Text>
          ) : null}
        </View>
      ) : null}

      <ProfilePhotoSheet visible={abierto} onClose={() => setAbierto(false)} estado={estado} />
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', gap: Spacing.xs },
    badge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      minWidth: 24,
      height: 24,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: Colors.background,
    },
    estado: { alignItems: 'center' },
    estadoTexto: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  });
