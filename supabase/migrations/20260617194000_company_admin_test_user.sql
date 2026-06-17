-- Promove o usuario de avaliacao da empresa para administrador de loja.
-- O usuario de Auth precisa existir antes desta migration ser aplicada.

DO $$
DECLARE
  admin_user_id uuid;
  default_store_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'empresa.teste.nexus@gmail.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Usuario empresa.teste.nexus@gmail.com ainda nao existe no Auth.';
    RETURN;
  END IF;

  SELECT id INTO default_store_id
  FROM public.stores
  WHERE is_active = true
  ORDER BY created_at
  LIMIT 1;

  UPDATE public.profiles
  SET
    full_name = COALESCE(NULLIF(full_name, ''), 'Empresa Teste Nexus'),
    store_id = COALESCE(store_id, default_store_id),
    must_change_password = false
  WHERE id = admin_user_id;

  DELETE FROM public.user_roles
  WHERE user_id = admin_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin'::public.user_role);
END
$$;
