import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'employee' | 'super_admin' | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'employee' | 'super_admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const initializedRef = useRef(false);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;

      const roles = (data || [])
        .map((row) => row.role)
        .filter((r): r is 'admin' | 'employee' | 'super_admin' => r != null);

      // Caso o usuário tenha múltiplas roles na tabela (ex.: admin + employee),
      // escolhemos a de maior prioridade para o redirecionamento.
      if (roles.includes('super_admin')) setUserRole('super_admin');
      else if (roles.includes('admin')) setUserRole('admin');
      else if (roles.includes('employee')) setUserRole('employee');
      else setUserRole(null);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        // During initialization, skip INITIAL_SESSION — getSession handles it
        if (!initializedRef.current && event === 'INITIAL_SESSION') {
          return;
        }

        // After initialization, handle meaningful events
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserRole(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            // Defer to avoid Supabase client deadlocks
            setTimeout(() => {
              if (mounted) fetchUserRole(currentSession.user.id);
            }, 0);
          }
        }
      }
    );

    // 2. Then explicitly fetch session for initial load
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchUserRole(currentSession.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        if (mounted) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Always clear local state first to prevent stale session issues
    setUser(null);
    setSession(null);
    setUserRole(null);
    
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      console.warn('Logout request failed (session may already be expired):', error.message);
    }
    
    // Clear any stale tokens from localStorage
    localStorage.removeItem('sb-tjhhozeaxggzlwzchrja-auth-token');
    
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
