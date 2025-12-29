import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      // Se o usuário acabou de fazer login, verificar se precisa criar profissional
      if (event === 'SIGNED_IN' && session?.user) {
        // Limpar qualquer hash da URL após confirmação
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        // Verificar se há dados de profissional pendentes
        const pendingData = localStorage.getItem('pending_professional');
        if (pendingData) {
          try {
            const professionalData = JSON.parse(pendingData);
            
            // Verificar se já existe profissional para este usuário
            const { data: existing } = await supabase
              .from('professionals')
              .select('id')
              .eq('user_id', session.user.id)
              .single();

            if (existing) {
              // Já existe, apenas atualizar
              await supabase
                .from('professionals')
                .update({
                  ...professionalData,
                  email: professionalData.email || session.user.email || null,
                })
                .eq('user_id', session.user.id);
            } else {
              // Criar novo
              await supabase
                .from('professionals')
                .insert({
                  user_id: session.user.id,
                  ...professionalData,
                  email: professionalData.email || session.user.email || null,
                  active: true,
                });
            }

            // Remover dados pendentes
            localStorage.removeItem('pending_professional');
          } catch (error) {
            console.error('Erro ao criar profissional pendente:', error);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    // Configurar a URL de redirecionamento correta (localhost:5173 para desenvolvimento)
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: redirectTo,
      }
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Traduzir mensagens de erro comuns
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        throw new Error('E-mail não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.');
      }
      throw error;
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectTo,
      }
    });
    if (error) {
      // Se o erro for que o email já está confirmado, não é um erro crítico
      if (error.message.includes('already confirmed')) {
        throw new Error('Este e-mail já está confirmado. Tente fazer login.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, resendConfirmationEmail }}>
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
