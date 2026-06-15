import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

const THEME_CACHE_KEY_BASE = 'app-theme-cache';

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

function cacheTheme(mode: string, primary: string, cacheKey: string) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ mode, primary }));
  } catch (e) {
    // localStorage not available
  }
}

export function ThemeInitializer() {
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const { userRole, loading: authLoading } = useAuth();
  const { storeId, loading: storeIdLoading } = useCurrentStoreId();

  useEffect(() => {
    if (authLoading || storeIdLoading) return;

    const nextAppliedKey = `${userRole ?? 'client'}:${storeId ?? 'global'}`;
    if (appliedKey === nextAppliedKey) return;

    const initTheme = async () => {
      let mode = 'light';
      let primaryColor = '0 100% 71%';

      try {
        const includeGlobalFallback = userRole !== null;
        const cacheKey = storeId ? `${THEME_CACHE_KEY_BASE}:${storeId}` : `${THEME_CACHE_KEY_BASE}:global`;

        // Cache primeiro (reduz flash).
        try {
          const cachedRaw = localStorage.getItem(cacheKey);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as { mode?: string; primary?: string };
            if (cached.mode) mode = cached.mode;
            if (cached.primary) primaryColor = cached.primary;
          }
        } catch {
          // cache inválido/indisponível
        }

        // Busca no banco: store específica tem prioridade sobre o global.
        const themeKeys = ['theme_mode', 'primary_color'];
        const [storeRes, globalRes] = await Promise.all([
          storeId
            ? supabase
                .from('system_config')
                .select('config_key, config_value')
                .eq('store_id', storeId)
                .in('config_key', themeKeys)
            : Promise.resolve({ data: [], error: null as any }),
          includeGlobalFallback
            ? supabase
                .from('system_config')
                .select('config_key, config_value')
                .is('store_id', null)
                .in('config_key', themeKeys)
            : Promise.resolve({ data: [], error: null as any }),
        ]);

        if (storeRes.error) throw storeRes.error;
        if (globalRes.error) throw globalRes.error;

        const globalMap: Record<string, string> = {};
        (globalRes.data || []).forEach((row: any) => {
          if (row.config_key && row.config_value) globalMap[row.config_key] = row.config_value;
        });

        const storeMap: Record<string, string> = {};
        (storeRes.data || []).forEach((row: any) => {
          if (row.config_key && row.config_value) storeMap[row.config_key] = row.config_value;
        });

        if (globalMap.theme_mode) mode = globalMap.theme_mode;
        if (globalMap.primary_color) primaryColor = globalMap.primary_color;
        if (storeMap.theme_mode) mode = storeMap.theme_mode;
        if (storeMap.primary_color) primaryColor = storeMap.primary_color;
      } catch (error) {
        console.error('Error fetching theme from DB:', error);
      }

      // Apply and cache for next load
      applyThemeToDOM(mode, primaryColor);
      const finalCacheKey = storeId
        ? `${THEME_CACHE_KEY_BASE}:${storeId}`
        : `${THEME_CACHE_KEY_BASE}:global`;
      cacheTheme(mode, primaryColor, finalCacheKey);
      setAppliedKey(nextAppliedKey);
    };

    initTheme();
  }, [appliedKey, authLoading, storeIdLoading, storeId, userRole]);

  return null;
}
