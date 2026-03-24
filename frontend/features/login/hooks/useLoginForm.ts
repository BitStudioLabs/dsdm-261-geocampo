import { useCallback, useState } from 'react';

import type { LoginFormActions, LoginFormState, LoginScreenProps } from '../types';

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
      setError(e?.message ?? 'Erro ao entrar. Tente novamente.');
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
