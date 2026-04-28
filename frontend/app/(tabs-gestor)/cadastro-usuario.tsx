import { FontAwesome6 } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { CadastroUsuarioHeader } from '@/features/cadastro-usuario/components/CadastroUsuarioHeader';
import { FeedbackPickup } from '@/features/cadastro-usuario/components/FeedbackPickup';
import { RegionalSelector } from '@/features/cadastro-usuario/components/RegionalSelector';
import { RoleSelector } from '@/features/cadastro-usuario/components/RoleSelector';
import { THEME } from '@/features/cadastro-usuario/constants';
import { styles } from '@/features/cadastro-usuario/styles';
import type { PickupFeedback, RegionalOption, UserRoleOption } from '@/features/cadastro-usuario/types';
import { supabase } from '@/src/lib/supabase';

export default function CadastroUsuarioScreen() {
  const [form, setForm] = useState({
    nomeCompleto: '',
    email: '',
    password: '',
    telefone: '',
    perfil: 'instrutor' as UserRoleOption,
    regionalId: null as number | null,
  });
  const [regionais, setRegionais] = useState<RegionalOption[]>([]);
  const [isLoadingRegionais, setIsLoadingRegionais] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<PickupFeedback | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const showPickup = (nextFeedback: PickupFeedback) => {
    setFeedback(nextFeedback);

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 4200);
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  useEffect(() => {
    let mounted = true;

    const loadRegionais = async () => {
      setIsLoadingRegionais(true);
      const { data, error } = await supabase.from('regioes').select('id, nome, uf').order('nome');

      if (!mounted) {
        return;
      }

      if (error) {
        console.error('Erro ao carregar regionais:', error);
        showPickup({ type: 'error', message: 'Não foi possível carregar as regionais no momento.' });
        setIsLoadingRegionais(false);
        return;
      }

      setRegionais((data ?? []) as RegionalOption[]);
      setIsLoadingRegionais(false);
    };

    loadRegionais();

    return () => {
      mounted = false;
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!form.nomeCompleto.trim() || !form.email.trim() || !form.password.trim()) {
      showPickup({ type: 'error', message: 'Preencha nome, e-mail e senha para continuar.' });
      return;
    }

    if (!form.regionalId) {
      showPickup({ type: 'error', message: 'Selecione a regional do usuário para continuar.' });
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
      showPickup({ type: 'error', message: error?.message ?? 'Não foi possível criar o login do usuário.' });
      return;
    }

    const { error: profileError } = await supabase.from('usuarios').insert({
      id: data.user.id,
      nome_completo: form.nomeCompleto.trim(),
      email: form.email.trim(),
      perfil: form.perfil,
      telefone: form.telefone.trim() || null,
      id_regional: form.regionalId,
      ativo: true,
      atualizado_em: new Date().toISOString(),
    });

    setIsSubmitting(false);

    if (profileError) {
      console.error('Erro ao criar perfil do usuario:', profileError);
      showPickup({
        type: 'error',
        message: 'O login foi criado, mas não foi possível salvar o perfil em usuários.',
      });
      return;
    }

    setForm({
      nomeCompleto: '',
      email: '',
      password: '',
      telefone: '',
      perfil: 'instrutor',
      regionalId: null,
    });
    showPickup({
      type: 'success',
      message: data.session
        ? 'Usuário cadastrado com acesso liberado.'
        : 'Usuário cadastrado, mas o e-mail ainda precisa ser confirmado para liberar o login. Para acesso imediato, use o script administrativo npm run create:user.',
    });
  };

  return (
    <View style={styles.root}>
      <FeedbackPickup feedback={feedback} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <CadastroUsuarioHeader />

          <View style={styles.card}>
            <View style={styles.noticeBox}>
              <FontAwesome6 name="triangle-exclamation" size={14} color={THEME.gold} />
              <Text style={styles.noticeText}>
                O cadastro feito pelo app segue a politica de confirmacao de e-mail do Supabase. Se voce precisar liberar o acesso imediatamente, crie o usuario pelo script administrativo com confirmacao automatica.
              </Text>
            </View>

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

            <Text style={styles.label}>Permissão de acesso</Text>
            <RoleSelector value={form.perfil} onChange={(value) => handleChange('perfil', value)} />

            <Text style={styles.label}>Regional</Text>
            <RegionalSelector
              isLoading={isLoadingRegionais}
              regionais={regionais}
              selectedRegionalId={form.regionalId}
              onSelect={(regionalId) =>
                setForm((current) => ({
                  ...current,
                  regionalId,
                }))
              }
            />

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
