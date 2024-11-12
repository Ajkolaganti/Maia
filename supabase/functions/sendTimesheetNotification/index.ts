import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, firstName, status, reason, organizationName } = await req.json();

    if (!email || !firstName || !status) {
      throw new Error('Missing required parameters');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email }],
        }],
        from: {
          email: Deno.env.get('SENDGRID_FROM_EMAIL'),
          name: organizationName || 'EMS System',
        },
        subject: `Timesheet ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Timesheet ${status}</h2>
              <p>Dear ${firstName},</p>
              <p>Your timesheet has been ${status}.</p>
              ${reason ? `
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>Reason:</strong></p>
                  <p>${reason}</p>
                </div>
                <p>Please review and resubmit your timesheet with the necessary corrections.</p>
              ` : ''}
              <p>Best regards,<br>${organizationName || 'Your Manager'}</p>
            </div>
          `,
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SendGrid API error: ${JSON.stringify(error)}`);
    }

    return new Response(
      JSON.stringify({ message: 'Notification sent successfully' }),
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