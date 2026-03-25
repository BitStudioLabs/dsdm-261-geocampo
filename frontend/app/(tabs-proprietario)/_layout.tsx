import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

const THEME = {
  cardBg: 'rgba(10,31,13,0.95)',
  leafLight: '#4dc85a',
  textMuted: 'rgba(255,255,255,0.5)',
};

export default function ProprietarioTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.leafLight,
        tabBarInactiveTintColor: THEME.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 72,
          borderTopWidth: 0,
          borderRadius: 24,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: THEME.cardBg,
          borderWidth: 1,
          borderColor: 'rgba(77,200,90,0.2)',
          elevation: 14,
          shadowColor: THEME.leafLight,
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 18,
        },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 4,
          paddingVertical: 4,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="house" size={size - 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Historico',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="clock-rotate-left" size={size - 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="propriedade"
        options={{
          title: 'Propriedade',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="house-chimney" size={size - 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="user" size={size - 4} color={color} />,
        }}
      />
    </Tabs>
  );
}
