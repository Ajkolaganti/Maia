import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sendEmail = async (to: string, subject: string, htmlContent: string) => {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
        }],
        from: {
          email: Deno.env.get('SENDGRID_FROM_EMAIL'),
          name: 'EMS System',
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: htmlContent,
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SendGrid API error: ${JSON.stringify(error)}`);
    }

    console.log('Email sent successfully to:', to);
  } catch (error) {
    console.error('SendGrid Error:', error);
    throw error;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { organizationId, employeeIds } = await req.json();

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

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

    // Get organization name
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;

    // Get employees
    const query = supabaseAdmin
      .from('users')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('role', 'employee');

    // Add employee IDs filter if provided
    if (employeeIds && employeeIds.length > 0) {
      query.in('id', employeeIds);
    }

    const { data: employees, error: employeesError } = await query;

    if (employeesError) throw employeesError;

    const results = {
      success: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    // Generate temporary password for each employee
    for (const employee of employees) {
      try {
        const tempPassword = Math.random().toString(36).slice(-8);

        // Update password in Firebase (you'll need to implement this)
        // For now, we'll just send the email with instructions to use "Reset Password"

        const emailContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body>
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Welcome to ${orgData.name}!</h2>
                <p>Hello ${employee.first_name} ${employee.last_name},</p>
                <p>Your account has been created in our Employee Management System.</p>
                <p>To access your account, please:</p>
                <ol>
                  <li>Go to the login page</li>
                  <li>Click on "Forgot Password"</li>
                  <li>Enter your email address: ${employee.email}</li>
                  <li>Follow the instructions in the password reset email</li>
                </ol>
                <p>Best regards,<br>${orgData.name} Team</p>
              </div>
            </body>
          </html>
        `;

        await sendEmail(
          employee.email,
          `Welcome to ${orgData.name} - Account Access Instructions`,
          emailContent
        );

        results.success.push(employee.email);
      } catch (error) {
        console.error(`Failed to process employee ${employee.email}:`, error);
        results.failed.push({
          email: employee.email,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Welcome emails processed',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Check the function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 