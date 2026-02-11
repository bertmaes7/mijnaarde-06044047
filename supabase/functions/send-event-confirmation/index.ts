import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mailersendApiKey = Deno.env.get("MAILERSEND_API_KEY");
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "bert@mijnaarde.com";
    const fromName = Deno.env.get("SMTP_FROM_NAME") || "Mijn Aarde vzw";

    if (!mailersendApiKey) {
      throw new Error("MAILERSEND_API_KEY ontbreekt");
    }

    const { registrationId } = await req.json();
    if (!registrationId) throw new Error("registrationId is verplicht");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch registration with event and member details
    const { data: registration, error: regError } = await supabase
      .from("event_registrations")
      .select(`
        *,
        event:events(title, event_date, location, description),
        member:members(first_name, last_name, email)
      `)
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      throw new Error("Inschrijving niet gevonden");
    }

    const member = registration.member;
    const event = registration.event;

    if (!member?.email) {
      console.log("Lid heeft geen e-mailadres, geen bevestiging verstuurd");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Format event date
    const eventDate = new Date(event.event_date);
    const dateStr = eventDate.toLocaleDateString("nl-BE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = eventDate.toLocaleTimeString("nl-BE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Fetch logo
    const { data: logoAsset } = await supabase
      .from("mailing_assets")
      .select("value")
      .eq("type", "logo")
      .maybeSingle();

    const logoUrl = logoAsset?.value || "";
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="Mijn Aarde" style="max-width: 150px; height: auto; margin-bottom: 20px;" />`
      : "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${logoHtml}
        <h1 style="color: #2d5016; font-size: 24px; margin-bottom: 8px;">Inschrijving bevestigd!</h1>
        <p style="color: #666; margin-bottom: 24px;">Beste ${member.first_name},</p>
        <p>Je inschrijving voor het volgende event is bevestigd:</p>
        <div style="background: #f5f5f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h2 style="color: #2d5016; margin: 0 0 12px 0;">${event.title}</h2>
          <p style="margin: 4px 0;"><strong>Datum:</strong> ${dateStr} om ${timeStr}</p>
          ${event.location ? `<p style="margin: 4px 0;"><strong>Locatie:</strong> ${event.location}</p>` : ""}
        </div>
        ${event.description ? `<p style="color: #666;">${event.description}</p>` : ""}
        <p style="margin-top: 24px;">We kijken ernaar uit je te zien!</p>
        <p style="color: #666;">Met vriendelijke groet,<br/>${fromName}</p>
      </div>
    `;

    // Send via MailerSend
    const response = await fetch(MAILERSEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mailersendApiKey}`,
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: member.email, name: `${member.first_name} ${member.last_name}` }],
        subject: `Bevestiging: ${event.title}`,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`MailerSend error [${response.status}]: ${errorBody}`);
    }

    console.log(`Event confirmation sent to ${member.email} for event ${event.title}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    console.error("Error sending event confirmation:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
