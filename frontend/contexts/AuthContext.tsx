import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

export type UserRole = 'admin' | 'instrutor' | 'proprietario' | null;

export type UserProfile = {
  id: string;
  nomeCompleto: string | null;
  email: string | null;
  perfil: UserRole;
  telefone: string | null;
  fotoUrl: string | null;
  fotoPath: string | null;
  ativo: boolean;
  criadoEm: string | null;
  regionalNome: string | null;
  regionalUf: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  homeRoute: '/(tabs)' | '/(tabs-gestor)' | '/(tabs-proprietario)';
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isInvalidRefreshTokenError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('invalid refresh token') || message.includes('refresh token not found');
}

function normalizeProfile(row: any, authUser: User): UserProfile {
  return {
    id: authUser.id,
    nomeCompleto:
      row?.nome_completo ??
      row?.nomeCompleto ??
      authUser.user_metadata?.nome_completo ??
      authUser.user_metadata?.name ??
      null,
    email: row?.email ?? authUser.email ?? null,
    perfil: row?.perfil ?? null,
    telefone: row?.telefone ?? null,
    fotoUrl: row?.foto_url ?? null,
    fotoPath: row?.foto_path ?? null,
    ativo: row?.ativo ?? true,
    criadoEm: row?.criado_em ?? authUser.created_at ?? null,
    regionalNome: row?.regioes?.nome ?? null,
    regionalUf: row?.regioes?.uf ?? null,
  };
}

function getHomeRoute(role: UserRole): '/(tabs)' | '/(tabs-gestor)' | '/(tabs-proprietario)' {
  if (role === 'admin') {
    return '/(tabs-gestor)';
  }

  if (role === 'instrutor') {
    return '/(tabs)';
  }

  if (role === 'proprietario') {
    return '/(tabs-proprietario)';
  }

  return '/(tabs)';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearCorruptedSession = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      console.error('Erro ao limpar sessão local inválida:', signOutError);
    } finally {
      setSession(null);
      setProfile(null);
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = session?.user;

    if (!currentUser) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome_completo, email, perfil, telefone, foto_url, foto_path, ativo, criado_em, regioes(nome, uf)')
      .eq('id', currentUser.id)
      .single();

    if (error) {
      console.error('Erro ao carregar perfil:', error.message);
      setProfile(normalizeProfile(null, currentUser));
      return;
    }

    setProfile(normalizeProfile(data, currentUser));
  }, [session?.user]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        console.error('Erro ao recuperar sessao:', error.message);
        if (isInvalidRefreshTokenError(error)) {
          clearCorruptedSession();
          return;
        }
      }

      setSession(data.session ?? null);
      setIsLoading(!data.session);
    }).catch((error) => {
      console.error('Erro inesperado ao recuperar sessao:', error);
      if (isMounted && isInvalidRefreshTokenError(error)) {
        clearCorruptedSession();
        return;
      }

      if (isMounted) {
        setSession(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setSession(nextSession ?? null);
        setIsLoading(!!nextSession);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setSession(nextSession ?? null);
      setIsLoading(!!nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearCorruptedSession]);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    refreshProfile().finally(() => {
      setIsLoading(false);
    });
  }, [refreshProfile, session?.user]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error(
          'Este e-mail ainda nao foi confirmado no Supabase. Confirme o link enviado para a caixa de entrada ou crie o usuario pela rota administrativa com confirmacao imediata.'
        );
      }

      throw new Error(error.message);
    }
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.perfil ?? null,
      homeRoute: getHomeRoute(profile?.perfil ?? null),
      isAuthenticated: !!session?.user,
      isLoading,
      login,
      logout,
      refreshProfile,
    }),
    [isLoading, login, logout, profile, refreshProfile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
