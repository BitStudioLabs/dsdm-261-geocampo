import React from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

const THEME = {
  cardBg: 'rgba(10,31,13,0.95)',
  leafLight: '#4dc85a',
  textMuted: 'rgba(255,255,255,0.5)',
};

export default function GestorTabLayout() {
  const { homeRoute, isAuthenticated, isLoading, role } = useAuth();

  React.useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (role !== 'admin') {
      router.replace('/(tabs)');
    }
  }, [homeRoute, isAuthenticated, isLoading, role]);

  if (isLoading || !isAuthenticated || homeRoute !== '/(tabs-gestor)') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: THEME.cardBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={THEME.leafLight} size="large" />
      </View>
    );
  }

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
          title: 'Painel',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="chart-line" size={size - 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="instrutores"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="users" size={size - 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="auditoria"
        options={{
          title: 'Auditoria',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="shield-halved" size={size - 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="user" size={size - 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cadastro-usuario"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="cadastro-propriedade"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="propriedades"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
