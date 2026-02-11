import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for admin check and mutations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify calling user is admin
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Alleen beheerders kunnen rollen wijzigen" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { memberId, shouldBeAdmin } = await req.json();

    if (!memberId || typeof shouldBeAdmin !== "boolean") {
      return new Response(
        JSON.stringify({ error: "Ongeldige parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the target member
    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id, auth_user_id, email")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: "Lid niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-demotion
    if (member.auth_user_id === user.id && !shouldBeAdmin) {
      return new Response(
        JSON.stringify({ error: "Je kunt je eigen beheerder-rol niet wijzigen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update is_admin on members table
    const { error: updateError } = await adminClient
      .from("members")
      .update({ is_admin: shouldBeAdmin })
      .eq("id", memberId);

    if (updateError) throw updateError;

    // Update user_roles if member has an auth account
    if (member.auth_user_id) {
      if (shouldBeAdmin) {
        await adminClient
          .from("user_roles")
          .upsert(
            { user_id: member.auth_user_id, role: "admin" },
            { onConflict: "user_id,role" }
          );
      } else {
        await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", member.auth_user_id)
          .eq("role", "admin");
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error toggling admin role:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
