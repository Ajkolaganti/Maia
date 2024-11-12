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
      organizationName
    } = await req.json();

    // Create a new PDF document
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
    page.drawText('WORKING40', {
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
      
      page.drawText(item.description, {
        x: currentX,
        y,
        size: 10,
        font: regularFont,
      });
      currentX += columnWidths[0];

      page.drawText(item.hours.toString(), {
        x: currentX,
        y,
        size: 10,
        font: regularFont,
      });
      currentX += columnWidths[1];

      page.drawText(`$${item.rate.toFixed(2)}`, {
        x: currentX,
        y,
        size: 10,
        font: regularFont,
      });
      currentX += columnWidths[2];

      page.drawText(`$${item.amount.toFixed(2)}`, {
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

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    return new Response(
      pdfBytes,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Invoice-${invoice_number}.pdf"`,
          'Content-Length': pdfBytes.length.toString(),
        },
      }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});