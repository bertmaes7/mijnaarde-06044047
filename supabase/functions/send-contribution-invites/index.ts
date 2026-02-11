import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";

async function sendViaMailerSend(
  apiKey: string,
  from: { email: string; name: string },
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const response = await fetch(MAILERSEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: { email: from.email, name: from.name },
      to: [{ email: to }],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`MailerSend API error [${response.status}]: ${errorBody}`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const mailersendApiKey = Deno.env.get("MAILERSEND_API_KEY");
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "bert@mijnaarde.com";
    const fromName = Deno.env.get("SMTP_FROM_NAME") || "Mijn Aarde vzw";

    if (!mailersendApiKey) throw new Error("MAILERSEND_API_KEY ontbreekt");

    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authenticatie vereist" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Ongeldige authenticatie" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin rechten vereist" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { year } = await req.json();
    if (!year) throw new Error("year is verplicht");

    // Get pending contributions with member info
    const { data: contributions, error: contError } = await supabase
      .from("contributions")
      .select("*, member:members(id, first_name, last_name, email)")
      .eq("contribution_year", year)
      .eq("status", "pending");

    if (contError) throw contError;

    if (!contributions || contributions.length === 0) {
      return new Response(JSON.stringify({ error: "Geen openstaande lidgelden gevonden" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get logo
    const { data: logoAsset } = await supabase
      .from("mailing_assets")
      .select("value")
      .eq("type", "logo")
      .maybeSingle();

    const { data: orgName } = await supabase
      .from("mailing_assets")
      .select("value")
      .eq("key", "org_name")
      .maybeSingle();

    const portalUrl = "https://mijnaarde.lovable.app/member";
    const logoUrl = logoAsset?.value || "";
    const orgDisplayName = orgName?.value || "Mijn Aarde vzw";

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < contributions.length; i++) {
      const c = contributions[i];
      const member = c.member as { id: string; first_name: string; last_name: string; email: string | null } | null;
      if (!member?.email) continue;

      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  ${logoUrl ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${logoUrl}" alt="Logo" style="max-height: 60px;" /></div>` : ""}
  <h2 style="color: #2d5016;">Uitnodiging Lidgeld ${year}</h2>
  <p>Beste ${member.first_name},</p>
  <p>We nodigen je uit om je lidgeld voor ${year} te betalen.</p>
  <p><strong>Bedrag:</strong> €${Number(c.amount).toFixed(2)}</p>
  <p>Je kunt eenvoudig online betalen via het ledenportaal:</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${portalUrl}" style="background-color: #2d5016; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Betaal nu</a>
  </div>
  <p>Hartelijk dank voor je steun!</p>
  <p>Met vriendelijke groet,<br/>${orgDisplayName}</p>
</body>
</html>`;

      try {
        await sendViaMailerSend(
          mailersendApiKey,
          { email: fromEmail, name: fromName },
          member.email,
          `Uitnodiging Lidgeld ${year} - ${orgDisplayName}`,
          html,
        );
        successCount++;
        console.log(`Invite sent to ${member.email}`);
      } catch (err) {
        failCount++;
        console.error(`Failed to send to ${member.email}:`, err);
      }
    }

    console.log(`Contribution invites sent: ${successCount} success, ${failCount} failed`);

    return new Response(JSON.stringify({ success: true, sent: successCount, failed: failCount }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    console.error("Error sending contribution invites:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
