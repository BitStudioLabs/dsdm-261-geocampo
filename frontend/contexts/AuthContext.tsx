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
  homeRoute: '/(tabs)' | '/(tabs-gestor)';
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    ativo: row?.ativo ?? true,
    criadoEm: row?.criado_em ?? authUser.created_at ?? null,
    regionalNome: row?.regioes?.nome ?? null,
    regionalUf: row?.regioes?.uf ?? null,
  };
}

function getHomeRoute(role: UserRole): '/(tabs)' | '/(tabs-gestor)' {
  if (role === 'admin') {
    return '/(tabs-gestor)';
  }

  return '/(tabs)';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const currentUser = session?.user;

    if (!currentUser) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome_completo, email, perfil, telefone, foto_url, ativo, criado_em, regioes(nome, uf)')
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
      }

      setSession(data.session ?? null);
      setIsLoading(!data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setIsLoading(!!nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
