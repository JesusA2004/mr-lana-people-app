import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon } from '@/components/TabIcon';
import { Colors } from '@/constants/colors';
import { useIncorporacion } from '@/hooks/queries/useIncorporacion';
import { useSolicitudes } from '@/hooks/queries/useSolicitudes';

const TAB_BAR_BASE_HEIGHT = 64;
const ICON_SIZE = 23;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  // Badges del tab bar: documentos pendientes (Expediente) y solicitudes que
  // requieren corrección (Solicitudes). Ambas queries ya están en caché
  // (Dashboard las dispara primero); este layout solo las lee, no fuerza
  // requests nuevos si ya hay datos frescos.
  const incorporacion = useIncorporacion();
  const solicitudes = useSolicitudes();

  const expedientePendientes = incorporacion.data?.progreso.pendientes ?? 0;
  const solicitudesConCorreccion = useMemo(
    () => (solicitudes.data ?? []).filter((item) => item.estado === 'requiere_correccion').length,
    [solicitudes.data],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          // Altura de respiración: base + safe area inferior real de
          // Android/iOS, nunca un valor fijo que se sienta comprimido.
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11.5,
          fontWeight: '700',
          marginTop: 3,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} size={ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="expediente"
        options={{
          title: 'Expediente',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'folder-open' : 'folder-open-outline'}
              color={color}
              focused={focused}
              size={ICON_SIZE}
              badgeCount={expedientePendientes}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="solicitudes"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'document-text' : 'document-text-outline'}
              color={color}
              focused={focused}
              size={ICON_SIZE}
              badgeCount={solicitudesConCorreccion}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vacaciones"
        options={{
          title: 'Vacaciones',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'airplane' : 'airplane-outline'} color={color} focused={focused} size={ICON_SIZE} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} size={ICON_SIZE} />
          ),
        }}
      />
    </Tabs>
  );
}
