-- Promove o usuario de avaliacao da empresa para administrador de uma loja propria.
-- O usuario de Auth precisa existir antes desta migration ser aplicada.

DO $$
DECLARE
  admin_user_id uuid;
  test_store_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'empresa.teste.nexus@gmail.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Usuario empresa.teste.nexus@gmail.com ainda nao existe no Auth.';
    RETURN;
  END IF;

  SELECT id INTO test_store_id
  FROM public.stores
  WHERE email = 'empresa.teste.nexus@gmail.com'
  LIMIT 1;

  IF test_store_id IS NULL THEN
    INSERT INTO public.stores (
      name,
      cnpj,
      email,
      phone,
      address,
      city,
      state,
      zip_code,
      is_active
    )
    VALUES (
      'Empresa Teste Nexus',
      '00.000.000/0001-91',
      'empresa.teste.nexus@gmail.com',
      '(00) 00000-0000',
      'Endereco de teste',
      'Cidade Teste',
      'RS',
      '00000-000',
      true
    )
    RETURNING id INTO test_store_id;
  ELSE
    UPDATE public.stores
    SET
      name = 'Empresa Teste Nexus',
      cnpj = '00.000.000/0001-91',
      phone = COALESCE(phone, '(00) 00000-0000'),
      address = COALESCE(address, 'Endereco de teste'),
      city = COALESCE(city, 'Cidade Teste'),
      state = COALESCE(state, 'RS'),
      zip_code = COALESCE(zip_code, '00000-000'),
      is_active = true,
      updated_at = now()
    WHERE id = test_store_id;
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(NULLIF(full_name, ''), 'Empresa Teste Nexus'),
    store_id = test_store_id,
    must_change_password = false
  WHERE id = admin_user_id;

  DELETE FROM public.user_roles
  WHERE user_id = admin_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin'::public.user_role);

  INSERT INTO public.system_config (store_id, config_key, config_value)
  VALUES
    (test_store_id, 'store_name', 'Empresa Teste Nexus'),
    (test_store_id, 'store_email', 'empresa.teste.nexus@gmail.com'),
    (test_store_id, 'store_phone', '(00) 00000-0000'),
    (test_store_id, 'store_address', 'Endereco de teste - Cidade Teste/RS'),
    (test_store_id, 'store_cnpj', '00.000.000/0001-91')
  ON CONFLICT (store_id, config_key)
  DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at = now();
END
$$;
