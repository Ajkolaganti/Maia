import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, firstName, lastName, organizationName } = await req.json()

    // Initialize SMTP client
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: Deno.env.get('SMTP_HOSTNAME') || '',
      port: 587,
      username: Deno.env.get('SMTP_USERNAME') || '',
      password: Deno.env.get('SMTP_PASSWORD') || '',
    });

    // Email template
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ${organizationName}!</h2>
        <p>Hello ${firstName} ${lastName},</p>
        <p>Your account has been created in the Employee Management System. Here are your login credentials:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${password}</p>
        </div>
        <p>For security reasons, please change your password after your first login.</p>
        <p>You can access the system at: <a href="https://your-app-url.com/login">https://your-app-url.com/login</a></p>
        <p>If you have any questions, please contact your administrator.</p>
        <p>Best regards,<br>${organizationName} Team</p>
      </div>
    `;

    // Send email
    await client.send({
      from: Deno.env.get('SMTP_FROM_EMAIL') || '',
      to: email,
      subject: `Welcome to ${organizationName} - Your Account Details`,
      content: "This email requires HTML support",
      html: emailContent,
    });

    await client.close();

    return new Response(
      JSON.stringify({ message: 'Welcome email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 