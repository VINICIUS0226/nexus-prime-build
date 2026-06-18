import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de rodar.");
  process.exit(1);
}

const EMAIL = (process.env.SEED_COMPANY_EMAIL ?? "empresa.teste.nexus@gmail.com").trim();
const PASSWORD = (process.env.SEED_COMPANY_PASSWORD ?? "EmpresaTeste123").trim();
const FULL_NAME = (process.env.SEED_COMPANY_FULL_NAME ?? "Empresa Teste Nexus").trim();
const STORE_NAME = (process.env.SEED_COMPANY_STORE_NAME ?? "Empresa Teste Nexus").trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function upsertSystemConfig(storeId, values) {
  const rows = Object.entries(values).map(([config_key, config_value]) => ({
    store_id: storeId,
    config_key,
    config_value,
  }));

  const { error } = await supabase
    .from("system_config")
    .upsert(rows, { onConflict: "store_id,config_key" });

  if (error) throw error;
}

async function main() {
  const { data: existingUsers, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
  let authUserId = existingUser?.id ?? null;

  if (!authUserId) {
    const { data: createdUser, error: createUserErr } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    });

    if (createUserErr) throw createUserErr;
    authUserId = createdUser.user.id;
  } else {
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    });

    if (updateErr) {
      console.warn("Aviso: nao foi possivel atualizar dados do usuario existente:", updateErr.message);
    }
  }

  const { data: existingStore, error: storeFindErr } = await supabase
    .from("stores")
    .select("id")
    .eq("email", EMAIL)
    .maybeSingle();

  if (storeFindErr) throw storeFindErr;

  let storeId = existingStore?.id ?? null;

  const storePayload = {
    name: STORE_NAME,
    cnpj: "00.000.000/0001-91",
    email: EMAIL,
    phone: "(00) 00000-0000",
    address: "Endereco de teste",
    city: "Cidade Teste",
    state: "RS",
    zip_code: "00000-000",
    is_active: true,
  };

  if (!storeId) {
    const { data: insertedStore, error: insertStoreErr } = await supabase
      .from("stores")
      .insert(storePayload)
      .select("id")
      .single();

    if (insertStoreErr) throw insertStoreErr;
    storeId = insertedStore.id;
  } else {
    const { error: updateStoreErr } = await supabase
      .from("stores")
      .update(storePayload)
      .eq("id", storeId);

    if (updateStoreErr) throw updateStoreErr;
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      full_name: FULL_NAME,
      store_id: storeId,
      must_change_password: false,
    })
    .eq("id", authUserId);

  if (profileErr) throw profileErr;

  const { error: deleteRolesErr } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", authUserId);

  if (deleteRolesErr) throw deleteRolesErr;

  const { error: insertRoleErr } = await supabase
    .from("user_roles")
    .insert({ user_id: authUserId, role: "admin" });

  if (insertRoleErr) throw insertRoleErr;

  await upsertSystemConfig(storeId, {
    store_name: STORE_NAME,
    store_email: EMAIL,
    store_phone: "(00) 00000-0000",
    store_address: "Endereco de teste - Cidade Teste/RS",
    store_cnpj: "00.000.000/0001-91",
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: EMAIL,
        password: PASSWORD,
        authUserId,
        storeId,
        role: "admin",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("Erro ao seedar usuario administrador da empresa:", err?.message ?? err);
  process.exit(1);
});
