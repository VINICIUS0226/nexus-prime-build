-- =====================================================
-- Fix roles for internal users
-- - fernandas@email.com => admin
-- - superadmin@email.com => super_admin
--
-- Objetivo: garantir que esses usuários não sejam
-- tratados como "clientes" no redirecionamento e no portal.
-- =====================================================

DO $$
DECLARE
  fernanda_id uuid;
  superadmin_id uuid;
BEGIN
  SELECT id INTO fernanda_id
  FROM auth.users
  WHERE email = 'fernandas@email.com'
  LIMIT 1;

  IF fernanda_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = fernanda_id;
    -- user_roles.user_id referencia public.profiles(id)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = fernanda_id) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (fernanda_id, 'admin'::user_role);
    END IF;
  END IF;

  SELECT id INTO superadmin_id
  FROM auth.users
  WHERE email = 'superadmin@email.com'
  LIMIT 1;

  IF superadmin_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = superadmin_id;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = superadmin_id) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (superadmin_id, 'super_admin'::user_role);
    END IF;
  END IF;
END
$$;

