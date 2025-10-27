-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE reservation_status AS ENUM ('active', 'in_client_possession', 'returned', 'awaiting_payment', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'debit_card', 'cash', 'bank_slip');
CREATE TYPE freight_calculation_rule AS ENUM ('fixed', 'by_zip', 'by_weight', 'by_value', 'free');

-- Profiles table (user info accessible via API)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  cpf TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  data_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  barcode TEXT,
  cost_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  profit_margin DECIMAL(5,2),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Product variations (SKU) table
CREATE TABLE public.product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  size TEXT,
  color TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

-- Reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status reservation_status NOT NULL DEFAULT 'active',
  bag_code TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Reservation items table (many-to-many)
CREATE TABLE public.reservation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  variation_id UUID NOT NULL REFERENCES public.product_variations(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  is_returned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reservation_items ENABLE ROW LEVEL SECURITY;

-- Freight configurations table
CREATE TABLE public.freight_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  calculation_rule freight_calculation_rule NOT NULL DEFAULT 'fixed',
  base_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.freight_configs ENABLE ROW LEVEL SECURITY;

-- Sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  freight_config_id UUID REFERENCES public.freight_configs(id) ON DELETE SET NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  freight_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  external_transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- System configuration table
CREATE TABLE public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variations_updated_at BEFORE UPDATE ON public.product_variations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_freight_configs_updated_at BEFORE UPDATE ON public.freight_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check user roles (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all user roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for customers
CREATE POLICY "Authenticated users can view customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for product_variations
CREATE POLICY "Authenticated users can view variations"
  ON public.product_variations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage variations"
  ON public.product_variations FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for reservations
CREATE POLICY "Authenticated users can view reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reservations"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for reservation_items
CREATE POLICY "Authenticated users can view reservation items"
  ON public.reservation_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage reservation items"
  ON public.reservation_items FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for freight_configs
CREATE POLICY "Authenticated users can view freight configs"
  ON public.freight_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage freight configs"
  ON public.freight_configs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sales
CREATE POLICY "Authenticated users can view sales"
  ON public.sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sales"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
  ON public.sales FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for payments
CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for system_config
CREATE POLICY "Authenticated users can view system config"
  ON public.system_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage system config"
  ON public.system_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_product_variations_product_id ON public.product_variations(product_id);
CREATE INDEX idx_product_variations_sku ON public.product_variations(sku);
CREATE INDEX idx_reservations_customer_id ON public.reservations(customer_id);
CREATE INDEX idx_reservations_status ON public.reservations(status);
CREATE INDEX idx_reservation_items_reservation_id ON public.reservation_items(reservation_id);
CREATE INDEX idx_reservation_items_variation_id ON public.reservation_items(variation_id);
CREATE INDEX idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX idx_sales_created_at ON public.sales(created_at);
CREATE INDEX idx_payments_sale_id ON public.payments(sale_id);
CREATE INDEX idx_payments_status ON public.payments(status);