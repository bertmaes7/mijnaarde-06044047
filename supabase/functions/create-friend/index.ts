import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName } = await req.json();

    if (!email || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "Email, firstName and lastName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedEmail = email.toLowerCase().trim();

    // Check if member already exists
    const { data: existingMember } = await supabase
      .from("members")
      .select("id, first_name, last_name")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingMember) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          alreadyExists: true,
          memberId: existingMember.id,
          message: "Member already exists" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new member with only is_active and receives_mail enabled
    const { data: newMember, error: insertError } = await supabase
      .from("members")
      .insert({
        email: normalizedEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        is_active: true,
        receives_mail: true,
        is_donor: false,
        is_active_member: false,
        is_board_member: false,
        is_council_member: false,
        is_ambassador: false,
        is_admin: false,
        member_since: new Date().toISOString().split('T')[0],
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating member:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create member" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send thank you email in the background
    try {
      await sendThankYouEmail(supabase, normalizedEmail, firstName.trim());
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error("Failed to send thank you email:", emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alreadyExists: false,
        memberId: newMember.id,
        message: "Member created successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-friend function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendThankYouEmail(supabase: any, email: string, firstName: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured, skipping thank you email");
    return;
  }

  // Fetch Visie-Kort text and logo from mailing_assets
  const { data: assets } = await supabase
    .from("mailing_assets")
    .select("key, value")
    .in("key", ["text_visie_kort", "logo_url", "org_name", "org_website"]);

  const assetMap = new Map(assets?.map((a: any) => [a.key, a.value]) || []);
  const visieText = assetMap.get("text_visie_kort") || "";
  const logoUrl = assetMap.get("logo_url") || "";
  const orgName = assetMap.get("org_name") || "MIJN AARDE vzw";
  const website = assetMap.get("org_website") || "www.mijnaarde.com";

  // Convert visie text to HTML paragraphs
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
          
          <!-- Logo -->
          ${logoUrl ? `
          <tr>
            <td align="center" style="padding: 32px 40px 16px;">
              <img src="${logoUrl}" alt="${orgName}" width="120" style="display: block;" />
            </td>
          </tr>
          ` : ""}
          
          <!-- Thank you -->
          <tr>
            <td style="padding: 16px 40px 8px;">
              <h1 style="margin: 0; font-size: 24px; color: #2d5016; font-weight: normal;">
                Bedankt, ${firstName}!
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 8px 40px 24px;">
              <p style="margin: 0 0 16px 0; line-height: 1.6; color: #333;">
                Welkom als vriend van ${orgName}. We zijn blij dat je ons steunt. 
                Hieronder lees je meer over onze visie.
              </p>
            </td>
          </tr>

          <!-- Divider -->
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

          <!-- Divider -->
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

  const resend = new Resend(resendApiKey);

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [email],
    subject: `Welkom bij ${orgName}`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  console.log(`Thank you email sent to ${email}`);
}
