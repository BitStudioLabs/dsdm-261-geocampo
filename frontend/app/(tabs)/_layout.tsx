import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '../../src/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: '#98A19A',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 68,
          borderTopWidth: 0,
          borderRadius: 24,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: colors.card,
          elevation: 14,
          shadowColor: '#0A1F17',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 18,
        },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 4,
        },
        tabBarIconStyle: {
          marginBottom: 1,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'visitas') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'relatorios') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
        }}
      />
      <Tabs.Screen
        name="visitas"
        options={{
          title: 'Visitas',
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatorios',
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
        }}
      />
    </Tabs>
  );
}
