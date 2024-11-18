import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format } from 'https://deno.land/x/date_fns@v2.22.1/format/index.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { invoice, timesheetDocuments, selectedTimesheets } = await req.json();

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Generate PDF invoice
    const pdfResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generateInvoicePDF`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoice),
    });

    if (!pdfResponse.ok) {
      throw new Error('Failed to generate PDF');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Prepare email attachments
    const attachments = [
      {
        content: pdfBase64,
        filename: `Invoice-${invoice.invoice_number}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment'
      }
    ];

    // Add timesheet documents to attachments
    if (timesheetDocuments && timesheetDocuments.length > 0) {
      for (let i = 0; i < timesheetDocuments.length; i++) {
        const docResponse = await fetch(timesheetDocuments[i]);
        const docBuffer = await docResponse.arrayBuffer();
        const docBase64 = btoa(String.fromCharCode(...new Uint8Array(docBuffer)));
        
        attachments.push({
          content: docBase64,
          filename: `Timesheet-Document-${i + 1}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        });
      }
    }

    // Send email using SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: invoice.client.email }],
        }],
        from: {
          email: Deno.env.get('SENDGRID_FROM_EMAIL'),
          name: 'Pro Team Workforce Management'
        },
        subject: `Invoice ${invoice.invoice_number} from Pro Team`,
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Invoice from Pro Team</h2>
              <p>Please find attached the invoice and supporting timesheet documents.</p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Due Date:</strong> ${format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>
                <p><strong>Amount Due:</strong> $${invoice.total.toLocaleString()}</p>
              </div>
              <p>Thank you for your business!</p>
            </div>
          `,
        }],
        attachments
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SendGrid API error: ${JSON.stringify(error)}`);
    }

    return new Response(
      JSON.stringify({ message: 'Invoice sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 