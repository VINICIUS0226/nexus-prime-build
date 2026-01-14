-- Remover políticas existentes que são muito permissivas
DROP POLICY IF EXISTS "Authenticated users can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;

-- Criar nova política de SELECT restrita a usuários com roles
CREATE POLICY "Users with roles can view payments"
ON public.payments
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

-- Criar política de INSERT restrita a usuários com roles
CREATE POLICY "Users with roles can create payments"
ON public.payments
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

-- Criar política de UPDATE restrita a usuários com roles
CREATE POLICY "Users with roles can update payments"
ON public.payments
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

-- Criar política de DELETE restrita apenas a admins
CREATE POLICY "Admins can delete payments"
ON public.payments
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::user_role)
);