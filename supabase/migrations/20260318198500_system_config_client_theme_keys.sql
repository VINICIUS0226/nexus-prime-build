-- =====================================================
-- Permitir tema no portal do cliente (somente chaves de UX)
-- =====================================================

DROP POLICY IF EXISTS "Clients can view store branding (store-scoped)" ON public.system_config;

CREATE POLICY "Clients can view store branding (store-scoped)"
ON public.system_config
FOR SELECT
TO authenticated
USING (
  config_key IN (
    'store_name',
    'store_logo_url',
    'theme_mode',
    'primary_color'
  ) AND
  store_id IS NOT NULL AND
  store_id = (
    SELECT c.store_id
    FROM public.customers c
    WHERE c.email = (
      SELECT u.email
      FROM auth.users u
      WHERE u.id = auth.uid()
    )
    AND c.store_id IS NOT NULL
    LIMIT 1
  )
);
