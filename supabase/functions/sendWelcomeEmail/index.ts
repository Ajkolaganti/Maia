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
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); display: inline-block; padding: 20px; border-radius: 16px;">
            <div style="position: relative; width: 60px; height: 60px; margin: 0 auto;">
              <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(0,0,0,0.2);"></div>
              <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">⏰</span>
              </div>
            </div>
            <div style="color: white; font-size: 24px; font-weight: bold; margin-top: 10px;">
              WORKING40
            </div>
            <div style="color: rgba(255,255,255,0.7); font-size: 12px;">
              TIME MANAGEMENT
            </div>
          </div>
        </div>
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
      html: emailTemplate,
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