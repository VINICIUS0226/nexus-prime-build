import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [loading, setLoading] = useState(true);

  const fetchTheme = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .in('config_key', ['theme_mode', 'primary_color']);

      if (error) throw error;

      const configMap: Partial<ThemeConfig> = {};
      data?.forEach((row) => {
        if (row.config_key === 'theme_mode') {
          configMap.theme_mode = (row.config_value as ThemeMode) || 'light';
        }
        if (row.config_key === 'primary_color') {
          configMap.primary_color = row.config_value || defaultTheme.primary_color;
        }
      });

      const newTheme = { ...defaultTheme, ...configMap };
      setTheme(newTheme);
      applyTheme(newTheme.theme_mode, newTheme.primary_color);
    } catch (error) {
      console.error('Error fetching theme:', error);
      applyTheme(defaultTheme.theme_mode, defaultTheme.primary_color);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTheme = async (newTheme: Partial<ThemeConfig>) => {
    try {
      const updates = Object.entries(newTheme).map(([key, value]) => ({
        config_key: key,
        config_value: value || null,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_config')
          .upsert(update, { onConflict: 'config_key' });

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
