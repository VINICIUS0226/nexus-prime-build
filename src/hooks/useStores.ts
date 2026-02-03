import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Store {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast({
        title: 'Erro ao carregar lojas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createStore = async (store: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .insert(store)
        .select()
        .single();

      if (error) throw error;
      setStores((prev) => [...prev, data]);
      toast({
        title: 'Loja criada',
        description: 'A loja foi criada com sucesso.',
      });
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating store:', error);
      toast({
        title: 'Erro ao criar loja',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const updateStore = async (id: string, updates: Partial<Store>) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setStores((prev) => prev.map((s) => (s.id === id ? data : s)));
      toast({
        title: 'Loja atualizada',
        description: 'A loja foi atualizada com sucesso.',
      });
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating store:', error);
      toast({
        title: 'Erro ao atualizar loja',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteStore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setStores((prev) => prev.filter((s) => s.id !== id));
      toast({
        title: 'Loja excluída',
        description: 'A loja foi excluída com sucesso.',
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting store:', error);
      toast({
        title: 'Erro ao excluir loja',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return { stores, loading, createStore, updateStore, deleteStore, refetch: fetchStores };
}
