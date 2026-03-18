-- =====================================================
-- Client Portal RLS
-- Permite que usuários do tipo "client" façam autoatendimento:
--  - Ver catálogo (produtos, variações e imagens)
--  - Criar reservas/pedidos (reservations + reservation_items)
--  - Ver suas próprias reservas
-- =====================================================

-- Helper subquery (replicada abaixo): customer_id do usuário logado via email.

-- PRODUCTS: permitir SELECT para clientes autenticados (quando existir customer com o email do usuário).
CREATE POLICY "Clients can view products (portal)"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.email = (SELECT email FROM auth.users u WHERE u.id = auth.uid())
    )
  );

-- PRODUCT_VARIATIONS: permitir SELECT para o portal.
CREATE POLICY "Clients can view product variations (portal)"
  ON public.product_variations
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.email = (SELECT email FROM auth.users u WHERE u.id = auth.uid())
    )
  );

-- PRODUCT_IMAGES: permitir SELECT para o portal.
CREATE POLICY "Clients can view product images (portal)"
  ON public.product_images
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.email = (SELECT email FROM auth.users u WHERE u.id = auth.uid())
    )
  );

-- RESERVATIONS: permitir SELECT das próprias reservas.
CREATE POLICY "Clients can view own reservations (portal)"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    customer_id = (
      SELECT c.id
      FROM public.customers c
      WHERE c.email = (SELECT email FROM auth.users u WHERE u.id = auth.uid())
      LIMIT 1
    )
  );

-- RESERVATIONS: permitir INSERT de reservas criadas pelo próprio usuário cliente.
CREATE POLICY "Clients can create own reservations (portal)"
  ON public.reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND customer_id = (
      SELECT c.id
      FROM public.customers c
      WHERE c.email = (SELECT email FROM auth.users u WHERE u.id = auth.uid())
      LIMIT 1
    )
  );

-- RESERVATION_ITEMS: permitir leitura dos itens das próprias reservas.
CREATE POLICY "Clients can view own reservation items (portal)"
  ON public.reservation_items
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    reservation_id IN (
      SELECT r.id
      FROM public.reservations r
      WHERE r.created_by = auth.uid()
    )
  );

-- RESERVATION_ITEMS: permitir INSERT dos itens apenas para reservas do próprio cliente.
CREATE POLICY "Clients can insert own reservation items (portal)"
  ON public.reservation_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reservation_id IN (
      SELECT r.id
      FROM public.reservations r
      WHERE r.created_by = auth.uid()
    )
  );

-- CUSTOMERS: permitir o cliente ler SOMENTE o próprio registro
-- (usado para achar customer_id no portal e para preencher dados como CEP).
CREATE POLICY "Clients can view their own customer row (portal)"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  );

-- SALES: permitir que o cliente veja as próprias vendas
CREATE POLICY "Clients can view own sales (portal)"
  ON public.sales
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    customer_id = (
      SELECT c.id
      FROM public.customers c
      WHERE c.email = (SELECT email FROM auth.users u WHERE u.id = auth.uid())
      LIMIT 1
    )
  );

-- PAYMENTS: permitir que o cliente veja os pagamentos das próprias vendas
CREATE POLICY "Clients can view own payments (portal)"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    sale_id IN (
      SELECT s.id
      FROM public.sales s
      WHERE s.customer_id = (
        SELECT c.id
        FROM public.customers c
        WHERE c.email = (SELECT email FROM auth.users u WHERE u.id = auth.uid())
        LIMIT 1
      )
    )
  );

