import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface SendInviteRequest {
  memberId: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY ontbreekt");
    }

    // Verify the requesting user is an admin
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

    const { memberId }: SendInviteRequest = await req.json();
    if (!memberId) {
      return new Response(
        JSON.stringify({ error: "Member ID is vereist" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id, first_name, last_name, email, auth_user_id")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: "Lid niet gevonden" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!member.email) {
      return new Response(
        JSON.stringify({ error: "Dit lid heeft geen e-mailadres" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://mijnaarde-chi.vercel.app";
    let authUserId: string | null = member.auth_user_id;

    // If not yet linked, check whether an auth user with this email already exists
    // (e.g. from an earlier donor magic-link login) before creating a new one.
    if (!authUserId) {
      let page = 1;
      const perPage = 1000;
      while (!authUserId) {
        const { data: usersPage, error: pageError } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (pageError) {
          console.error("Error listing users:", pageError);
          break;
        }
        const found = usersPage.users.find(u => u.email?.toLowerCase() === member.email!.toLowerCase());
        if (found) {
          authUserId = found.id;
          await adminClient.from("members").update({ auth_user_id: authUserId }).eq("id", memberId);
          break;
        }
        if (usersPage.users.length < perPage) break;
        page++;
      }
    }

    let actionLink: string | null = null;

    if (authUserId) {
      // Account already exists: send a fresh login link that also lets them (re)set a password
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: member.email,
        options: { redirectTo: `${siteUrl}/auth` },
      });
      if (linkError) throw linkError;
      actionLink = linkData?.properties?.action_link ?? null;
    } else {
      // Brand new account: invite link creates the auth user and lets them choose a password
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "invite",
        email: member.email,
        options: { redirectTo: `${siteUrl}/auth` },
      });
      if (linkError) throw linkError;
      actionLink = linkData?.properties?.action_link ?? null;
      if (linkData?.user?.id) {
        authUserId = linkData.user.id;
        await adminClient.from("members").update({ auth_user_id: authUserId }).eq("id", memberId);
      }
    }

    if (!actionLink) {
      throw new Error("Kon geen uitnodigingslink genereren");
    }

    // Force the change-password screen once they land on /auth with a session
    await adminClient.from("members").update({ password_change_required: true }).eq("id", memberId);

    // Fetch branding assets
    const { data: assets } = await adminClient
      .from("mailing_assets")
      .select("key, value")
      .in("key", ["logo_url", "org_name", "org_website"]);

    const assetMap = new Map(assets?.map((a: any) => [a.key, a.value]) || []);
    const logoUrl = assetMap.get("logo_url") || "";
    const orgName = assetMap.get("org_name") || "MIJN AARDE vzw";
    const website = assetMap.get("org_website") || "www.mijnaarde.com";

    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "info@mijnaarde.com";
    const fromName = Deno.env.get("SMTP_FROM_NAME") || orgName;

    const firstName = member.first_name || "";
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
                Je hebt toegang tot het ledenportaal
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 40px 24px;">
              <p style="margin: 0 0 16px 0; line-height: 1.6; color: #333;">
                ${greeting}
              </p>
              <p style="margin: 0 0 16px 0; line-height: 1.6; color: #333;">
                Je hebt nu toegang tot het ledenportaal van ${orgName}. Klik op de onderstaande knop om in te loggen en je eigen wachtwoord te kiezen.
              </p>
              <p style="margin: 0 0 16px 0; line-height: 1.6; color: #333;">
                Deze link is een beperkte tijd geldig. Is de link verlopen? Vraag dan gewoon een nieuwe inloglink aan via de inlogpagina.
              </p>
            </td>
          </tr>

          <!-- Activate Button -->
          <tr>
            <td align="center" style="padding: 0 40px 24px;">
              <a href="${actionLink}" style="display: inline-block; background-color: #2d5016; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                Account activeren
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #888;">
                Heb je dit niet verwacht? Dan kun je deze e-mail veilig negeren.
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

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: member.email }],
        subject: `Uitnodiging: activeer je account bij ${orgName}`,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Brevo error [${response.status}]: ${errorBody}`);
    }

    console.log(`Invite email sent to ${member.email}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-member-invite:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
