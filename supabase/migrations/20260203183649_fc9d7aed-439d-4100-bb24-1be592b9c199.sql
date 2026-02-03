-- 1. Create stores table
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- 2. Add store_id and must_change_password to profiles table FIRST
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- 3. Add store_id to other tables
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- 4. Create helper functions
CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::user_role
  )
$$;

-- 5. NOW create store policies (after store_id column exists in profiles)
CREATE POLICY "Super admins can manage stores"
ON public.stores
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Users can view their own store"
ON public.stores
FOR SELECT
USING (
  id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 6. Update RLS policies for multi-tenant isolation

-- Products
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
CREATE POLICY "Users can view products from their store or super_admin"
ON public.products
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR 
  store_id = get_user_store_id(auth.uid()) OR
  store_id IS NULL
);

DROP POLICY IF EXISTS "Users with roles can create products" ON public.products;
CREATE POLICY "Users can create products in their store"
ON public.products
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid()) OR
  ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) AND
  (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL))
);

DROP POLICY IF EXISTS "Users with roles can update products" ON public.products;
CREATE POLICY "Users can update products in their store"
ON public.products
FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR
  ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) AND
  (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL))
);

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products in their store"
ON public.products
FOR DELETE
USING (
  is_super_admin(auth.uid()) OR
  (has_role(auth.uid(), 'admin'::user_role) AND
  (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL))
);

-- Customers
DROP POLICY IF EXISTS "Users with roles can view customers" ON public.customers;
CREATE POLICY "Users can view customers from their store"
ON public.customers
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  store_id = get_user_store_id(auth.uid()) OR
  store_id IS NULL
);

DROP POLICY IF EXISTS "Users with roles can create customers" ON public.customers;
CREATE POLICY "Users can create customers in their store"
ON public.customers
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid()) OR
  ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) AND
  (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL))
);

DROP POLICY IF EXISTS "Users with roles can update customers" ON public.customers;
CREATE POLICY "Users can update customers in their store"
ON public.customers
FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR
  ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) AND
  (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL))
);

DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
CREATE POLICY "Admins can delete customers in their store"
ON public.customers
FOR DELETE
USING (
  is_super_admin(auth.uid()) OR
  (has_role(auth.uid(), 'admin'::user_role) AND
  (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL))
);

-- Sales
DROP POLICY IF EXISTS "Users with roles can view sales" ON public.sales;
CREATE POLICY "Users can view sales from their store"
ON public.sales
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  store_id = get_user_store_id(auth.uid()) OR
  store_id IS NULL
);

DROP POLICY IF EXISTS "Users with roles can create sales" ON public.sales;
CREATE POLICY "Users can create sales in their store"
ON public.sales
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid()) OR
  ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) AND
  (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL))
);

DROP POLICY IF EXISTS "Users with roles can update sales" ON public.sales;
CREATE POLICY "Users can update sales in their store"
ON public.sales
FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR
  ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) AND
  (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL))
);

-- Reservations
DROP POLICY IF EXISTS "Users with roles can view reservations" ON public.reservations;
CREATE POLICY "Users can view reservations from their store"
ON public.reservations
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  store_id = get_user_store_id(auth.uid()) OR
  store_id IS NULL
);

DROP POLICY IF EXISTS "Users with roles can create reservations" ON public.reservations;
CREATE POLICY "Users can create reservations in their store"
ON public.reservations
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid()) OR
  ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) AND
  (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL))
);

DROP POLICY IF EXISTS "Users with roles can update reservations" ON public.reservations;
CREATE POLICY "Users can update reservations in their store"
ON public.reservations
FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR
  ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) AND
  (store_id = get_user_store_id(auth.uid()) OR store_id IS NULL))
);

-- Update trigger for stores
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR
  is_super_admin(auth.uid()) OR
  (has_role(auth.uid(), 'admin'::user_role) AND store_id = get_user_store_id(auth.uid()))
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id OR
  is_super_admin(auth.uid())
);