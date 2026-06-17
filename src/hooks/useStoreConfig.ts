import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { resolveStoreLogoUrl } from '@/lib/storageImages';

export interface StoreConfig {
  store_name: string;
  store_phone: string;
  store_email: string;
  store_address: string;
  store_cnpj: string;
  store_logo_url: string;
  /**
   * Configurações de pagamento Asaas armazenadas em system_config.
   * Mantidas como string para compatibilidade simples com a tabela.
   */
  asaas_enabled: string; // 'true' | 'false'
  asaas_api_key: string;
  asaas_environment: string; // 'sandbox' | 'production'
  asaas_billing_type: string; // 'PIX' | 'BOLETO' | 'CREDIT_CARD'
}

const defaultConfig: StoreConfig = {
  store_name: '',
  store_phone: '',
  store_email: '',
  store_address: '',
  store_cnpj: '',
  store_logo_url: '',
  asaas_enabled: 'false',
  asaas_api_key: '',
  asaas_environment: 'sandbox',
  asaas_billing_type: 'PIX',
};

export function useStoreConfig() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { storeId, loading: storeIdLoading } = useCurrentStoreId();
  const [config, setConfig] = useState<StoreConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (authLoading || storeIdLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const keys = Object.keys(defaultConfig);

      // 1) Global fallback (apenas para admin/employee/super_admin).
      // Para cliente, evitamos vazar branding/config de outra loja.
      const includeGlobalFallback = userRole !== null;

      const [storeRes, globalRes] = await Promise.all([
        storeId
          ? supabase
              .from('system_config')
              .select('config_key, config_value')
              .eq('store_id', storeId)
              .in('config_key', keys)
          : Promise.resolve({ data: [], error: null as any }),
        includeGlobalFallback
          ? supabase
              .from('system_config')
              .select('config_key, config_value')
              .is('store_id', null)
              .in('config_key', keys)
          : Promise.resolve({ data: [], error: null as any }),
      ]);

      if (storeRes.error) throw storeRes.error;
      if (globalRes.error) throw globalRes.error;

      const storeMap: Partial<StoreConfig> = {};
      (storeRes.data || []).forEach((row: any) => {
        if (row.config_key in defaultConfig) {
          storeMap[row.config_key as keyof StoreConfig] = row.config_value || '';
        }
      });

      const globalMap: Partial<StoreConfig> = {};
      (globalRes.data || []).forEach((row: any) => {
        if (row.config_key in defaultConfig) {
          globalMap[row.config_key as keyof StoreConfig] = row.config_value || '';
        }
      });

      // Sobrepõe o que for da loja por cima do global.
      const nextConfig = { ...defaultConfig, ...globalMap, ...storeMap };
      nextConfig.store_logo_url = resolveStoreLogoUrl(nextConfig.store_logo_url) || '';
      setConfig(nextConfig);
    } catch (error) {
      console.error('Error fetching store config:', error);
    } finally {
      setLoading(false);
    }
  }, [authLoading, storeIdLoading, storeId, user, userRole]);

  const saveConfig = async (newConfig: Partial<StoreConfig>) => {
    if (!storeId) {
      return { success: false, error: new Error('store_id não encontrado para o usuário atual') };
    }

    setSaving(true);
    try {
      const updates = Object.entries(newConfig).map(([key, value]) => ({
        store_id: storeId,
        config_key: key,
        config_value: value ?? null,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_config')
          .upsert(update, { onConflict: 'store_id,config_key' });

        if (error) throw error;
      }

      setConfig((prev) => {
        const nextConfig = { ...prev, ...newConfig };
        nextConfig.store_logo_url = resolveStoreLogoUrl(nextConfig.store_logo_url) || '';
        return nextConfig;
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving store config:', error);
      return { success: false, error };
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !storeIdLoading && user) {
      fetchConfig();
    } else if (!authLoading && !storeIdLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, storeIdLoading, user, fetchConfig]);

  const isLoading = authLoading || loading;

  return { config, loading: isLoading, saving, saveConfig, refetch: fetchConfig };
}
