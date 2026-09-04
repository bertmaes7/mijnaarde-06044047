import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const BATCH_SIZE = 290;

async function sendViaBrevo(
  apiKey: string,
  from: { email: string; name: string },
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  const body: Record<string, unknown> = {
    sender: { name: from.name, email: from.email },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };
  if (text) body.textContent = text;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Brevo error [${response.status}]:`, errorBody);
    throw new Error(`Brevo [${response.status}]: ${errorBody}`);
  }
}

function replacePlaceholders(content: string, member: { first_name: string; last_name: string; email: string }, assets: { key: string; value: string }[]): string {
  let result = content
    .replace(/\{\{voornaam\}\}/gi, member.first_name || "")
    .replace(/\{\{achternaam\}\}/gi, member.last_name || "")
    .replace(/\{\{email\}\}/gi, member.email || "")
    .replace(/\{\{naam\}\}/gi, `${member.first_name} ${member.last_name}`.trim())
    .replace(/\{\{volledige_naam\}\}/gi, `${member.first_name} ${member.last_name}`.trim());

  const logoAsset = assets.find(a => a.key === "logo" || a.key === "logo_url");
  const logoUrl = logoAsset?.value || "";
  result = result.replace(/\{\{logo\}\}/gi, logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 200px; height: auto;" />` : "");

  for (const asset of assets) {
    result = result.replace(new RegExp(`\\{\\{${asset.key}\\}\\}`, "gi"), asset.value);
  }
  return result;
}

function addUnsubscribeFooter(html: string, url: string): string {
  const footer = `<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e0e0e0;text-align:center;font-size:12px;color:#666">
    <p style="margin:0">Wil je deze e-mails niet meer ontvangen? <a href="${url}" style="color:#666;text-decoration:underline">Schrijf je hier uit</a></p>
  </div>`;
  return html.includes("</body>") ? html.replace("</body>", `${footer}</body>`) : html + footer;
}

serve(async (req) => {
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth via CRON_SECRET header
  const cronSecret = Deno.env.get("CRON_SECRET");
  const incomingSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || incomingSecret !== cronSecret) {
    console.error("Unauthorized cron call");
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const brevoApiKey = Deno.env.get("BREVO_API_KEY")!;
  const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "bert@mijnaarde.com";
  const fromName = Deno.env.get("SMTP_FROM_NAME") || "Mijn Aarde vzw";
  const siteUrl = Deno.env.get("SITE_URL") || "https://mijnaarde-chi.vercel.app";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Haal alle gepauzeerde mailings op
  const { data: pausedMailings, error } = await supabase
    .from("mailings")
    .select("*")
    .eq("status", "paused");

  if (error) {
    console.error("Error fetching paused mailings:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  if (!pausedMailings || pausedMailings.length === 0) {
    console.log("No paused mailings found.");
    return new Response(JSON.stringify({ message: "Geen gepauzeerde mailings." }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  console.log(`Found ${pausedMailings.length} paused mailing(s).`);
  const results = [];

  for (const mailing of pausedMailings) {
    const mailingId = mailing.id;
    console.log(`Resuming mailing ${mailingId}`);

    try {
      // Template ophalen
      const { data: template } = await supabase.from("mailing_templates").select("*").eq("id", mailing.template_id).single();
      if (!template) { console.error(`Template not found for mailing ${mailingId}`); continue; }

      // Assets ophalen
      const { data: assets } = await supabase.from("mailing_assets").select("key, value");

      // Leden ophalen
      let membersQuery = supabase.from("members").select("id, email, first_name, last_name").eq("is_active", true).not("email", "is", null);
      if (mailing.selection_type === "manual" && mailing.selected_member_ids?.length) {
        membersQuery = membersQuery.in("id", mailing.selected_member_ids);
      }
      const { data: members } = await membersQuery;
      if (!members || members.length === 0) { console.warn(`No members for mailing ${mailingId}`); continue; }

      const startOffset = mailing.sent_member_count ?? 0;
      const batch = members.slice(startOffset);

      let successCount = 0;
      let dailyLimitHit = false;

      for (let i = 0; i < batch.length; i++) {
        if (successCount >= BATCH_SIZE) break;
        const member = batch[i];
        if (!member.email) continue;

        if (i > 0) await new Promise(r => setTimeout(r, 600));

        try {
          const subject = replacePlaceholders(template.subject, member, assets || []);
          let html = replacePlaceholders(template.html_content, member, assets || []);
          const unsubToken = btoa(`${member.id}:${Date.now()}`);
          html = addUnsubscribeFooter(html, `${siteUrl}/unsubscribe?id=${member.id}&token=${encodeURIComponent(unsubToken)}`);
          const text = template.text_content ? replacePlaceholders(template.text_content, member, assets || []) : undefined;

          await sendViaBrevo(brevoApiKey, { email: fromEmail, name: fromName }, member.email, subject, html, text);
          successCount++;
          console.log(`Sent to ${member.email}`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const isDailyLimit = msg.toLowerCase().includes("daily") || msg.toLowerCase().includes("quota");
          if (isDailyLimit) { dailyLimitHit = true; break; }
          console.error(`Failed to send to ${member.email}:`, msg);
        }

        if (dailyLimitHit) break;
      }

      const totalSent = startOffset + successCount;
      const allDone = !dailyLimitHit && totalSent >= members.length;
      // Bug: this used to fall back to "sent" whenever dailyLimitHit was
      // false, even if the batch cap (BATCH_SIZE) was hit without Brevo
      // ever returning an explicit daily-limit error — silently marking a
      // mailing "sent" while most recipients never got it, with no cron
      // left to pick up the rest (resume-mailings is the cron). Anything
      // short of allDone must be "paused" so the next cron run continues it.
      const newStatus = allDone ? "sent" : "paused";

      await supabase.from("mailings").update({
        status: newStatus,
        sent_member_count: totalSent,
        sent_at: allDone ? new Date().toISOString() : null,
      }).eq("id", mailingId);

      results.push({ mailingId, sent: successCount, totalSent, status: newStatus });
      console.log(`Mailing ${mailingId}: sent ${successCount}, total ${totalSent}/${members.length}, status ${newStatus}`);
    } catch (err) {
      console.error(`Error processing mailing ${mailingId}:`, err);
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
