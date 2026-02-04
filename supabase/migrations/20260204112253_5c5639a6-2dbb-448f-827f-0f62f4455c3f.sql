-- Update user_roles policies to allow super_admin to manage all roles
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Super admins can do everything with user_roles
CREATE POLICY "Super admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (is_super_admin(auth.uid()));

-- Admins can manage roles for users in their store (excluding super_admin role)
CREATE POLICY "Admins can manage user roles in their store"
ON public.user_roles
FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  role != 'super_admin' AND
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE store_id = get_user_store_id(auth.uid())
  )
);

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Update customers policy to EXCLUDE super_admin from viewing
DROP POLICY IF EXISTS "Users can view customers from their store" ON public.customers;
CREATE POLICY "Users can view customers from their store"
ON public.customers
FOR SELECT
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

-- Update sales policy to EXCLUDE super_admin from viewing
DROP POLICY IF EXISTS "Users can view sales from their store" ON public.sales;
CREATE POLICY "Users can view sales from their store"
ON public.sales
FOR SELECT
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

-- Update reservations policy to EXCLUDE super_admin from viewing
DROP POLICY IF EXISTS "Users can view reservations from their store" ON public.reservations;
CREATE POLICY "Users can view reservations from their store"
ON public.reservations
FOR SELECT
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

-- Update products policy to EXCLUDE super_admin from viewing
DROP POLICY IF EXISTS "Users can view products from their store or super_admin" ON public.products;
CREATE POLICY "Users can view products from their store"
ON public.products
FOR SELECT
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

-- Update INSERT/UPDATE policies to also exclude super_admin from store data operations
DROP POLICY IF EXISTS "Users can create customers in their store" ON public.customers;
CREATE POLICY "Users can create customers in their store"
ON public.customers
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

DROP POLICY IF EXISTS "Users can update customers in their store" ON public.customers;
CREATE POLICY "Users can update customers in their store"
ON public.customers
FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

DROP POLICY IF EXISTS "Admins can delete customers in their store" ON public.customers;
CREATE POLICY "Admins can delete customers in their store"
ON public.customers
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

DROP POLICY IF EXISTS "Users can create sales in their store" ON public.sales;
CREATE POLICY "Users can create sales in their store"
ON public.sales
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

DROP POLICY IF EXISTS "Users can update sales in their store" ON public.sales;
CREATE POLICY "Users can update sales in their store"
ON public.sales
FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

DROP POLICY IF EXISTS "Users can create reservations in their store" ON public.reservations;
CREATE POLICY "Users can create reservations in their store"
ON public.reservations
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

DROP POLICY IF EXISTS "Users can update reservations in their store" ON public.reservations;
CREATE POLICY "Users can update reservations in their store"
ON public.reservations
FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

DROP POLICY IF EXISTS "Users can create products in their store" ON public.products;
CREATE POLICY "Users can create products in their store"
ON public.products
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

DROP POLICY IF EXISTS "Users can update products in their store" ON public.products;
CREATE POLICY "Users can update products in their store"
ON public.products
FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);

DROP POLICY IF EXISTS "Admins can delete products in their store" ON public.products;
CREATE POLICY "Admins can delete products in their store"
ON public.products
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') AND
  ((store_id = get_user_store_id(auth.uid())) OR (store_id IS NULL))
);