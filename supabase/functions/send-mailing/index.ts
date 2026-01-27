import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Allowed origins for CORS - restrict to production and preview domains
const ALLOWED_ORIGINS = [
  "https://mijnaarde.lovable.app",
  "https://id-preview--720a5d5a-c520-4ef0-9d57-c342d034b40f.lovable.app",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

interface SendMailingRequest {
  mailingId: string;
}

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface MailingTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
}

interface Mailing {
  id: string;
  title: string;
  template_id: string | null;
  selection_type: "all" | "manual";
  selected_member_ids: string[] | null;
  scheduled_at: string | null;
  status: string;
}

interface MailingAsset {
  key: string;
  value: string;
}

function replacePlaceholders(content: string, member: Member, assets: MailingAsset[]): string {
  let result = content;
  
  // Replace member placeholders
  result = result.replace(/\{\{voornaam\}\}/gi, member.first_name || "");
  result = result.replace(/\{\{achternaam\}\}/gi, member.last_name || "");
  result = result.replace(/\{\{email\}\}/gi, member.email || "");
  result = result.replace(/\{\{volledige_naam\}\}/gi, `${member.first_name} ${member.last_name}`.trim());
  
  // Replace asset placeholders
  for (const asset of assets) {
    const regex = new RegExp(`\\{\\{${asset.key}\\}\\}`, "gi");
    result = result.replace(regex, asset.value);
  }
  
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send mailing function called");
  
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization header is present
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authenticatie vereist" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get SMTP settings from environment
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
    const smtpFromName = Deno.env.get("SMTP_FROM_NAME") || "Mailing";

    if (!smtpHost || !smtpUser || !smtpPassword || !smtpFromEmail) {
      console.error("Missing SMTP configuration");
      throw new Error("SMTP configuratie ontbreekt. Controleer de instellingen.");
    }

    const { mailingId }: SendMailingRequest = await req.json();

    if (!mailingId) {
      throw new Error("mailingId is verplicht");
    }

    console.log("Processing mailing:", mailingId);

    // Fetch the mailing
    const { data: mailing, error: mailingError } = await supabase
      .from("mailings")
      .select("*")
      .eq("id", mailingId)
      .single();

    if (mailingError || !mailing) {
      console.error("Mailing fetch error:", mailingError);
      throw new Error("Mailing niet gevonden");
    }

    const mailingData = mailing as Mailing;

    // Fetch the template
    if (!mailingData.template_id) {
      throw new Error("Geen template gekoppeld aan deze mailing");
    }

    const { data: template, error: templateError } = await supabase
      .from("mailing_templates")
      .select("*")
      .eq("id", mailingData.template_id)
      .single();

    if (templateError || !template) {
      console.error("Template fetch error:", templateError);
      throw new Error("Template niet gevonden");
    }

    const templateData = template as MailingTemplate;

    // Fetch assets for placeholder replacement
    const { data: assets } = await supabase
      .from("mailing_assets")
      .select("key, value");

    const assetsData = (assets || []) as MailingAsset[];

    // Fetch recipients based on selection type
    let membersQuery = supabase
      .from("members")
      .select("id, email, first_name, last_name")
      .eq("is_active", true)
      .not("email", "is", null);

    if (mailingData.selection_type === "manual" && mailingData.selected_member_ids?.length) {
      membersQuery = membersQuery.in("id", mailingData.selected_member_ids);
    }

    const { data: members, error: membersError } = await membersQuery;

    if (membersError) {
      console.error("Members fetch error:", membersError);
      throw new Error("Fout bij ophalen leden");
    }

    const membersList = (members || []) as Member[];

    if (membersList.length === 0) {
      throw new Error("Geen ontvangers gevonden");
    }

    console.log(`Sending to ${membersList.length} recipients`);

    // Initialize SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPassword,
        },
      },
    });

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Send emails to each recipient
    for (const member of membersList) {
      if (!member.email) continue;

      try {
        const personalizedSubject = replacePlaceholders(templateData.subject, member, assetsData);
        const personalizedHtml = replacePlaceholders(templateData.html_content, member, assetsData);
        const personalizedText = templateData.text_content 
          ? replacePlaceholders(templateData.text_content, member, assetsData)
          : undefined;

        await client.send({
          from: `${smtpFromName} <${smtpFromEmail}>`,
          to: member.email,
          subject: personalizedSubject,
          content: personalizedText || "",
          html: personalizedHtml,
        });

        successCount++;
        console.log(`Email sent to ${member.email}`);
      } catch (emailError: unknown) {
        failCount++;
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        errors.push(`${member.email}: ${errorMessage}`);
        console.error(`Failed to send to ${member.email}:`, emailError);
      }
    }

    await client.close();

    // Update mailing status
    const newStatus = failCount === membersList.length ? "failed" : "sent";
    await supabase
      .from("mailings")
      .update({
        status: newStatus,
        sent_at: new Date().toISOString(),
      })
      .eq("id", mailingId);

    console.log(`Mailing complete. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Onbekende fout";
    console.error("Error in send-mailing function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);