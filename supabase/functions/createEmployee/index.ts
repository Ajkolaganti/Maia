import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SENDGRID_API_KEY || !FIREBASE_API_KEY) {
  throw new Error('Missing required environment variables');
}

// Initialize Firebase
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: Deno.env.get('FIREBASE_AUTH_DOMAIN'),
  projectId: Deno.env.get('FIREBASE_PROJECT_ID'),
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const sendEmail = async (to: string, subject: string, htmlContent: string) => {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
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

    console.log('Email sent successfully');
  } catch (error) {
    console.error('SendGrid Error:', error);
    throw error;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let firebaseUser = null;
  let supabaseUser = null;

  try {
    const { email, password, userData, organizationName } = await req.json();
    console.log('Creating employee with data:', { email, userData, organizationName });

    // Validate required data
    if (!email || !password || !userData || !organizationName) {
      throw new Error('Missing required fields');
    }

    // Create user in Firebase
    console.log('Creating Firebase user...');
    const firebaseResult = await createUserWithEmailAndPassword(auth, email, password);
    firebaseUser = firebaseResult.user;
    console.log('Firebase user created:', firebaseUser.uid);

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create user profile in Supabase
    console.log('Creating user profile in Supabase...');
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: firebaseUser.uid, // Use Firebase UID
        email: email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        role: 'employee',
        organization_id: userData.organization_id,
        client_id: userData.client_id,
        status: 'active'
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      // Cleanup: Delete Firebase user if profile creation fails
      if (firebaseUser) {
        await auth.deleteUser(firebaseUser.uid);
      }
      throw new Error(`Profile error: ${profileError.message}`);
    }

    supabaseUser = profileData;
    console.log('User profile created:', supabaseUser.id);

    // Send welcome email
    try {
      const emailContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Welcome to ${organizationName}!</h2>
              <p>Hello ${userData.first_name} ${userData.last_name},</p>
              <p>Your account has been created. Here are your login credentials:</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
              </div>
              <p>Please change your password after your first login.</p>
              <p>Best regards,<br>${organizationName} Team</p>
            </div>
          </body>
        </html>
      `;

      await sendEmail(
        email,
        `Welcome to ${organizationName}`,
        emailContent
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    return new Response(
      JSON.stringify({
        message: 'Employee created successfully',
        userId: firebaseUser.uid
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Function error:', error);

    // Cleanup on error
    if (firebaseUser && !supabaseUser) {
      try {
        await auth.deleteUser(firebaseUser.uid);
      } catch (cleanupError) {
        console.error('Error cleaning up Firebase user:', cleanupError);
      }
    }

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