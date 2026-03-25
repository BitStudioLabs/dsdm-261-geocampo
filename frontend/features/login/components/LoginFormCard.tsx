import { FontAwesome6 } from '@expo/vector-icons';
import type { AnimatedStyle } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';

import { COLORS } from '../constants';
import { styles } from '../styles';
import type { LoginFormActions, LoginFormState, LoginScreenProps } from '../types';
import type { UserRole } from '@/contexts/AuthContext';
import { ROLE_INFO } from '@/contexts/AuthContext';

interface LoginFormCardProps {
  animatedStyle: AnimatedStyle<any> | object;
  form: LoginFormState & LoginFormActions;
  onForgotPassword?: LoginScreenProps['onForgotPassword'];
  selectedRole?: UserRole | null;
  onBack?: () => void;
}

export function LoginFormCard({ animatedStyle, form, onForgotPassword, selectedRole, onBack }: LoginFormCardProps) {
  const roleInfo = selectedRole ? ROLE_INFO[selectedRole] : null;

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      {onBack && roleInfo && (
        <View style={localStyles.header}>
          <TouchableOpacity
            style={localStyles.backBtn}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <FontAwesome6 name="arrow-left" size={18} color={COLORS.leafLight} />
          </TouchableOpacity>
          <View style={localStyles.roleIndicator}>
            <View style={localStyles.roleIconSmall}>
              <FontAwesome6 name={roleInfo.icon as any} size={14} color={COLORS.leafLight} />
            </View>
            <Text style={localStyles.roleText}>{roleInfo.title}</Text>
          </View>
        </View>
      )}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>E-mail</Text>
        <View style={[styles.inputWrapper, form.emailFocused && styles.inputWrapperFocused]}>
          <FontAwesome6 name="envelope" size={16} color={COLORS.offWhite} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={form.email}
            onChangeText={form.setEmail}
            onFocus={() => form.setEmailFocused(true)}
            onBlur={() => form.setEmailFocused(false)}
            placeholder="seu@email.com"
            placeholderTextColor={COLORS.textGray}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            selectionColor={COLORS.leafLight}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Senha</Text>
        <View style={[styles.inputWrapper, form.passFocused && styles.inputWrapperFocused]}>
          <FontAwesome6 name="lock" size={16} color={COLORS.offWhite} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={form.password}
            onChangeText={form.setPassword}
            onFocus={() => form.setPassFocused(true)}
            onBlur={() => form.setPassFocused(false)}
            placeholder="*************"
            placeholderTextColor={COLORS.textGray}
            secureTextEntry={!form.showPass}
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={form.handleLogin}
            selectionColor={COLORS.leafLight}
          />
          <TouchableOpacity
            onPress={form.toggleShowPass}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <FontAwesome6
              name={form.showPass ? 'eye-slash' : 'eye'}
              size={16}
              color={COLORS.offWhite}
              style={styles.eyeIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      {!!form.error && (
        <View style={styles.errorBox}>
          <View style={styles.errorRow}>
            <FontAwesome6 name="triangle-exclamation" size={14} color="#ff8a80" />
            <Text style={styles.errorText}>{form.error}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btnLogin, form.loading && styles.btnDisabled]}
        onPress={form.handleLogin}
        activeOpacity={0.82}
        disabled={form.loading}>
        {form.loading ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <Text style={styles.btnText}>Entrar no Sistema</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onForgotPassword}
        style={styles.forgotBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.forgotText}>
          Esqueceu a senha? <Text style={styles.forgotLink}>Recuperar acesso</Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>v1.0</Text>
        <View style={styles.dividerLine} />
      </View>
    </Animated.View>
  );
}

const localStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(77,200,90,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.25)',
  },
  roleIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(77,200,90,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.25)',
  },
  roleIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(77,200,90,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: {
    color: COLORS.leafLight,
    fontSize: 13,
    fontWeight: '600',
  },
});
