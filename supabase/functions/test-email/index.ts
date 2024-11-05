import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting email test...');
    
    // Get and validate email configuration
    const username = Deno.env.get('SMTP_USERNAME');
    const password = Deno.env.get('SMTP_PASSWORD');
    const fromEmail = Deno.env.get('SMTP_FROM_EMAIL');

    if (!username || !password || !fromEmail) {
      throw new Error('Missing email configuration');
    }

    // Get request body
    const { email, subject } = await req.json();
    
    if (!email) {
      throw new Error('Recipient email is required');
    }

    console.log('Email Configuration:', {
      fromEmail,
      toEmail: email,
      hasUsername: !!username,
      hasPassword: !!password,
    });

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username,
          password,
        },
      },
    });

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Test Email</h1>
        <p>This is a test email from your Employee Management System.</p>
        <p>If you're receiving this, your email configuration is working correctly!</p>
        <p>Time sent: ${new Date().toLocaleString()}</p>
      </div>
    `;

    console.log(`Sending test email from: ${fromEmail} to: ${email}`);

    await client.send({
      from: {
        address: fromEmail,
        name: "EMS System",
      },
      to: [{
        address: email,
        name: email.split('@')[0],
      }],
      subject: subject || "EMS Test Email",
      content: "This email requires HTML support",
      html: emailContent,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });

    console.log('Email sent successfully');
    await client.close();

    return new Response(
      JSON.stringify({ 
        message: 'Test email sent successfully',
        details: {
          from: fromEmail,
          to: email,
          subject: subject || "EMS Test Email",
          timestamp: new Date().toISOString(),
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for more information',
        config: {
          hasUsername: !!Deno.env.get('SMTP_USERNAME'),
          hasPassword: !!Deno.env.get('SMTP_PASSWORD'),
          hasFromEmail: !!Deno.env.get('SMTP_FROM_EMAIL'),
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 