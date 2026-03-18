import { createClient } from "@supabase/supabase-js";

// Ajuste via variáveis de ambiente (recomendado) ou use os defaults.
// SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY
//
// SEED_CLIENT_EMAIL
// SEED_CLIENT_PASSWORD
// SEED_CLIENT_FULL_NAME
// SEED_CLIENT_PHONE
// SEED_CLIENT_CATALOG_NAME

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de rodar.");
  process.exit(1);
}

const EMAIL = (process.env.SEED_CLIENT_EMAIL ?? "cliente.teste@pqueninos.com").trim();
const PASSWORD = process.env.SEED_CLIENT_PASSWORD ?? "Teste@12345";
const FULL_NAME = (process.env.SEED_CLIENT_FULL_NAME ?? "Cliente Teste PQueninos").trim();
const PHONE = (process.env.SEED_CLIENT_PHONE ?? "11900000000").trim();
const CATALOG_NAME = (process.env.SEED_CLIENT_CATALOG_NAME ?? "Catálogo Cliente Teste").trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // 1) Garantir usuário na Auth (Supabase Authentication)
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
  }

  // 2) Garantir registro em `customers` (mapeado por email)
  const { data: customerRes, error: customerResErr } = await supabase
    .from("customers")
    .select("id")
    .eq("email", EMAIL)
    .maybeSingle();

  if (customerResErr) throw customerResErr;

  let customerId = customerRes?.id ?? null;

  const customerPayload = {
    full_name: FULL_NAME,
    email: EMAIL,
    phone: PHONE,
    user_type: "client",
    data_consent: true,
  };

  if (!customerId) {
    const { error: insertCustomerErr } = await supabase.from("customers").insert(customerPayload);
    if (insertCustomerErr) throw insertCustomerErr;

    const { data: customerRes2, error: customerResErr2 } = await supabase
      .from("customers")
      .select("id")
      .eq("email", EMAIL)
      .maybeSingle();

    if (customerResErr2) throw customerResErr2;
    customerId = customerRes2?.id ?? null;
  } else {
    const { error: updateCustomerErr } = await supabase
      .from("customers")
      .update(customerPayload)
      .eq("id", customerId);
    if (updateCustomerErr) throw updateCustomerErr;
  }

  if (!customerId) {
    throw new Error("Não foi possível obter o id do cliente após inserir/atualizar.");
  }

  // 3) Garantir pelo menos 1 catálogo ativo em `customer_catalogs` para esse cliente
  const { data: catalogRes, error: catalogResErr } = await supabase
    .from("customer_catalogs")
    .select("id")
    .eq("customer_id", customerId)
    .eq("name", CATALOG_NAME)
    .maybeSingle();

  if (catalogResErr) throw catalogResErr;

  if (!catalogRes?.id) {
    const { error: insertCatalogErr } = await supabase.from("customer_catalogs").insert({
      name: CATALOG_NAME,
      customer_id: customerId,
      filters: {},
      is_active: true,
    });

    if (insertCatalogErr) throw insertCatalogErr;
  }

  console.log(
    JSON.stringify(
      {
        email: EMAIL,
        password: PASSWORD,
        authUserId,
        customerId,
        catalogName: CATALOG_NAME,
        ok: true,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("Erro ao seedar usuário do portal do cliente:", err?.message ?? err);
  process.exit(1);
});

