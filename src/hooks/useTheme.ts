import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  name: string;
}

export const PRESET_COLORS: ThemeColors[] = [
  { primary: '0 100% 71%', name: 'Coral' },
  { primary: '238 85% 64%', name: 'Violeta' },
  { primary: '197 78% 54%', name: 'Azul' },
  { primary: '142 76% 45%', name: 'Verde' },
  { primary: '25 95% 53%', name: 'Laranja' },
  { primary: '280 65% 60%', name: 'Roxo' },
  { primary: '340 82% 52%', name: 'Rosa' },
  { primary: '45 93% 47%', name: 'Dourado' },
];

interface ThemeConfig {
  theme_mode: ThemeMode;
  primary_color: string;
}

const defaultTheme: ThemeConfig = {
  theme_mode: 'light',
  primary_color: '0 100% 71%',
};

const THEME_CACHE_KEY = 'app-theme-cache';

function cacheTheme(mode: string, primary: string) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({ mode, primary }));
  } catch (e) {
    // localStorage not available
  }
}

function applyTheme(mode: ThemeMode, primaryColor: string) {
  const root = document.documentElement;
  
  // Apply dark/light mode
  const isDark = mode === 'dark' || 
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  root.classList.toggle('dark', isDark);
  
  // Apply primary color
  root.style.setProperty('--primary', primaryColor);
  
  // Calculate a lighter glow version
  const parts = primaryColor.split(' ');
  if (parts.length === 3) {
    const h = parts[0];
    const s = parts[1];
    const l = parseInt(parts[2]) + 10;
    root.style.setProperty('--primary-glow', `${h} ${s} ${Math.min(l, 95)}%`);
  }
  
  // Cache for instant load on next visit
  cacheTheme(mode, primaryColor);
}

export function useTheme() {
  const { userRole, loading: authLoading } = useAuth();
  const { storeId, loading: storeIdLoading } = useCurrentStoreId();
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [loading, setLoading] = useState(true);

  const fetchTheme = useCallback(async () => {
    if (authLoading || storeIdLoading) return;
    setLoading(true);
    try {
      const keys: Array<keyof ThemeConfig> = ['theme_mode', 'primary_color'];

      const includeGlobalFallback = userRole !== null;

      const [storeRes, globalRes] = await Promise.all([
        storeId
          ? supabase
              .from('system_config')
              .select('config_key, config_value')
              .eq('store_id', storeId)
              .in('config_key', keys as any)
          : Promise.resolve({ data: [], error: null as any }),
        includeGlobalFallback
          ? supabase
              .from('system_config')
              .select('config_key, config_value')
              .is('store_id', null)
              .in('config_key', keys as any)
          : Promise.resolve({ data: [], error: null as any }),
      ]);

      if (storeRes.error) throw storeRes.error;
      if (globalRes.error) throw globalRes.error;

      const storeMap: Partial<ThemeConfig> = {};
      (storeRes.data || []).forEach((row: any) => {
        if (row.config_key === 'theme_mode') {
          storeMap.theme_mode = (row.config_value as ThemeMode) || 'light';
        }
        if (row.config_key === 'primary_color') {
          storeMap.primary_color = row.config_value || defaultTheme.primary_color;
        }
      });

      const globalMap: Partial<ThemeConfig> = {};
      (globalRes.data || []).forEach((row: any) => {
        if (row.config_key === 'theme_mode') {
          globalMap.theme_mode = (row.config_value as ThemeMode) || 'light';
        }
        if (row.config_key === 'primary_color') {
          globalMap.primary_color = row.config_value || defaultTheme.primary_color;
        }
      });

      const newTheme = { ...defaultTheme, ...globalMap, ...storeMap };
      setTheme(newTheme);
      applyTheme(newTheme.theme_mode, newTheme.primary_color);
    } catch (error) {
      console.error('Error fetching theme:', error);
      applyTheme(defaultTheme.theme_mode, defaultTheme.primary_color);
    } finally {
      setLoading(false);
    }
  }, [authLoading, storeIdLoading, storeId, userRole]);

  const saveTheme = async (newTheme: Partial<ThemeConfig>) => {
    if (!storeId) {
      return { success: false, error: new Error('store_id não encontrado para o usuário atual') };
    }

    try {
      const updates = Object.entries(newTheme).map(([key, value]) => ({
        store_id: storeId,
        config_key: key,
        config_value: value || null,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_config')
          .upsert(update, { onConflict: 'store_id,config_key' });

        if (error) throw error;
      }

      const updatedTheme = { ...theme, ...newTheme };
      setTheme(updatedTheme);
      applyTheme(updatedTheme.theme_mode, updatedTheme.primary_color);
      
      return { success: true };
    } catch (error) {
      console.error('Error saving theme:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme.theme_mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system', theme.primary_color);
      
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme.theme_mode, theme.primary_color]);

  return { theme, loading, saveTheme, refetch: fetchTheme };
}
