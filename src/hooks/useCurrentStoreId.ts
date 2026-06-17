import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useCurrentStoreId() {
  const { user, userRole, loading: authLoading } = useAuth();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (authLoading) return;

      if (!user) {
        setStoreId(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Admin/employee: storeId vem de profiles.store_id
        if (userRole === 'admin' || userRole === 'employee' || userRole === 'super_admin') {
          const { data, error } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .maybeSingle();

          if (error) throw error;
          if (mounted) setStoreId(data?.store_id ?? null);
          return;
        }

        // Client: storeId vem de customers.store_id usando o e-mail do usuário autenticado.
        const email = user.email;
        if (!email) {
          if (mounted) setStoreId(null);
          return;
        }

        const { data, error } = await supabase
          .from('customers')
          .select('store_id')
          .eq('email', email)
          .maybeSingle();

        if (error) throw error;
        if (mounted) setStoreId(data?.store_id ?? null);
      } catch (err) {
        console.warn('Erro ao determinar store_id atual:', err);
        if (mounted) setStoreId(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [authLoading, user, userRole]);

  return { storeId, loading };
}
