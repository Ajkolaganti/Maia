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
    } = await req.json();

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add page
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    // Starting position
    let y = height - 50;
    const margin = 50;

    // Header
    page.drawText(organizationName, {
      x: margin,
      y: height - 50,
      size: 24,
      font: boldFont,
    });

    // Invoice number
    page.drawText(`Invoice #${invoiceNumber}`, {
      x: width - 200,
      y: height - 50,
      size: 12,
      font: regularFont,
    });

    // Dates
    y -= 80;
    page.drawText(`Issue Date: ${new Date(issueDate).toLocaleDateString()}`, {
      x: margin,
      y,
      size: 12,
      font: regularFont,
    });

    y -= 20;
    page.drawText(`Due Date: ${new Date(dueDate).toLocaleDateString()}`, {
      x: margin,
      y,
      size: 12,
      font: regularFont,
    });

    // Client info
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

    // Items table header
    y -= 40;
    const columns = ['Description', 'Hours', 'Rate', 'Amount'];
    const columnWidths = [300, 60, 80, 80];
    let x = margin;

    columns.forEach((header, i) => {
      page.drawText(header, {
        x,
        y,
        size: 12,
        font: boldFont,
      });
      x += columnWidths[i];
    });

    // Draw items
    y -= 20;
    items.forEach((item) => {
      x = margin;
      
      // Description
      page.drawText(item.description || '', {
        x,
        y,
        size: 10,
        font: regularFont,
        maxWidth: columnWidths[0] - 10,
      });
      x += columnWidths[0];

      // Hours
      page.drawText(item.hours.toString(), {
        x,
        y,
        size: 10,
        font: regularFont,
      });
      x += columnWidths[1];

      // Rate
      page.drawText(`$${item.rate}`, {
        x,
        y,
        size: 10,
        font: regularFont,
      });
      x += columnWidths[2];

      // Amount
      page.drawText(`$${item.amount.toLocaleString()}`, {
        x,
        y,
        size: 10,
        font: regularFont,
      });

      y -= 20;
    });

    // Totals
    y -= 20;
    const totalsX = width - 200;

    // Subtotal
    page.drawText('Subtotal:', {
      x: totalsX,
      y,
      size: 12,
      font: boldFont,
    });
    page.drawText(`$${subtotal.toLocaleString()}`, {
      x: width - margin - 50,
      y,
      size: 12,
      font: regularFont,
    });

    // Tax
    y -= 20;
    page.drawText('Tax:', {
      x: totalsX,
      y,
      size: 12,
      font: boldFont,
    });
    page.drawText(`$${tax.toLocaleString()}`, {
      x: width - margin - 50,
      y,
      size: 12,
      font: regularFont,
    });

    // Total
    y -= 20;
    page.drawText('Total:', {
      x: totalsX,
      y,
      size: 12,
      font: boldFont,
    });
    page.drawText(`$${total.toLocaleString()}`, {
      x: width - margin - 50,
      y,
      size: 12,
      font: boldFont,
    });

    // Notes
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

    // Return PDF with proper headers
    return new Response(
      new Uint8Array(pdfBytes),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Invoice-${invoiceNumber}.pdf"`,
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