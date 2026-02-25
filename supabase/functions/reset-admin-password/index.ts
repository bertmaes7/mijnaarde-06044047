import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://mijnaarde.lovable.app",
    "https://id-preview--720a5d5a-c520-4ef0-9d57-c342d034b40f.lovable.app",
  ];
  const siteUrl = Deno.env.get("SITE_URL");
  if (siteUrl) allowedOrigins.push(siteUrl);
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";

interface ResetPasswordRequest {
  memberId: string;
}

function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendPasswordEmail(
  email: string,
  firstName: string,
  tempPassword: string
): Promise<void> {
  const mailersendApiKey = Deno.env.get("MAILERSEND_API_KEY");
  const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "bert@mijnaarde.com";
  const fromName = Deno.env.get("SMTP_FROM_NAME") || "Mijn Aarde vzw";

  if (!mailersendApiKey) {
    console.error("MAILERSEND_API_KEY not configured, skipping email");
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Wachtwoord gereset</h2>
      <p>Beste ${firstName},</p>
      <p>Uw wachtwoord voor het beheerdersportaal van Mijn Aarde vzw is gereset.</p>
      <p>Uw nieuwe tijdelijke inloggegevens zijn:</p>
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;"><strong>E-mail:</strong> ${email}</p>
        <p style="margin: 8px 0 0 0;"><strong>Tijdelijk wachtwoord:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
      </div>
      <p><strong>Belangrijk:</strong> Bij uw volgende inlog wordt u gevraagd om een nieuw wachtwoord in te stellen.</p>
      <p>Met vriendelijke groeten,<br>Mijn Aarde vzw</p>
    </div>
  `;

  const response = await fetch(MAILERSEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mailersendApiKey}`,
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: [{ email }],
      subject: "Uw wachtwoord is gereset - Mijn Aarde vzw",
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`MailerSend error [${response.status}]: ${errorBody}`);
  } else {
    console.log("Password reset email sent successfully to:", email);
  }
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Geen autorisatie" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Ongeldige sessie" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Geen beheerdersrechten" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { memberId }: ResetPasswordRequest = await req.json();
    if (!memberId) {
      return new Response(
        JSON.stringify({ error: "Member ID is vereist" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("*")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: "Lid niet gevonden" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!member.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Dit lid heeft geen account" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (member.auth_user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Je kunt je eigen wachtwoord niet via deze functie resetten. Gebruik de 'Wachtwoord wijzigen' optie." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const tempPassword = generateTemporaryPassword();

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
      member.auth_user_id,
      { password: tempPassword }
    );

    if (updateAuthError) {
      console.error("Error updating auth user:", updateAuthError);
      return new Response(
        JSON.stringify({ error: `Fout bij resetten wachtwoord: ${updateAuthError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: updateMemberError } = await adminClient
      .from("members")
      .update({ password_change_required: true })
      .eq("id", memberId);

    if (updateMemberError) {
      console.error("Error updating member:", updateMemberError);
    }

    if (member.email) {
      await sendPasswordEmail(member.email, member.first_name, tempPassword);
    }

    console.log(`Password reset for ${member.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Wachtwoord gereset. Het nieuwe wachtwoord is per e-mail verstuurd.",
        email: member.email,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in reset-admin-password:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
