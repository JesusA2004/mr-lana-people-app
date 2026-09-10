import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon } from '@/components/TabIcon';
import { Colors } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';

const TAB_BAR_BASE_HEIGHT = 64;
const ICON_SIZE = 23;

/** Tabs de Gestión RH (AGENTS.md sección 5): Inicio, Pendientes, Colaboradores, Notificaciones, Perfil. */
export default function RhTabsLayout() {
  const insets = useSafeAreaInsets();
  const bootstrap = useMobileBootstrap(true);

  const pendientesCount = bootstrap.data?.counts.rh_pendientes ?? 0;
  const notificationsCount = bootstrap.data?.counts.notifications ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
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
        name="pendientes"
        options={{
          title: 'Pendientes',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'checkbox' : 'checkbox-outline'}
              color={color}
              focused={focused}
              size={ICON_SIZE}
              badgeCount={pendientesCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="colaboradores"
        options={{
          title: 'Colaboradores',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} color={color} focused={focused} size={ICON_SIZE} />
          ),
        }}
      />
      <Tabs.Screen
        name="notificaciones"
        options={{
          title: 'Notificaciones',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'notifications' : 'notifications-outline'}
              color={color}
              focused={focused}
              size={ICON_SIZE}
              badgeCount={notificationsCount}
            />
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
