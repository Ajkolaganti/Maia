import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { PDFDocument, rgb, StandardFonts } from 'https://cdn.skypack.dev/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      invoice_number,
      clientName,
      clientEmail,
      issue_date,
      due_date,
      items,
      subtotal,
      tax,
      total,
      notes,
      organizationName,
      billingAddress
    } = await req.json();

    // Generate PDF using the same code as generateInvoicePDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    // Embed fonts
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add content to PDF
    let y = height - 50;
    const margin = 50;

    // Add logo and company name
    page.drawText('MIKADO', {
      x: margin,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0.05, 0.65, 0.91),
    });

    // Add invoice details
    y -= 50;
    page.drawText(`Invoice #${invoice_number}`, {
      x: margin,
      y,
      size: 16,
      font: boldFont,
    });

    y -= 30;
    page.drawText(`Date: ${new Date(issue_date).toLocaleDateString()}`, {
      x: margin,
      y,
      size: 12,
      font: regularFont,
    });

    y -= 20;
    page.drawText(`Due Date: ${new Date(due_date).toLocaleDateString()}`, {
      x: margin,
      y,
      size: 12,
      font: regularFont,
    });

    // Add client details
    y -= 40;
    page.drawText('Bill To:', {
      x: margin,
      y,
      size: 12,
      font: boldFont,
    });

    y -= 20;
    page.drawText(clientName, {
      x: margin,
      y,
      size: 12,
      font: regularFont,
    });

    y -= 20;
    page.drawText(clientEmail, {
      x: margin,
      y,
      size: 12,
      font: regularFont,
    });

    if (billingAddress) {
      y -= 20;
      page.drawText(billingAddress, {
        x: margin,
        y,
        size: 12,
        font: regularFont,
      });
    }

    // Add items table
    y -= 40;
    const tableTop = y;
    const tableHeaders = ['Description', 'Hours', 'Rate', 'Amount'];
    const columnWidths = [250, 70, 70, 100];
    let currentX = margin;

    // Draw table headers
    tableHeaders.forEach((header, index) => {
      page.drawText(header, {
        x: currentX,
        y: tableTop,
        size: 12,
        font: boldFont,
      });
      currentX += columnWidths[index];
    });

    // Draw table rows
    y = tableTop - 20;
    items.forEach((item: any) => {
      currentX = margin;
      
      page.drawText(item.description || '', {
        x: currentX,
        y,
        size: 10,
        font: regularFont,
      });
      currentX += columnWidths[0];

      page.drawText(item.hours?.toString() || '0', {
        x: currentX,
        y,
        size: 10,
        font: regularFont,
      });
      currentX += columnWidths[1];

      page.drawText(`$${(item.rate || 0).toFixed(2)}`, {
        x: currentX,
        y,
        size: 10,
        font: regularFont,
      });
      currentX += columnWidths[2];

      page.drawText(`$${(item.amount || 0).toFixed(2)}`, {
        x: currentX,
        y,
        size: 10,
        font: regularFont,
      });

      y -= 20;
    });

    // Add totals
    y -= 20;
    page.drawText(`Subtotal: $${subtotal.toFixed(2)}`, {
      x: width - margin - 150,
      y,
      size: 12,
      font: regularFont,
    });

    y -= 20;
    page.drawText(`Tax: $${tax.toFixed(2)}`, {
      x: width - margin - 150,
      y,
      size: 12,
      font: regularFont,
    });

    y -= 20;
    page.drawText(`Total: $${total.toFixed(2)}`, {
      x: width - margin - 150,
      y,
      size: 12,
      font: boldFont,
    });

    // Add notes if any
    if (notes) {
      y -= 40;
      page.drawText('Notes:', {
        x: margin,
        y,
        size: 12,
        font: boldFont,
      });

      y -= 20;
      page.drawText(notes, {
        x: margin,
        y,
        size: 10,
        font: regularFont,
        maxWidth: width - (2 * margin),
      });
    }

    // Generate PDF bytes and convert to base64
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // Send email using SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: clientEmail, name: clientName }],
        }],
        from: {
          email: Deno.env.get('SENDGRID_FROM_EMAIL'),
          name: organizationName,
        },
        subject: `Invoice ${invoice_number} from ${organizationName}`,
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Invoice from ${organizationName}</h2>
              <p>Dear ${clientName},</p>
              <p>Please find attached the invoice for your reference.</p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Invoice Number:</strong> ${invoice_number}</p>
                <p><strong>Due Date:</strong> ${new Date(due_date).toLocaleDateString()}</p>
                <p><strong>Amount Due:</strong> $${total.toLocaleString()}</p>
              </div>
              <p>Thank you for your business!</p>
              <p>Best regards,<br>${organizationName}</p>
            </div>
          `,
        }],
        attachments: [{
          content: pdfBase64,
          filename: `Invoice-${invoice_number}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SendGrid API error: ${JSON.stringify(error)}`);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Invoice sent successfully',
        pdfBase64 // Return the PDF data for download
      }),
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