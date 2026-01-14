-- =====================================================
-- PRODUCTS TABLE - Corrigir políticas permissivas
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;

CREATE POLICY "Users with roles can create products"
ON public.products
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can update products"
ON public.products
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

-- =====================================================
-- PRODUCT_VARIATIONS TABLE - Corrigir políticas permissivas
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can manage variations" ON public.product_variations;
DROP POLICY IF EXISTS "Authenticated users can view variations" ON public.product_variations;

CREATE POLICY "Users with roles can view variations"
ON public.product_variations
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can create variations"
ON public.product_variations
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can update variations"
ON public.product_variations
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Admins can delete variations"
ON public.product_variations
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::user_role)
);

-- =====================================================
-- PRODUCT_IMAGES TABLE - Corrigir políticas permissivas
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can manage product images" ON public.product_images;
DROP POLICY IF EXISTS "Authenticated users can view product images" ON public.product_images;

CREATE POLICY "Users with roles can view product images"
ON public.product_images
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can create product images"
ON public.product_images
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can update product images"
ON public.product_images
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Admins can delete product images"
ON public.product_images
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::user_role)
);

-- =====================================================
-- PRODUCT_REVIEWS TABLE - Corrigir políticas permissivas
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Authenticated users can update reviews" ON public.product_reviews;

CREATE POLICY "Users with roles can create reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can update reviews"
ON public.product_reviews
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

-- =====================================================
-- SALES TABLE - Corrigir políticas permissivas
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;

CREATE POLICY "Users with roles can view sales"
ON public.sales
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can create sales"
ON public.sales
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can update sales"
ON public.sales
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

-- =====================================================
-- RESERVATIONS TABLE - Corrigir políticas permissivas
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can view reservations" ON public.reservations;

CREATE POLICY "Users with roles can view reservations"
ON public.reservations
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can create reservations"
ON public.reservations
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can update reservations"
ON public.reservations
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

-- =====================================================
-- RESERVATION_ITEMS TABLE - Corrigir políticas permissivas
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can manage reservation items" ON public.reservation_items;
DROP POLICY IF EXISTS "Authenticated users can view reservation items" ON public.reservation_items;

CREATE POLICY "Users with roles can view reservation items"
ON public.reservation_items
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can create reservation items"
ON public.reservation_items
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Users with roles can update reservation items"
ON public.reservation_items
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::user_role) OR 
  public.has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Admins can delete reservation items"
ON public.reservation_items
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::user_role)
);