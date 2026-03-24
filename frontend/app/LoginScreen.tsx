import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, View } from 'react-native';

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

export default function LoginScreen({ onLogin, onForgotPassword }: LoginScreenProps) {
  const animation = useLoginEntranceAnimation();
  const form = useLoginForm(onLogin);

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
          <LoginFormCard
            animatedStyle={animation.cardStyle}
            form={form}
            onForgotPassword={onForgotPassword}
          />
          <ProfileBadge animatedStyle={animation.badgeStyle} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
