import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, View } from 'react-native';

import {
  COLORS,
  LoginBackground,
  LoginFormCard,
  LoginHeader,
  ProfileBadge,
  styles,
  useLoginEntranceAnimation,
  useLoginForm,
} from '@/features/login';
import type { LoginScreenProps } from '@/features/login';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen({ onLogin, onForgotPassword }: LoginScreenProps) {
  const animation = useLoginEntranceAnimation();
  const { homeRoute, isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace(homeRoute as any);
    }
  }, [homeRoute, isAuthenticated, isLoading]);

  const form = useLoginForm(async (email, password) => {
    if (onLogin) {
      await onLogin(email, password);
      return;
    }

    await login(email, password);
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.skyTop} />
        <ActivityIndicator size="large" color={COLORS.leafLight} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.skyTop} />
      <LoginBackground moonStyle={animation.moonStyle} moonGlowStyle={animation.moonGlowStyle} />
      <KeyboardAvoidingView
        style={styles.kvWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <LoginHeader animatedStyle={animation.logoStyle} />
          <LoginFormCard animatedStyle={animation.cardStyle} form={form} onForgotPassword={onForgotPassword} />
          <ProfileBadge animatedStyle={animation.badgeStyle} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
