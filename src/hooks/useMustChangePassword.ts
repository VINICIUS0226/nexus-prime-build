import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useMustChangePassword() {
  const { user } = useAuth();
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkMustChangePassword = useCallback(async () => {
    if (!user) {
      setMustChangePassword(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setMustChangePassword(data?.must_change_password || false);
    } catch (error) {
      console.error('Error checking must change password:', error);
      setMustChangePassword(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearMustChangePassword = async () => {
    if (!user) return { success: false };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id);

      if (error) throw error;
      setMustChangePassword(false);
      return { success: true };
    } catch (error) {
      console.error('Error clearing must change password:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    checkMustChangePassword();
  }, [checkMustChangePassword]);

  return { mustChangePassword, loading, clearMustChangePassword, refetch: checkMustChangePassword };
}
