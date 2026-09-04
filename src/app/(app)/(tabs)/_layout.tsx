import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';

const TAB_BAR_BASE_HEIGHT = 60;
const ICON_SIZE = 23;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          // Altura de respiración (AGENTS.md): base + safe area inferior real
          // de Android/iOS, nunca un valor fijo que se sienta comprimido.
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11.5,
          fontWeight: '700',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expediente"
        options={{
          title: 'Expediente',
          tabBarIcon: ({ color }) => <Ionicons name="folder-open-outline" size={ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="solicitudes"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ color }) => <Ionicons name="document-text-outline" size={ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vacaciones"
        options={{
          title: 'Vacaciones',
          tabBarIcon: ({ color }) => <Ionicons name="airplane-outline" size={ICON_SIZE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={ICON_SIZE} color={color} />,
        }}
      />
    </Tabs>
  );
}
