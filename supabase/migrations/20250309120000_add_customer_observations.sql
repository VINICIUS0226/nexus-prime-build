-- Add notes and trust_level columns to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS trust_level VARCHAR(10) CHECK (trust_level IN ('low', 'medium', 'high'));
