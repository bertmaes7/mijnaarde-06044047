import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendInvoiceRequest {
  invoiceId: string;
  type: 'invoice' | 'reminder';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // SMTP configuration
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
    const smtpFromName = Deno.env.get("SMTP_FROM_NAME") || "Mijn Aarde vzw";

    if (!smtpHost || !smtpUser || !smtpPassword || !smtpFromEmail) {
      throw new Error("SMTP configuratie ontbreekt");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoiceId, type }: SendInvoiceRequest = await req.json();

    if (!invoiceId) {
      throw new Error("Invoice ID is required");
    }

    // Fetch invoice with customer details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        member:members(id, first_name, last_name, email),
        company:companies(id, name, email)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Invoice not found: ${invoiceError?.message}`);
    }

    // Fetch invoice items
    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order", { ascending: true });

    // Get customer email
    let customerEmail: string | null = null;
    let customerName: string = "";

    if (invoice.member) {
      customerEmail = invoice.member.email;
      customerName = `${invoice.member.first_name} ${invoice.member.last_name}`;
    } else if (invoice.company) {
      customerEmail = invoice.company.email;
      customerName = invoice.company.name;
    }

    if (!customerEmail) {
      throw new Error("Customer has no email address");
    }

    // Build invoice items HTML
    const itemsHtml = (items || []).map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">€ ${item.unit_price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.vat_rate}%</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">€ ${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    // Format dates
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Determine subject and intro based on type
    const isReminder = type === 'reminder';
    const reminderNumber = isReminder ? invoice.reminder_count + 1 : 0;
    
    let subject: string;
    let intro: string;
    
    if (isReminder) {
      if (reminderNumber === 1) {
        subject = `Betalingsherinnering: Factuur ${invoice.invoice_number}`;
        intro = `Wij hebben nog geen betaling ontvangen voor onderstaande factuur. Mogen wij u vriendelijk verzoeken het openstaande bedrag over te maken?`;
      } else {
        subject = `${reminderNumber}e herinnering: Factuur ${invoice.invoice_number}`;
        intro = `Dit is de ${reminderNumber}e herinnering voor onderstaande factuur. Het bedrag is nog niet door ons ontvangen. Wij verzoeken u dringend tot betaling over te gaan.`;
      }
    } else {
      subject = `Factuur ${invoice.invoice_number}`;
      intro = `Hierbij ontvangt u factuur ${invoice.invoice_number}. Wij verzoeken u vriendelijk het bedrag binnen de gestelde termijn te voldoen.`;
    }

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${isReminder ? `
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <strong style="color: #dc2626;">⚠️ Betalingsherinnering</strong>
          </div>
        ` : ''}
        
        <h1 style="color: #1a1a1a; margin-bottom: 20px;">Factuur ${invoice.invoice_number}</h1>
        
        <p>Beste ${customerName},</p>
        
        <p>${intro}</p>
        
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr>
              <td><strong>Factuurnummer:</strong></td>
              <td>${invoice.invoice_number}</td>
            </tr>
            <tr>
              <td><strong>Factuurdatum:</strong></td>
              <td>${formatDate(invoice.invoice_date)}</td>
            </tr>
            <tr>
              <td><strong>Vervaldatum:</strong></td>
              <td>${formatDate(invoice.due_date)}</td>
            </tr>
            <tr>
              <td><strong>Omschrijving:</strong></td>
              <td>${invoice.description}</td>
            </tr>
          </table>
        </div>
        
        <h3 style="margin-top: 30px;">Factuurregels</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; text-align: left;">Omschrijving</th>
              <th style="padding: 10px; text-align: right;">Aantal</th>
              <th style="padding: 10px; text-align: right;">Prijs</th>
              <th style="padding: 10px; text-align: right;">BTW</th>
              <th style="padding: 10px; text-align: right;">Totaal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; text-align: right;">
          <table style="margin-left: auto;">
            <tr>
              <td style="padding: 5px 20px;">Subtotaal:</td>
              <td style="padding: 5px 0; text-align: right;">€ ${invoice.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 20px;">BTW:</td>
              <td style="padding: 5px 0; text-align: right;">€ ${invoice.vat_amount.toFixed(2)}</td>
            </tr>
            <tr style="font-weight: bold; font-size: 1.2em;">
              <td style="padding: 10px 20px; border-top: 2px solid #333;">Totaal:</td>
              <td style="padding: 10px 0; border-top: 2px solid #333; text-align: right;">€ ${invoice.total.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <p style="margin-top: 30px;">
          Gelieve het totaalbedrag van <strong>€ ${invoice.total.toFixed(2)}</strong> over te maken vóór <strong>${formatDate(invoice.due_date)}</strong>.
        </p>
        
        <p>Met vriendelijke groeten</p>
        
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          Deze e-mail is automatisch gegenereerd. Heeft u vragen over deze factuur? 
          Neem dan contact met ons op.
        </p>
      </body>
      </html>
    `;

    // Send email via SMTP
    console.log(`Sending ${type} email to ${customerEmail} for invoice ${invoice.invoice_number} via SMTP`);
    
    const smtpClient = new SMTPClient({
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
      await smtpClient.send({
        from: `${smtpFromName} <${smtpFromEmail}>`,
        to: customerEmail,
        subject: subject,
        html: emailHtml,
      });

      console.log("Email sent successfully via SMTP");
    } finally {
      await smtpClient.close();
    }

    // Update invoice status
    const updateData: Record<string, unknown> = {};
    
    if (type === 'invoice') {
      updateData.status = 'sent';
      updateData.sent_at = new Date().toISOString();
    } else {
      updateData.reminder_count = invoice.reminder_count + 1;
      updateData.last_reminder_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", invoiceId);

    if (updateError) {
      console.error("Failed to update invoice:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: type === 'invoice' ? 'Factuur verzonden' : 'Herinnering verzonden'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-invoice:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
