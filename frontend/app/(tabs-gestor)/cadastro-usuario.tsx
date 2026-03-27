import { FontAwesome6 } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';

const THEME = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
  leafLight: '#4dc85a',
  blue: '#5b9cff',
  gold: '#f5c842',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textMuted: 'rgba(255,255,255,0.55)',
  cardBg: 'rgba(10,31,13,0.85)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.1)',
  error: '#ff6b6b',
};

const ROLE_OPTIONS = [
  { value: 'instrutor', label: 'Instrutor de Campo' },
  { value: 'proprietario', label: 'Proprietario Rural' },
  { value: 'admin', label: 'Gestor Institucional' },
] as const;

type UserRoleOption = (typeof ROLE_OPTIONS)[number]['value'];

export default function CadastroUsuarioScreen() {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    nomeCompleto: '',
    email: '',
    password: '',
    telefone: '',
    perfil: 'instrutor' as UserRoleOption,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const signupClient = useMemo(
    () =>
      createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_KEY!, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }),
    []
  );

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.nomeCompleto.trim() || !form.email.trim() || !form.password.trim()) {
      setFeedback({ type: 'error', message: 'Preencha nome, e-mail e senha para continuar.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const { data, error } = await signupClient.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          nome_completo: form.nomeCompleto.trim(),
          perfil: form.perfil,
        },
      },
    });

    if (error || !data.user) {
      setIsSubmitting(false);
      setFeedback({ type: 'error', message: error?.message ?? 'Não foi possivel criar o login do usuario.' });
      return;
    }

    const { error: profileError } = await supabase.from('usuarios').insert({
      id: data.user.id,
      nome_completo: form.nomeCompleto.trim(),
      email: form.email.trim(),
      perfil: form.perfil,
      telefone: form.telefone.trim() || null,
      id_regional: profile?.regionalNome ? undefined : undefined,
      ativo: true,
      atualizado_em: new Date().toISOString(),
    });

    setIsSubmitting(false);

    if (profileError) {
      console.error('Erro ao criar perfil do usuario:', profileError);
      setFeedback({
        type: 'error',
        message: 'O login foi criado, mas não foi possivel salvar o perfil em usuarios.',
      });
      return;
    }

    setForm({
      nomeCompleto: '',
      email: '',
      password: '',
      telefone: '',
      perfil: 'instrutor',
    });
    setFeedback({ type: 'success', message: 'Usuario cadastrado com sucesso.' });
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
              <FontAwesome6 name="arrow-left" size={14} color={THEME.white} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Novo Usuario</Text>
              <Text style={styles.subtitle}>Crie um novo acesso e o perfil correspondente no sistema.</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              style={styles.input}
              value={form.nomeCompleto}
              onChangeText={(value) => handleChange('nomeCompleto', value)}
              placeholder="Nome do usuario"
              placeholderTextColor={THEME.textMuted}
            />

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(value) => handleChange('email', value)}
              placeholder="usuario@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={THEME.textMuted}
            />

            <Text style={styles.label}>Senha inicial</Text>
            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={(value) => handleChange('password', value)}
              placeholder="Senha temporaria"
              secureTextEntry
              placeholderTextColor={THEME.textMuted}
            />

            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={form.telefone}
              onChangeText={(value) => handleChange('telefone', value)}
              placeholder="(63) 99999-9999"
              keyboardType="phone-pad"
              placeholderTextColor={THEME.textMuted}
            />

            <Text style={styles.label}>Perfil</Text>
            <View style={styles.roleRow}>
              {ROLE_OPTIONS.map((option) => {
                const selected = form.perfil === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.roleChip, selected && styles.roleChipActive]}
                    onPress={() => handleChange('perfil', option.value)}
                    activeOpacity={0.9}>
                    <Text style={[styles.roleChipText, selected && styles.roleChipTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {feedback ? (
              <View style={[styles.feedbackBox, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
                <Text style={styles.feedbackText}>{feedback.message}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.9} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color={THEME.white} />
              ) : (
                <>
                  <FontAwesome6 name="user-plus" size={14} color={THEME.white} />
                  <Text style={styles.submitText}>Cadastrar usuario</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: THEME.skyTop },
  content: { padding: 20, paddingTop: 56, paddingBottom: 80 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { color: THEME.white, fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: THEME.textMuted, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: THEME.cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  label: { color: THEME.offWhite, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: THEME.inputBg, borderWidth: 1, borderColor: THEME.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: THEME.white, fontSize: 14 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  roleChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  roleChipActive: { backgroundColor: 'rgba(77,200,90,0.18)', borderColor: 'rgba(77,200,90,0.32)' },
  roleChipText: { color: THEME.textMuted, fontSize: 12, fontWeight: '700' },
  roleChipTextActive: { color: THEME.white },
  feedbackBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16, borderWidth: 1 },
  feedbackSuccess: { backgroundColor: 'rgba(77,200,90,0.15)', borderColor: 'rgba(77,200,90,0.35)' },
  feedbackError: { backgroundColor: 'rgba(255,107,107,0.15)', borderColor: 'rgba(255,107,107,0.35)' },
  feedbackText: { color: THEME.white, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  submitButton: { marginTop: 18, backgroundColor: THEME.blue, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitText: { color: THEME.white, fontSize: 15, fontWeight: '800' },
});
