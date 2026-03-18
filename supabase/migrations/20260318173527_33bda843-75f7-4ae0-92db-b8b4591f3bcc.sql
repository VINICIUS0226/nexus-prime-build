
CREATE TABLE public.customer_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  filters jsonb DEFAULT '{}',
  valid_from timestamptz,
  valid_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customer catalogs"
  ON public.customer_catalogs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Clients can view their catalogs"
  ON public.customer_catalogs FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT c.id FROM public.customers c WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
