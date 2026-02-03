import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Representative {
  id: string;
  full_name: string;
  phone: string | null;
  store_id: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  role?: 'admin' | 'employee' | 'super_admin';
  store_name?: string;
}

export function useRepresentatives() {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRepresentatives = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          phone,
          store_id,
          must_change_password,
          created_at,
          updated_at,
          stores (name)
        `)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch roles for each profile
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user_id to role
      const roleMap = new Map<string, string>();
      roles?.forEach((r) => {
        roleMap.set(r.user_id, r.role);
      });

      // Combine profiles with roles
      const repsWithRoles = profiles?.map((profile) => ({
        ...profile,
        role: roleMap.get(profile.id) as 'admin' | 'employee' | 'super_admin' | undefined,
        store_name: (profile.stores as any)?.name || null,
      })) || [];

      setRepresentatives(repsWithRoles);
    } catch (error: any) {
      console.error('Error fetching representatives:', error);
      toast({
        title: 'Erro ao carregar representantes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateRepresentative = async (id: string, updates: { store_id?: string | null; role?: string }) => {
    try {
      // Update profile store_id
      if (updates.store_id !== undefined) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ store_id: updates.store_id })
          .eq('id', id);

        if (profileError) throw profileError;
      }

      // Update role if provided
      if (updates.role) {
        // First delete existing role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', id);

        // Then insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: id, role: updates.role as 'admin' | 'employee' | 'super_admin' });

        if (roleError) throw roleError;
      }

      await fetchRepresentatives();
      toast({
        title: 'Representante atualizado',
        description: 'O representante foi atualizado com sucesso.',
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error updating representative:', error);
      toast({
        title: 'Erro ao atualizar representante',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteRepresentative = async (id: string) => {
    try {
      // Delete the user from auth (this will cascade to profiles and roles)
      const { error } = await supabase.auth.admin.deleteUser(id);
      
      // Note: This requires admin privileges which we don't have from client
      // Instead, we'll just unlink them from the store and remove their role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ store_id: null })
        .eq('id', id);

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', id);

      if (roleError) throw roleError;

      await fetchRepresentatives();
      toast({
        title: 'Representante removido',
        description: 'O representante foi desvinculado com sucesso.',
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting representative:', error);
      toast({
        title: 'Erro ao remover representante',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchRepresentatives();
  }, [fetchRepresentatives]);

  return { representatives, loading, updateRepresentative, deleteRepresentative, refetch: fetchRepresentatives };
}
