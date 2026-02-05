import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSuperAdmin = useCallback(async () => {
    // Wait for auth to be ready
    if (authLoading) {
      return;
    }

    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } else {
        setIsSuperAdmin(!!data);
      }
    } catch (error) {
      console.error('Error checking super admin status:', error);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      checkSuperAdmin();
    }
  }, [authLoading, checkSuperAdmin]);

  // Return combined loading state
  const isLoading = authLoading || loading;

  return { isSuperAdmin, loading: isLoading, refetch: checkSuperAdmin };
}
