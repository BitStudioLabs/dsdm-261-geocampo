import { useCallback, useState } from 'react';

import type { LoginFormActions, LoginFormState, LoginScreenProps } from '../types';

function normalizeLoginError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? ((error as { message?: string }).message ?? '')
        : '';

  const normalized = message.toLowerCase();

  if (!normalized) {
    return 'Nao foi possivel entrar agora. Tente novamente em instantes.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.';
  }

  if (normalized.includes('email logins are disabled')) {
    return 'O login por e-mail esta desativado neste projeto do Supabase.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Sua conta ainda nao foi liberada para acesso. Em ambiente de teste, confirme o usuario pelo painel ou pelo script administrativo.';
  }

  if (normalized.includes('network request failed') || normalized.includes('fetch failed')) {
    return 'Nao foi possivel conectar ao Supabase. Confira sua internet e as variaveis do projeto.';
  }

  return message;
}

export function useLoginForm(onLogin?: LoginScreenProps['onLogin']): LoginFormState & LoginFormActions {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onLogin?.(email.trim(), password);
    } catch (e: any) {
      setError(normalizeLoginError(e));
    } finally {
      setLoading(false);
    }
  }, [email, onLogin, password]);

  const toggleShowPass = useCallback(() => {
    setShowPass((current) => !current);
  }, []);

  return {
    email,
    password,
    loading,
    emailFocused,
    passFocused,
    showPass,
    error,
    setEmail,
    setPassword,
    setEmailFocused,
    setPassFocused,
    toggleShowPass,
    handleLogin,
  };
}
