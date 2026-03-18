import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, phone } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let authUserId = existing?.id ?? null;

    if (!authUserId) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createErr) throw createErr;
      authUserId = created.user.id;
    } else {
      // Update password - use updateUserById
      try {
        await supabase.auth.admin.updateUserById(existing!.id, { password });
      } catch (_) { /* ignore if update fails */ }
    }

    // Ensure customer record exists
    const { data: customerRes } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let customerId = customerRes?.id ?? null;

    if (!customerId) {
      const { data: inserted, error: insertErr } = await supabase
        .from("customers")
        .insert({
          full_name: full_name || "Cliente",
          email,
          phone: phone || "00000000000",
          user_type: "client",
          data_consent: true,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      customerId = inserted.id;
    }

    return new Response(
      JSON.stringify({ ok: true, authUserId, customerId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
