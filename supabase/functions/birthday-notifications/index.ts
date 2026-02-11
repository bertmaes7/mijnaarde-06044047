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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the number of days to look ahead (default 7)
    const { daysAhead = 7 } = await req.json().catch(() => ({ daysAhead: 7 }));

    // Fetch all active members with date_of_birth
    const { data: members, error } = await supabase
      .from("members")
      .select("id, first_name, last_name, email, date_of_birth")
      .eq("is_active", true)
      .not("date_of_birth", "is", null);

    if (error) throw error;

    const today = new Date();
    const upcomingBirthdays: Array<{
      first_name: string;
      last_name: string;
      email: string | null;
      date_of_birth: string;
      days_until: number;
      age: number;
    }> = [];

    for (const member of members || []) {
      if (!member.date_of_birth) continue;

      const dob = new Date(member.date_of_birth);
      const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

      // If birthday has passed this year, check next year
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }

      const diffTime = thisYearBirthday.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= daysAhead) {
        const age = thisYearBirthday.getFullYear() - dob.getFullYear();
        upcomingBirthdays.push({
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          date_of_birth: member.date_of_birth,
          days_until: diffDays,
          age,
        });
      }
    }

    if (upcomingBirthdays.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Geen aankomende verjaardagen", count: 0 }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Sort by days_until
    upcomingBirthdays.sort((a, b) => a.days_until - b.days_until);

    // Send only to designated recipient
    const adminMembers = [{ email: "grace@mijnaarde.com" }];

    // Build email content
    const birthdayRows = upcomingBirthdays.map(b => {
      const dob = new Date(b.date_of_birth);
      const dateStr = `${dob.getDate()}/${dob.getMonth() + 1}`;
      const dayLabel = b.days_until === 0 ? "🎂 Vandaag!" : b.days_until === 1 ? "Morgen" : `Over ${b.days_until} dagen`;
      return `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${b.first_name} ${b.last_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${dateStr}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${b.age} jaar</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${dayLabel}</td>
      </tr>`;
    }).join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2d5016; font-size: 20px;">🎂 Aankomende verjaardagen</h1>
        <p style="color: #666;">De volgende leden zijn de komende ${daysAhead} dagen jarig:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f5f5f0;">
              <th style="padding: 8px; text-align: left;">Naam</th>
              <th style="padding: 8px; text-align: left;">Datum</th>
              <th style="padding: 8px; text-align: left;">Leeftijd</th>
              <th style="padding: 8px; text-align: left;">Wanneer</th>
            </tr>
          </thead>
          <tbody>${birthdayRows}</tbody>
        </table>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          Dit bericht is automatisch verstuurd door ${fromName}.
        </p>
      </div>
    `;

    // Send to all admins
    for (const admin of adminMembers) {
      if (!admin.email) continue;
      
      await fetch(MAILERSEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mailersendApiKey}`,
        },
        body: JSON.stringify({
          from: { email: fromEmail, name: fromName },
          to: [{ email: admin.email }],
          subject: `🎂 ${upcomingBirthdays.length} aankomende verjaardag${upcomingBirthdays.length > 1 ? "en" : ""}`,
          html,
        }),
      });
    }

    console.log(`Birthday notification sent to ${adminMembers.length} admins for ${upcomingBirthdays.length} birthdays`);

    return new Response(JSON.stringify({
      success: true,
      count: upcomingBirthdays.length,
      adminsNotified: adminMembers.length,
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    console.error("Error in birthday notifications:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
