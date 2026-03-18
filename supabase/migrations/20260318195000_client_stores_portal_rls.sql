-- =====================================================
-- Client Portal: Permitir SELECT em `stores` para o cliente
-- com base no `customers.store_id` do próprio usuário.
--
-- Motivo:
-- A policy existente para `stores` usa `profiles.store_id`.
-- Se `profiles.store_id` não estiver preenchido para o cliente,
-- a consulta bloqueia e a UI não consegue decidir "mesma cidade".
-- =====================================================

CREATE POLICY "Clients can view their store (portal)"
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT c.store_id
      FROM public.customers c
      WHERE c.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
        AND c.store_id IS NOT NULL
    )
  );

