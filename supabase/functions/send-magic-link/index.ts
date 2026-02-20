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
    const { email, redirectTo } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const mailersendApiKey = Deno.env.get("MAILERSEND_API_KEY");
    if (!mailersendApiKey) {
      console.error("MAILERSEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the redirect URL - use the passed redirectTo, or fall back to the site URL env var
    const siteUrl = Deno.env.get("SITE_URL") || "https://mijnaarde.lovable.app";
    const finalRedirectTo = redirectTo || `${siteUrl}/auth`;

    // Generate magic link via admin API (does NOT send an email)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.trim().toLowerCase(),
      options: {
        redirectTo: finalRedirectTo,
      },
    });

    if (linkError) {
      console.error("Error generating magic link:", linkError);
      // Pass through rate limit errors
      if (linkError.message?.includes("rate limit") || linkError.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limit", message: "Even geduld, probeer het over 60 seconden opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to generate magic link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The generated link contains the full URL with token
    const magicLinkUrl = linkData?.properties?.action_link;
    if (!magicLinkUrl) {
      console.error("No action_link in response:", linkData);
      return new Response(
        JSON.stringify({ error: "Failed to generate magic link URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch member name for personalization
    const { data: member } = await supabase
      .from("members")
      .select("first_name")
      .ilike("email", email.trim())
      .maybeSingle();

    const firstName = member?.first_name || "";

    // Fetch branding assets
    const { data: assets } = await supabase
      .from("mailing_assets")
      .select("key, value")
      .in("key", ["logo_url", "org_name", "org_website"]);

    const assetMap = new Map(assets?.map((a: any) => [a.key, a.value]) || []);
    const logoUrl = assetMap.get("logo_url") || "";
    const orgName = assetMap.get("org_name") || "MIJN AARDE vzw";
    const website = assetMap.get("org_website") || "www.mijnaarde.com";

    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "info@mijnaarde.com";
    const fromName = Deno.env.get("SMTP_FROM_NAME") || orgName;

    const greeting = firstName ? `Hallo ${firstName},` : "Hallo,";

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
                Inloggen
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 8px 40px 24px;">
              <p style="margin: 0 0 16px 0; line-height: 1.6; color: #333;">
                ${greeting}
              </p>
              <p style="margin: 0 0 16px 0; line-height: 1.6; color: #333;">
                Klik op de onderstaande knop om in te loggen op het ledenportaal van ${orgName}. 
                Deze link is 1 uur geldig.
              </p>
            </td>
          </tr>

          <!-- Magic Link Button -->
          <tr>
            <td align="center" style="padding: 0 40px 24px;">
              <a href="${magicLinkUrl}" style="display: inline-block; background-color: #2d5016; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                Inloggen
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #888;">
                Als je deze aanvraag niet hebt gedaan, kun je deze e-mail veilig negeren.
              </p>
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
        to: [{ email: email.trim().toLowerCase() }],
        subject: `Inloggen bij ${orgName}`,
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

    console.log(`Branded magic link email sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-magic-link:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
