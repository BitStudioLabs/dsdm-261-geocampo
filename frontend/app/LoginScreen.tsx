import React, { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  COLORS,
  LoginBackground,
  LoginFormCard,
  LoginHeader,
  styles,
  useLoginEntranceAnimation,
  useLoginForm,
} from '@/features/login';
import type { LoginScreenProps } from '@/features/login';
import { RoleSelector } from '@/features/login/components/RoleSelector';
import { useAuth, type UserRole } from '@/contexts/AuthContext';

type LoginStep = 'role' | 'credentials';

export default function LoginScreen({ onLogin, onForgotPassword }: LoginScreenProps) {
  const [step, setStep] = useState<LoginStep>('role');
  const { selectedRole, setSelectedRole, login } = useAuth();
  const animation = useLoginEntranceAnimation();

  const slideProgress = useSharedValue(0);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    slideProgress.value = withSpring(1, { damping: 18, stiffness: 120 });
    setTimeout(() => setStep('credentials'), 150);
  };

  const handleBack = () => {
    slideProgress.value = withTiming(0, { duration: 250 });
    setTimeout(() => {
      setStep('role');
      setSelectedRole(null);
    }, 100);
  };

  const form = useLoginForm(async (email, password) => {
    if (onLogin) {
      await onLogin(email, password);
      return;
    }

    if (selectedRole) {
      await login(email, password, selectedRole);

      switch (selectedRole) {
        case 'instrutor':
          router.replace('/(tabs)');
          break;
        case 'proprietario':
          router.replace('/(tabs-proprietario)');
          break;
        case 'gestor':
          router.replace('/(tabs-gestor)');
          break;
        default:
          router.replace('/(tabs)');
      }
    } else {
      router.replace('/(tabs)');
    }
  });

  const roleContainerStyle = useAnimatedStyle(() => ({
    opacity: 1 - slideProgress.value,
    transform: [{ translateX: -slideProgress.value * 50 }],
    position: 'absolute' as const,
    left: 0,
    right: 0,
    display: slideProgress.value > 0.9 ? 'none' : 'flex',
  }));

  const credentialsContainerStyle = useAnimatedStyle(() => ({
    opacity: slideProgress.value,
    transform: [{ translateX: (1 - slideProgress.value) * 50 }],
  }));

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

          <View style={{ position: 'relative', minHeight: 380 }}>
            {step === 'role' && (
              <Animated.View style={roleContainerStyle}>
                <View style={styles.card}>
                  <RoleSelector
                    selectedRole={selectedRole}
                    onSelectRole={handleSelectRole}
                    onBack={() => {}}
                  />
                </View>
              </Animated.View>
            )}

            {step === 'credentials' && (
              <Animated.View style={credentialsContainerStyle}>
                <LoginFormCard
                  animatedStyle={{}}
                  form={form}
                  onForgotPassword={onForgotPassword}
                  selectedRole={selectedRole}
                  onBack={handleBack}
                />
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
