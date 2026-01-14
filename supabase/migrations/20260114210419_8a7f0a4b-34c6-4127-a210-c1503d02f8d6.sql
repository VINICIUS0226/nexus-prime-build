-- Remover política de SELECT existente que é muito permissiva
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

-- Criar nova política de SELECT que restringe acesso apenas a usuários com roles definidos (admin ou employee)
CREATE POLICY "Users with roles can view customers"
ON public.customers
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

-- Atualizar política de UPDATE para ser mais restritiva
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;

CREATE POLICY "Users with roles can update customers"
ON public.customers
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

-- Atualizar política de INSERT para ser mais restritiva
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;

CREATE POLICY "Users with roles can create customers"
ON public.customers
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);