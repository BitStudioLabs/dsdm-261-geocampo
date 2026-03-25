import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type UserRole = 'instrutor' | 'proprietario' | 'gestor';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  selectedRole: UserRole | null;
  setSelectedRole: (role: UserRole | null) => void;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ROLE_INFO: Record<UserRole, { title: string; description: string; icon: string }> = {
  instrutor: {
    title: 'Instrutor de Campo',
    description: 'Realiza visitas técnicas nas propriedades atribuídas',
    icon: 'person-walking',
  },
  proprietario: {
    title: 'Proprietário Rural',
    description: 'Acompanha histórico de visitas em sua propriedade',
    icon: 'house-chimney',
  },
  gestor: {
    title: 'Gestor Institucional',
    description: 'Administra auditoria e gerencia instrutores',
    icon: 'chart-line',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    // Simular login - em producao seria uma chamada API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simular usuario logado
    const mockUser: UserProfile = {
      id: '1',
      name: role === 'instrutor' ? 'João Silva' : role === 'proprietario' ? 'Maria Santos' : 'Carlos Oliveira',
      email,
      role,
    };

    setUser(mockUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setSelectedRole(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        selectedRole,
        setSelectedRole,
        login,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
