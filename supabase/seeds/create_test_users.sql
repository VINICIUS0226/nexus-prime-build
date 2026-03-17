-- Seed para criar usuários de teste (admin e cliente) no banco de dados.
-- ATENÇÃO:
-- - Este script NÃO cria usuários no Auth do Supabase automaticamente.
-- - Primeiro, crie os usuários em Authentication → Users e anote os IDs (UUID).
-- - Depois, substitua abaixo pelos UUIDs corretos e execute este SQL no projeto certo.

-- 1) SUBSTITUA pelos IDs dos usuários criados no painel Auth
--    Exemplo: 'f9d6c5b4-1234-5678-9abc-def012345678'

-- ID do usuário ADMIN (super_admin ou admin)
-- declare isso mentalmente; apenas substitua diretamente nas instruções abaixo.

-- ID do usuário CLIENTE
-- idem acima.

-------------------------------------------------------------------------------
-- 2) USER ROLES: vincular usuário admin à role administrativa
-------------------------------------------------------------------------------

-- Exemplo para um usuário super_admin:
-- SUBSTITUA SEU_ADMIN_USER_ID pelo UUID real do usuário admin criado no Auth.

insert into user_roles (user_id, role)
values ('SEU_ADMIN_USER_ID', 'super_admin')
on conflict (user_id) do update
set role = excluded.role;

-------------------------------------------------------------------------------
-- 3) CLIENTE: registro na tabela customers para o cliente de teste
-------------------------------------------------------------------------------

-- SUBSTITUA SEU_CLIENT_USER_ID se você tiver uma coluna de ligação com o Auth
-- (por exemplo auth_user_id). Se não tiver essa coluna, remova a linha
-- correspondente no insert.

insert into customers (
  full_name,
  email,
  phone,
  user_type,
  data_consent
  -- , auth_user_id -- descomente e ajuste se existir na sua tabela
)
values (
  'Cliente Teste PQueninos',
  'cliente.teste@pqueninos.com',
  '11900000000',
  'client',
  true
  -- , 'SEU_CLIENT_USER_ID'
)
on conflict (email) do update
set
  full_name = excluded.full_name,
  phone = excluded.phone,
  user_type = excluded.user_type,
  data_consent = excluded.data_consent;

-------------------------------------------------------------------------------
-- Como usar:
-- 1) No painel do Supabase, abra SQL Editor.
-- 2) Cole este arquivo, substituindo:
--      - SEU_ADMIN_USER_ID pelo UUID do usuário admin em Authentication → Users.
--      - (Opcional) SEU_CLIENT_USER_ID se você tiver coluna de ligação em customers.
-- 3) Execute o script.
-- 4) Depois de executar:
--      - Ao logar com o usuário admin, ele será redirecionado para /dashboard.
--      - Ao logar com o usuário cliente, ele será tratado como cliente e irá para /client/catalogs.
-------------------------------------------------------------------------------

