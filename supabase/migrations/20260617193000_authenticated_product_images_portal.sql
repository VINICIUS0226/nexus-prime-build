-- Permite que usuarios autenticados no portal leiam imagens de produtos.
-- Sem esta policy, a policy publica de anon nao cobre sessoes autenticadas
-- e o relacionamento product_images volta vazio para clientes logados.

DROP POLICY IF EXISTS "Authenticated can view product images for portal" ON public.product_images;

CREATE POLICY "Authenticated can view product images for portal"
  ON public.product_images
  FOR SELECT
  TO authenticated
  USING (true);
