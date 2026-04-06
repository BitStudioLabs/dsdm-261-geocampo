import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

const THEME = {
  skyTop: '#0f281a',
  leafLight: '#74d27d',
  gold: '#d8b45b',
  cardBg: 'rgba(15,40,26,0.95)',
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
      <View style={{ flex: 1, backgroundColor: THEME.skyTop, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={THEME.leafLight} size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.gold,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.48)',
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
          borderColor: 'rgba(216,180,91,0.22)',
        },
        sceneStyle: { backgroundColor: THEME.skyTop },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fazendas"
        options={{
          title: 'Fazendas',
          tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
