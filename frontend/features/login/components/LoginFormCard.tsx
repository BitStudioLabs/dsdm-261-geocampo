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
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Entrar no GeoCampo</Text>
        <Text style={styles.cardDescription}>Use seu e-mail e senha cadastrados.</Text>
      </View>

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
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            selectionColor={COLORS.leafLight}
            editable={!form.loading}
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
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={form.handleLogin}
            selectionColor={COLORS.leafLight}
            editable={!form.loading}
          />
          <TouchableOpacity
            onPress={form.toggleShowPass}
            disabled={form.loading}
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

      <View style={styles.errorSlot}>
        {!!form.error && (
          <View style={styles.errorBox}>
            <View style={styles.errorRow}>
              <FontAwesome6 name="triangle-exclamation" size={14} color="#ff8a80" />
              <Text style={styles.errorText}>{form.error}</Text>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.btnLogin, form.loading && styles.btnDisabled]}
        onPress={form.handleLogin}
        activeOpacity={0.82}
        disabled={form.loading}>
        {form.loading ? (
          <View style={styles.btnLoadingRow}>
            <ActivityIndicator color={COLORS.white} size="small" />
            <Text style={styles.btnText}>Entrando...</Text>
          </View>
        ) : (
          <Text style={styles.btnText}>Entrar no Sistema</Text>
        )}
      </TouchableOpacity>

      {onForgotPassword ? (
        <TouchableOpacity
          onPress={onForgotPassword}
          style={styles.forgotBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.forgotText}>
            Esqueceu a senha? <Text style={styles.forgotLink}>Recuperar acesso</Text>
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Senar-TO</Text>
        <View style={styles.dividerLine} />
      </View>
    </Animated.View>
  );
}
