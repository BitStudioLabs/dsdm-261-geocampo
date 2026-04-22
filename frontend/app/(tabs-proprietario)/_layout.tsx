import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

const THEME = {
  page: '#06180a',
  primary: '#59d27c',
  cardBg: 'rgba(10,31,13,0.95)',
  line: 'rgba(122, 217, 140, 0.2)',
};

export default function ProprietarioTabsLayout() {
  const { homeRoute, isAuthenticated, isLoading, role } = useAuth();

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (role !== 'proprietario') {
      router.replace(role === 'admin' ? '/(tabs-gestor)' : '/(tabs)');
    }
  }, [isAuthenticated, isLoading, role]);

  if (isLoading || !isAuthenticated || homeRoute !== '/(tabs-proprietario)') {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.page, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={THEME.primary} size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
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
          borderColor: THEME.line,
          elevation: 14,
          shadowColor: THEME.primary,
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
        sceneStyle: { backgroundColor: THEME.page },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fazendas"
        options={{
          title: 'Fazendas',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'business' : 'business-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
