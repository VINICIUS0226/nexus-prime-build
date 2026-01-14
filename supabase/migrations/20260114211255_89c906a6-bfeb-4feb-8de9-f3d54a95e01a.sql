-- Remover política de SELECT existente que é muito permissiva
DROP POLICY IF EXISTS "Authenticated users can view system config" ON public.system_config;

-- Criar nova política de SELECT restrita apenas a admins
CREATE POLICY "Admins can view system config"
ON public.system_config
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role)
);