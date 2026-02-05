import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Create new member
    const { data: newMember, error: insertError } = await supabase
      .from("members")
      .insert({
        email: normalizedEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        is_active: true,
        is_donor: false,
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
