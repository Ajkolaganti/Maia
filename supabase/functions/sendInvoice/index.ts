import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
      throw new Error('SendGrid configuration missing');
    }

    console.log('Starting invoice email process...');
    const {
      invoiceNumber,
      clientName,
      clientEmail,
      issueDate,
      dueDate,
      items,
      subtotal,
      tax,
      total,
      notes,
      organizationName,
      billingAddress
    } = await req.json();

    // Generate PDF first
    const pdfResponse = await fetch(`${req.url.replace('/sendInvoice', '/generateInvoicePDF')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoiceNumber,
        clientName,
        clientEmail,
        issueDate,
        dueDate,
        items,
        subtotal,
        tax,
        total,
        notes,
        organizationName
      }),
    });

    if (!pdfResponse.ok) {
      throw new Error('Failed to generate PDF');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Create items table HTML for email
    const itemsTableHtml = items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description || 'No description'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.hours}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.rate}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    // Email template
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2>Invoice from ${organizationName}</h2>
        <p>Dear ${clientName},</p>
        <p>Please find attached the invoice for your reference. Here's a summary of the invoice:</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Issue Date:</strong> ${new Date(issueDate).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
          <p><strong>Amount Due:</strong> $${total.toLocaleString()}</p>
        </div>

        <p>Thank you for your business!</p>
        <p>Best regards,<br>${organizationName}</p>
      </div>
    `;

    console.log('Sending email via SendGrid...');

    // Send email using SendGrid with PDF attachment
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: clientEmail, name: clientName }],
        }],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: organizationName,
        },
        subject: `Invoice ${invoiceNumber} from ${organizationName}`,
        content: [{
          type: 'text/html',
          value: emailContent,
        }],
        attachments: [{
          content: pdfBase64,
          filename: `Invoice-${invoiceNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('SendGrid API error:', error);
      throw new Error(`SendGrid API error: ${JSON.stringify(error)}`);
    }

    console.log('Email sent successfully');

    return new Response(
      JSON.stringify({ message: 'Invoice sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred',
        details: 'Check the function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Changed to 200 to avoid Supabase error
      }
    );
  }
}); 