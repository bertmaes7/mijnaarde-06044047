import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberId } = await req.json();

    if (!memberId) {
      return new Response(
        JSON.stringify({ error: "memberId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch member data
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, first_name, last_name, email")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      console.error("Member not found:", memberError);
      return new Response(
        JSON.stringify({ error: "Member not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!member.email) {
      return new Response(
        JSON.stringify({ error: "Member has no email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mailersendApiKey = Deno.env.get("MAILERSEND_API_KEY");
    if (!mailersendApiKey) {
      console.error("MAILERSEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch branding assets
    const { data: assets } = await supabase
      .from("mailing_assets")
      .select("key, value")
      .in("key", ["text_visie_kort", "logo_url", "org_name", "org_website"]);

    const assetMap = new Map(assets?.map((a: any) => [a.key, a.value]) || []);
    const visieText = assetMap.get("text_visie_kort") || "";
    const logoUrl = assetMap.get("logo_url") || "";
    const orgName = assetMap.get("org_name") || "MIJN AARDE vzw";
    const website = assetMap.get("org_website") || "www.mijnaarde.com";

    const loginUrl = "https://mijnaarde.lovable.app/auth";

    const visieHtml = visieText
      .split("\n")
      .filter((line: string) => line.trim())
      .map((line: string) => `<p style="margin: 0 0 12px 0; line-height: 1.6; color: #333;">${line}</p>`)
      .join("");

    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "info@mijnaarde.com";
    const fromName = Deno.env.get("SMTP_FROM_NAME") || orgName;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f0; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          
          ${logoUrl ? `
          <tr>
            <td align="center" style="padding: 32px 40px 16px;">
              <img src="${logoUrl}" alt="${orgName}" width="120" style="display: block;" />
            </td>
          </tr>
          ` : ""}
          
          <tr>
            <td style="padding: 16px 40px 8px;">
              <h1 style="margin: 0; font-size: 24px; color: #2d5016; font-weight: normal;">
                Welkom, ${member.first_name}!
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 8px 40px 24px;">
              <p style="margin: 0 0 16px 0; line-height: 1.6; color: #333;">
                Goed nieuws! Je bent nu actief lid van ${orgName}. 
                Via ons ledenportaal kun je je gegevens beheren en op de hoogte blijven.
              </p>
              <p style="margin: 0 0 16px 0; line-height: 1.6; color: #333;">
                Je kunt inloggen met een <strong>magic link</strong> — vul je e-mailadres in en je ontvangt een link waarmee je direct kunt inloggen, zonder wachtwoord.
              </p>
            </td>
          </tr>

          <!-- Login Button -->
          <tr>
            <td align="center" style="padding: 0 40px 24px;">
              <a href="${loginUrl}" style="display: inline-block; background-color: #2d5016; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                Ga naar het ledenportaal
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #e0e0d8; margin: 0;" />
            </td>
          </tr>

          <!-- Visie tekst -->
          <tr>
            <td style="padding: 24px 40px;">
              ${visieHtml}
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #e0e0d8; margin: 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #888;">
                ${orgName} · <a href="https://${website}" style="color: #2d5016;">${website}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const response = await fetch(MAILERSEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mailersendApiKey}`,
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: member.email }],
        subject: `Welkom als actief lid van ${orgName}`,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`MailerSend error [${response.status}]: ${errorBody}`);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Onboarding email sent to ${member.email}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-onboarding-email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
