-- Update the handle_new_user function to support role selection from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  -- Get role from metadata, default to 'user' if not provided or invalid
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'user'::app_role
  );
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If role casting fails, default to 'user'
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$function$;