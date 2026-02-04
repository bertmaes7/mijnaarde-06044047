import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_MAILINGS_PER_HOUR: 10,
  MAX_RECIPIENTS_PER_MAILING: 1000,
  COOLDOWN_SECONDS: 60,
};

const rateLimitStore = new Map<string, { count: number; lastReset: number; lastSend: number }>();

function checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  let userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now - userLimit.lastReset > hourInMs) {
    userLimit = { count: 0, lastReset: now, lastSend: 0 };
    rateLimitStore.set(userId, userLimit);
  }
  
  if (userLimit.lastSend > 0) {
    const secondsSinceLastSend = (now - userLimit.lastSend) / 1000;
    if (secondsSinceLastSend < RATE_LIMIT.COOLDOWN_SECONDS) {
      const waitTime = Math.ceil(RATE_LIMIT.COOLDOWN_SECONDS - secondsSinceLastSend);
      return { 
        allowed: false, 
        reason: `Wacht ${waitTime} seconden voordat je opnieuw een mailing verstuurt` 
      };
    }
  }
  
  if (userLimit.count >= RATE_LIMIT.MAX_MAILINGS_PER_HOUR) {
    return { 
      allowed: false, 
      reason: `Maximum van ${RATE_LIMIT.MAX_MAILINGS_PER_HOUR} mailings per uur bereikt. Probeer later opnieuw.` 
    };
  }
  
  return { allowed: true };
}

function recordMailingSent(userId: string): void {
  const userLimit = rateLimitStore.get(userId);
  if (userLimit) {
    userLimit.count++;
    userLimit.lastSend = Date.now();
  }
}

function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
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

function generateUnsubscribeToken(memberId: string): string {
  const data = `${memberId}:${Date.now()}`;
  return btoa(data);
}

function generateUnsubscribeUrl(memberId: string, baseUrl: string): string {
  const token = generateUnsubscribeToken(memberId);
  return `${baseUrl}/unsubscribe?id=${memberId}&token=${encodeURIComponent(token)}`;
}

function addUnsubscribeFooter(htmlContent: string, unsubscribeUrl: string): string {
  const footer = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666666;">
      <p style="margin: 0;">
        Wil je deze e-mails niet meer ontvangen? 
        <a href="${unsubscribeUrl}" style="color: #666666; text-decoration: underline;">Schrijf je hier uit</a>
      </p>
    </div>
  `;
  
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${footer}</body>`);
  }
  return htmlContent + footer;
}

function addUnsubscribeFooterText(textContent: string, unsubscribeUrl: string): string {
  const footer = `\n\n---\nWil je deze e-mails niet meer ontvangen? Ga naar: ${unsubscribeUrl}`;
  return textContent + footer;
}

function replacePlaceholders(content: string, member: Member, assets: MailingAsset[]): string {
  let result = content;
  
  result = result.replace(/\{\{voornaam\}\}/gi, member.first_name || "");
  result = result.replace(/\{\{achternaam\}\}/gi, member.last_name || "");
  result = result.replace(/\{\{email\}\}/gi, member.email || "");
  result = result.replace(/\{\{naam\}\}/gi, `${member.first_name} ${member.last_name}`.trim());
  result = result.replace(/\{\{volledige_naam\}\}/gi, `${member.first_name} ${member.last_name}`.trim());
  
  const logoAsset = assets.find(a => a.key === "logo" || a.key === "logo_url");
  const logoUrl = logoAsset?.value || "";
  
  if (logoUrl) {
    result = result.replace(/\{\{logo\}\}/gi, `<img src="${logoUrl}" alt="Logo" style="max-width: 200px; height: auto;" />`);
  } else {
    result = result.replace(/\{\{logo\}\}/gi, "");
  }
  
  for (const asset of assets) {
    const regex = new RegExp(`\\{\\{${asset.key}\\}\\}`, "gi");
    result = result.replace(regex, asset.value);
  }
  
  return result;
}

// Send email using Microsoft Graph API
async function sendEmailViaGraph(
  accessToken: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<void> {
  const message = {
    message: {
      subject: subject,
      body: {
        contentType: "HTML",
        content: htmlContent,
      },
      toRecipients: [
        {
          emailAddress: {
            address: toEmail,
          },
        },
      ],
    },
    saveToSentItems: true,
  };

  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph API error: ${response.status} - ${errorText}`);
  }
}

// Send email using SMTP via external service (for now using fetch to an SMTP relay)
async function sendEmailViaSmtpRelay(
  host: string,
  port: number,
  user: string,
  password: string,
  fromEmail: string,
  fromName: string,
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<void> {
  // For Microsoft 365, we'll use the Graph API approach or a relay service
  // Since direct SMTP with STARTTLS doesn't work in Deno edge runtime,
  // we'll throw an error suggesting to use an email service
  
  throw new Error(
    "SMTP met STARTTLS wordt niet ondersteund in deze omgeving. " +
    "Gebruik Resend of schakel terug naar Gmail SMTP (poort 465 met TLS)."
  );
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send mailing function called - method:", req.method);
  
  const origin = req.headers.get("origin");
  console.log("Request origin:", origin);
  const corsHeaders = getCorsHeaders();
  
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing POST request");
    
    const authHeader = req.headers.get("authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Authenticatie vereist" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Getting environment variables");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Env vars present - URL:", !!supabaseUrl, "Anon:", !!supabaseAnonKey, "Service:", !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuratie ontbreekt" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Creating auth client");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    console.log("Verifying JWT");
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);

    if (claimsError || !claimsData?.user) {
      console.error("Invalid JWT:", claimsError);
      return new Response(
        JSON.stringify({ error: "Ongeldige authenticatie" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.user.id;
    console.log("Authenticated user:", userId);

    console.log("Creating service role client");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking admin role");
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("User lacks admin role:", userId, roleError);
      return new Response(
        JSON.stringify({ error: "Admin rechten vereist om mailings te versturen" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Admin role verified for user:", userId);

    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      console.warn(`Rate limit exceeded for user ${userId}: ${rateLimitCheck.reason}`);
      return new Response(
        JSON.stringify({ error: rateLimitCheck.reason }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get SMTP settings
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
    const smtpFromName = Deno.env.get("SMTP_FROM_NAME") || "Mijn Aarde";

    if (!smtpUser || !smtpPassword || !smtpFromEmail) {
      console.error("Missing SMTP configuration");
      throw new Error("SMTP configuratie ontbreekt. Controleer de instellingen.");
    }

    // Check if we're using Microsoft 365 (which requires STARTTLS and doesn't work)
    if (smtpHost.includes("office365") || smtpHost.includes("outlook")) {
      console.error("Microsoft 365 SMTP not supported - STARTTLS required");
      return new Response(
        JSON.stringify({ 
          error: "Microsoft 365 SMTP werkt niet in deze omgeving (STARTTLS wordt niet ondersteund). " +
                 "Oplossingen: 1) Gebruik Gmail SMTP met poort 465, of 2) Stel Resend in voor betrouwbare e-mailverzending."
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { mailingId } = await req.json();

    if (!mailingId) {
      throw new Error("mailingId is verplicht");
    }

    console.log("Processing mailing:", mailingId);

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

    if (mailingData.status === "sent") {
      console.warn(`Mailing ${mailingId} has already been sent`);
      return new Response(
        JSON.stringify({ error: "Deze mailing is al verzonden" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    const { data: assets } = await supabase
      .from("mailing_assets")
      .select("key, value");

    const assetsData = (assets || []) as MailingAsset[];

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

    if (membersList.length > RATE_LIMIT.MAX_RECIPIENTS_PER_MAILING) {
      console.warn(`Too many recipients: ${membersList.length} > ${RATE_LIMIT.MAX_RECIPIENTS_PER_MAILING}`);
      return new Response(
        JSON.stringify({ 
          error: `Te veel ontvangers (${membersList.length}). Maximum is ${RATE_LIMIT.MAX_RECIPIENTS_PER_MAILING}. Splits de mailing op in kleinere batches.` 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending to ${membersList.length} recipients`);

    const requestOrigin = req.headers.get("origin") || "https://mijnaarde.lovable.app";
    console.log(`Using origin for unsubscribe links: ${requestOrigin}`);
    console.log(`Connecting to SMTP server: ${smtpHost}:${smtpPort} (TLS: ${smtpPort === 465})`);

    // Import denomailer dynamically for Gmail SMTP (port 465 with implicit TLS)
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
    
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: {
          username: smtpUser,
          password: smtpPassword,
        },
      },
    });
    console.log("SMTP client initialized, attempting to send...");

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const member of membersList) {
      if (!member.email) continue;

      try {
        const personalizedSubject = replacePlaceholders(templateData.subject, member, assetsData);
        let personalizedHtml = replacePlaceholders(templateData.html_content, member, assetsData);
        let personalizedText = templateData.text_content 
          ? replacePlaceholders(templateData.text_content, member, assetsData)
          : undefined;

        const unsubscribeUrl = generateUnsubscribeUrl(member.id, requestOrigin);
        personalizedHtml = addUnsubscribeFooter(personalizedHtml, unsubscribeUrl);
        if (personalizedText) {
          personalizedText = addUnsubscribeFooterText(personalizedText, unsubscribeUrl);
        }

        // Normalize line endings to CRLF for SMTP compliance
        personalizedHtml = personalizedHtml.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
        if (personalizedText) {
          personalizedText = personalizedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
        }

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

    const newStatus = failCount === membersList.length ? "failed" : "sent";
    await supabase
      .from("mailings")
      .update({
        status: newStatus,
        sent_at: new Date().toISOString(),
      })
      .eq("id", mailingId);

    recordMailingSent(userId);

    console.log(`Mailing complete by user ${userId}. Success: ${successCount}, Failed: ${failCount}`);

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
