import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StoreConfig {
  store_name: string;
  store_phone: string;
  store_email: string;
  store_address: string;
  store_cnpj: string;
  store_logo_url: string;
}

const defaultConfig: StoreConfig = {
  store_name: '',
  store_phone: '',
  store_email: '',
  store_address: '',
  store_cnpj: '',
  store_logo_url: '',
};

export function useStoreConfig() {
  const { user, loading: authLoading } = useAuth();
  const [config, setConfig] = useState<StoreConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (authLoading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .in('config_key', Object.keys(defaultConfig));

      if (error) throw error;

      const configMap: Partial<StoreConfig> = {};
      data?.forEach((row) => {
        if (row.config_key in defaultConfig) {
          configMap[row.config_key as keyof StoreConfig] = row.config_value || '';
        }
      });

      setConfig({ ...defaultConfig, ...configMap });
    } catch (error) {
      console.error('Error fetching store config:', error);
    } finally {
      setLoading(false);
    }
  }, [authLoading]);

  const saveConfig = async (newConfig: Partial<StoreConfig>) => {
    setSaving(true);
    try {
      const updates = Object.entries(newConfig).map(([key, value]) => ({
        config_key: key,
        config_value: value || null,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_config')
          .upsert(update, { onConflict: 'config_key' });

        if (error) throw error;
      }

      setConfig((prev) => ({ ...prev, ...newConfig }));
      return { success: true };
    } catch (error) {
      console.error('Error saving store config:', error);
      return { success: false, error };
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchConfig();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, fetchConfig]);

  const isLoading = authLoading || loading;

  return { config, loading: isLoading, saving, saveConfig, refetch: fetchConfig };
}
