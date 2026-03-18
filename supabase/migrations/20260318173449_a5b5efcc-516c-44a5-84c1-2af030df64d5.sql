
-- Allow public (unauthenticated) read access to products for the catalog landing page
CREATE POLICY "Public can view products for catalog"
  ON public.products FOR SELECT
  TO anon
  USING (true);

-- Allow public read access to product_images for the catalog
CREATE POLICY "Public can view product images for catalog"
  ON public.product_images FOR SELECT
  TO anon
  USING (true);

-- Allow public read access to product_variations for the catalog
CREATE POLICY "Public can view variations for catalog"
  ON public.product_variations FOR SELECT
  TO anon
  USING (true);
