import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

const THEME = {
  skyTop: '#0a1f0d',
  leafLight: '#4dc85a',
  link: '#7de88a',
  cardBg: 'rgba(10,31,13,0.95)',
};

export default function TabsLayout() {
  const { homeRoute, isAuthenticated, isLoading, role } = useAuth();

  React.useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (role === 'admin') {
      router.replace('/(tabs-gestor)');
      return;
    }

    if (role === 'proprietario') {
      router.replace('/(tabs-proprietario)/perfil' as any);
    }
  }, [homeRoute, isAuthenticated, isLoading, role]);

  if (isLoading || !isAuthenticated || homeRoute !== '/(tabs)') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: THEME.skyTop,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={THEME.leafLight} size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: THEME.leafLight,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
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
        sceneStyle: {
          backgroundColor: THEME.skyTop,
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
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="visitas" options={{ title: 'Visitas' }} />
      <Tabs.Screen name="relatorios" options={{ title: 'Relatórios' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
