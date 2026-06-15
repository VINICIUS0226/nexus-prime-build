-- =====================================================
-- PersonalizaÃ§Ã£o por loja em system_config
-- =====================================================

-- 1) Estrutura: system_config passa a ser por store_id
ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Remove o unique global por config_key (agora serÃ¡ por store_id + config_key)
ALTER TABLE public.system_config
  DROP CONSTRAINT IF EXISTS system_config_config_key_key;

-- Unique por loja (mantÃ©m compatibilidade: store_id pode ser NULL para "global")
CREATE UNIQUE INDEX IF NOT EXISTS system_config_store_id_config_key_uidx
  ON public.system_config (store_id, config_key);

-- 2) RLS: recriar polÃ­ticas para refletir store_id
DROP POLICY IF EXISTS "Authenticated users can view system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can view system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can manage system config" ON public.system_config;
DROP POLICY IF EXISTS "Clients can view store branding" ON public.system_config;

-- Admin/Employee: pode ler configuraÃ§Ãµes da prÃ³pria loja (ou globais - store_id IS NULL)
CREATE POLICY "Admins/Employees can view system config (store-scoped)"
ON public.system_config
FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR
  (
    (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'employee'::user_role)) AND
    (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL)
  )
);
-- Admin: pode gerenciar configuraÃ§Ãµes da prÃ³pria loja
CREATE POLICY "Admins can manage system config (store-scoped)"
ON public.system_config
FOR ALL
USING (
  public.is_super_admin(auth.uid()) OR
  (
    public.has_role(auth.uid(), 'admin'::user_role) AND
    (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL)
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (
    public.has_role(auth.uid(), 'admin'::user_role) AND
    (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL)
  )
);
-- Cliente: somente branding da prÃ³pria loja (store_name e store_logo_url)
CREATE POLICY "Clients can view store branding (store-scoped)"
ON public.system_config
FOR SELECT
TO authenticated
USING (
  config_key IN ('store_name', 'store_logo_url') AND
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
