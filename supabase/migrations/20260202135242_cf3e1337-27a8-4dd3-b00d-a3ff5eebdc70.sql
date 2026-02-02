-- Create enum for customer/user types
CREATE TYPE public.customer_type AS ENUM ('client', 'seller', 'manager');

-- Add user_type column to customers table
ALTER TABLE public.customers 
ADD COLUMN user_type public.customer_type NOT NULL DEFAULT 'client';

-- Add index for better filtering performance
CREATE INDEX idx_customers_user_type ON public.customers(user_type);
CREATE INDEX idx_customers_data_consent ON public.customers(data_consent);