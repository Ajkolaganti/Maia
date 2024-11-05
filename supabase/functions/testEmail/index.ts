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
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: Deno.env.get('SMTP_USERNAME') || '',
          password: Deno.env.get('SMTP_PASSWORD') || '',
        },
      },
    });

    const fromEmail = Deno.env.get('SMTP_FROM_EMAIL') || '';
    const testEmail = 'your-test-email@example.com'; // Replace with your email

    await client.send({
      from: fromEmail,
      to: [{ address: testEmail }],
      subject: 'Test Email',
      html: '<h1>Test Email</h1><p>This is a test email from EMS.</p>',
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

    await client.close();

    return new Response(
      JSON.stringify({ message: 'Test email sent successfully' }),
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