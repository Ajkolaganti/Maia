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
    const { email, firstName, status, reason } = await req.json();

    // Call the sendEmail Edge Function
    const { error } = await supabase.functions.invoke('sendEmail', {
      body: {
        to: email,
        subject: `Timesheet ${status.toUpperCase()}`,
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Timesheet ${status.toUpperCase()}</h2>
            <p>Hello ${firstName},</p>
            <p>Your timesheet has been ${status}.</p>
            ${reason ? `
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Reason:</strong></p>
                <p>${reason}</p>
              </div>
              <p>Please review and resubmit your timesheet with the necessary corrections.</p>
            ` : ''}
            <p>Best regards,<br>Pro Team Workforce Management</p>
          </div>
        `
      }
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: 'Notification sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 