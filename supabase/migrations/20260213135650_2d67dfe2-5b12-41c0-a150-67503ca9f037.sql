-- Add price columns to product_variations
ALTER TABLE public.product_variations 
ADD COLUMN selling_price numeric NULL,
ADD COLUMN cost_price numeric NULL;

-- Populate with existing product prices as default
UPDATE public.product_variations pv
SET selling_price = p.selling_price,
    cost_price = p.cost_price
FROM public.products p
WHERE pv.product_id = p.id;