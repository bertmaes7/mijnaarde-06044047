import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateAdminRequest {
  memberId: string;
}

function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendPasswordEmail(
  email: string,
  firstName: string,
  tempPassword: string
): Promise<void> {
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
  const smtpFromName = Deno.env.get("SMTP_FROM_NAME") || "Mijn Aarde vzw";

  if (!smtpHost || !smtpUser || !smtpPassword || !smtpFromEmail) {
    console.error("SMTP configuration incomplete, skipping email");
    return;
  }

  // Use Deno's SMTP client
  const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
  
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

  try {
    await client.send({
      from: `${smtpFromName} <${smtpFromEmail}>`,
      to: email,
      subject: "Uw beheerdersaccount voor Mijn Aarde vzw",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Welkom als beheerder!</h2>
          <p>Beste ${firstName},</p>
          <p>Er is een beheerdersaccount voor u aangemaakt bij Mijn Aarde vzw.</p>
          <p>Uw inloggegevens zijn:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>E-mail:</strong> ${email}</p>
            <p style="margin: 8px 0 0 0;"><strong>Tijdelijk wachtwoord:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
          </div>
          <p><strong>Belangrijk:</strong> Bij uw eerste inlog wordt u gevraagd om een nieuw wachtwoord in te stellen.</p>
          <p>Met vriendelijke groeten,<br>Mijn Aarde vzw</p>
        </div>
      `,
    });
    console.log("Password email sent successfully to:", email);
  } catch (error) {
    console.error("Failed to send email:", error);
  } finally {
    await client.close();
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the requesting user is an admin
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

    // Create client with user's token to verify they're admin
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

    // Check if user is admin
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

    // Parse request
    const { memberId }: CreateAdminRequest = await req.json();
    if (!memberId) {
      return new Response(
        JSON.stringify({ error: "Member ID is vereist" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get member details
    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("*")
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
        JSON.stringify({ error: "Lid heeft geen e-mailadres" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if auth user already exists on member record
    if (member.auth_user_id) {
      // User already has account, just update the admin flag
      const { error: updateError } = await adminClient
        .from("members")
        .update({ is_admin: true })
        .eq("id", memberId);

      if (updateError) throw updateError;

      // Add admin role if not exists
      await adminClient
        .from("user_roles")
        .upsert({ user_id: member.auth_user_id, role: "admin" }, { onConflict: "user_id,role" });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Beheerdersrechten toegekend aan bestaand account",
          accountCreated: false 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate temporary password for new account
    const tempPassword = generateTemporaryPassword();

    // Try to create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: member.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: member.first_name,
        last_name: member.last_name,
      },
    });

    // If user already exists, find and link them
    if (authError && authError.message.includes("already been registered")) {
      console.log("User already exists, searching for existing auth user...");
      
      // Search through all pages to find the user
      let existingAuthUser = null;
      let page = 1;
      const perPage = 1000;
      
      while (!existingAuthUser) {
        const { data: usersPage, error: pageError } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });
        
        if (pageError) {
          console.error("Error listing users:", pageError);
          break;
        }
        
        console.log(`Searching page ${page}, found ${usersPage.users.length} users`);
        
        const found = usersPage.users.find(u => u.email?.toLowerCase() === member.email.toLowerCase());
        if (found) {
          existingAuthUser = found;
          console.log(`Found existing user: ${found.id}`);
          break;
        }
        
        // If we got fewer users than perPage, we've reached the end
        if (usersPage.users.length < perPage) {
          break;
        }
        
        page++;
      }

      if (existingAuthUser) {
        // Check if this auth user is already linked to another member
        const { data: existingMemberLink } = await adminClient
          .from("members")
          .select("id, first_name, last_name")
          .eq("auth_user_id", existingAuthUser.id)
          .single();

        if (existingMemberLink && existingMemberLink.id !== memberId) {
          // Auth user is linked to a different member
          console.log(`Auth user already linked to member: ${existingMemberLink.first_name} ${existingMemberLink.last_name}`);
          return new Response(
            JSON.stringify({ 
              error: `Dit e-mailadres is al gekoppeld aan een ander lid (${existingMemberLink.first_name} ${existingMemberLink.last_name}). Pas het e-mailadres aan of verwijder het dubbele lid.` 
            }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Link existing auth user to this member
        const { error: linkError } = await adminClient
          .from("members")
          .update({
            auth_user_id: existingAuthUser.id,
            is_admin: true,
          })
          .eq("id", memberId);

        if (linkError) {
          console.error("Error linking member:", linkError);
          // Check if it's a duplicate key error
          if (linkError.code === "23505") {
            return new Response(
              JSON.stringify({ error: "Dit e-mailadres is al gekoppeld aan een ander lid. Controleer op dubbele leden." }),
              { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          throw linkError;
        }

        // Add roles
        await adminClient.from("user_roles").upsert(
          [
            { user_id: existingAuthUser.id, role: "admin" },
            { user_id: existingAuthUser.id, role: "member" },
          ],
          { onConflict: "user_id,role" }
        );

        return new Response(
          JSON.stringify({
            success: true,
            message: "Bestaand account gekoppeld en beheerdersrechten toegekend",
            accountCreated: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        // Couldn't find the user even though it exists - this shouldn't happen
        console.error("User exists but couldn't be found in search");
        return new Response(
          JSON.stringify({ error: "Account bestaat maar kon niet worden gekoppeld. Neem contact op met support." }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    if (authError) {
      console.error("Error creating auth user:", authError);
      return new Response(
        JSON.stringify({ error: `Fout bij aanmaken account: ${authError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Link member to auth user and set flags
    const { error: linkError } = await adminClient
      .from("members")
      .update({
        auth_user_id: authData.user.id,
        is_admin: true,
        password_change_required: true,
      })
      .eq("id", memberId);

    if (linkError) {
      console.error("Error linking member:", linkError);
      // Try to clean up the created user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw linkError;
    }

    // Add admin and member roles
    await adminClient.from("user_roles").insert([
      { user_id: authData.user.id, role: "admin" },
      { user_id: authData.user.id, role: "member" },
    ]);

    // Send email with temporary password
    await sendPasswordEmail(member.email, member.first_name, tempPassword);

    console.log(`Admin account created for ${member.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Beheerdersaccount aangemaakt",
        accountCreated: true,
        tempPassword: tempPassword, // Show to admin
        email: member.email,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in create-admin-account:", error);
    
    // Handle Supabase/Postgres errors
    const pgError = error as { code?: string; message?: string; details?: string };
    if (pgError.code === "23505") {
      return new Response(
        JSON.stringify({ error: "Dit e-mailadres is al gekoppeld aan een ander lid. Controleer op dubbele leden." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const message = error instanceof Error ? error.message : (pgError.message || "Onbekende fout");
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
