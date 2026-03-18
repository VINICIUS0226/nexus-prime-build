-- =====================================================
-- Client Portal Branding RLS
-- Permite que clientes leiam apenas o branding da loja
-- (store_name e store_logo_url) para exibir no portal.
-- =====================================================

CREATE POLICY "Clients can view store branding"
  ON public.system_config
  FOR SELECT
  TO authenticated
  USING (config_key IN ('store_name', 'store_logo_url'));

