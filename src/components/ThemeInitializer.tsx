import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const THEME_CACHE_KEY = 'app-theme-cache';

function applyThemeToDOM(mode: string, primaryColor: string) {
  const root = document.documentElement;
  
  const isDark = mode === 'dark' || 
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  root.classList.toggle('dark', isDark);
  root.style.setProperty('--primary', primaryColor);
  
  const parts = primaryColor.split(' ');
  if (parts.length === 3) {
    const h = parts[0];
    const s = parts[1];
    const l = parseInt(parts[2]) + 10;
    root.style.setProperty('--primary-glow', `${h} ${s} ${Math.min(l, 95)}%`);
  }
}

function cacheTheme(mode: string, primary: string) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({ mode, primary }));
  } catch (e) {
    // localStorage not available
  }
}

export function ThemeInitializer() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const initTheme = async () => {
      let mode = 'light';
      let primaryColor = '0 100% 71%';

      try {
        const { data } = await supabase
          .from('system_config')
          .select('config_key, config_value')
          .in('config_key', ['theme_mode', 'primary_color']);

        data?.forEach((row) => {
          if (row.config_key === 'theme_mode' && row.config_value) {
            mode = row.config_value;
          }
          if (row.config_key === 'primary_color' && row.config_value) {
            primaryColor = row.config_value;
          }
        });
      } catch (error) {
        console.error('Error fetching theme from DB:', error);
      }

      // Apply and cache for next load
      applyThemeToDOM(mode, primaryColor);
      cacheTheme(mode, primaryColor);
      setInitialized(true);
    };

    initTheme();
  }, [initialized]);

  return null;
}
