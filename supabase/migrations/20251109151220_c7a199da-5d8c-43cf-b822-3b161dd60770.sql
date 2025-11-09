-- Add 'vet' to app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typcategory = 'E') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'vet', 'user');
  ELSE
    -- Check if 'vet' value exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'vet' AND enumtypid = 'public.app_role'::regtype) THEN
      ALTER TYPE public.app_role ADD VALUE 'vet';
    END IF;
  END IF;
END $$;

-- Update pets table RLS policies to allow vets to manage pets
DROP POLICY IF EXISTS "Admins can insert pets" ON public.pets;
DROP POLICY IF EXISTS "Admins can update pets" ON public.pets;
DROP POLICY IF EXISTS "Admins can delete pets" ON public.pets;

CREATE POLICY "Admins and vets can insert pets" 
ON public.pets 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vet'::app_role));

CREATE POLICY "Admins and vets can update pets" 
ON public.pets 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vet'::app_role));

CREATE POLICY "Admins and vets can delete pets" 
ON public.pets 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'vet'::app_role));