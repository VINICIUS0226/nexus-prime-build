import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const email = "superadmin@email.com";
    const temporaryPassword = "SuperAdmin@123"; // Senha temporária

    // Check if super admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingSuperAdmin = existingUsers?.users?.find((u) => u.email === email);

    if (existingSuperAdmin) {
      // Check if they already have super_admin role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", existingSuperAdmin.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Super Admin já existe no sistema",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // User exists but doesn't have super_admin role, add it
      await supabase
        .from("user_roles")
        .insert({ user_id: existingSuperAdmin.id, role: "super_admin" });

      // Mark as needing password change
      await supabase
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", existingSuperAdmin.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Role de Super Admin adicionada ao usuário existente",
          email,
          temporaryPassword: "Use sua senha atual",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create new super admin user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Super Administrador",
      },
    });

    if (createError) throw createError;

    // Add super_admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "super_admin" });

    if (roleError) throw roleError;

    // Mark as needing password change
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("Warning: Could not set must_change_password:", profileError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Super Admin criado com sucesso!",
        email,
        temporaryPassword,
        note: "A senha deverá ser alterada no primeiro login",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating super admin:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
