import { FontAwesome6 } from '@expo/vector-icons';
import type { AnimatedStyle } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../constants';
import { styles } from '../styles';
import type { LoginFormActions, LoginFormState, LoginScreenProps } from '../types';

interface LoginFormCardProps {
  animatedStyle: AnimatedStyle<any>;
  form: LoginFormState & LoginFormActions;
  onForgotPassword?: LoginScreenProps['onForgotPassword'];
}

export function LoginFormCard({ animatedStyle, form, onForgotPassword }: LoginFormCardProps) {
  return (
    <Animated.View style={[styles.card, animatedStyle]}>
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
