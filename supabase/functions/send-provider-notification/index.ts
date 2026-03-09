import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  notification_id: string;
  provider_email: string;
  mission_title: string;
  property_name: string;
  mission_date: string;
  mission_amount: number;
  mission_instructions?: string;
  mission_id: string;
  notification_type: 'mission_available' | 'mission_assigned';
}

Deno.serve(async (req) => {
  console.log('=== send-provider-notification invoked ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: NotificationPayload = await req.json();
    console.log('Payload received:', { 
      provider_email: payload.provider_email,
      mission_title: payload.mission_title,
      notification_type: payload.notification_type 
    });
    
    const {
      provider_email,
      mission_title,
      property_name,
      mission_date,
      mission_amount,
      mission_instructions,
      mission_id,
      notification_type,
    } = payload;

    // Build email subject
    const subject = notification_type === 'mission_assigned'
      ? `Mission assignée — ${property_name}`
      : `Nouvelle mission disponible — ${property_name}`;

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .mission-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .mission-detail { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .mission-detail:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #6b7280; font-size: 14px; }
            .value { color: #111827; font-size: 16px; margin-top: 4px; }
            .amount { color: #059669; font-weight: 700; font-size: 20px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">${notification_type === 'mission_assigned' ? '🎯 Mission Assignée' : '✨ Nouvelle Mission'}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">MyWelkom</p>
            </div>
            <div class="content">
              <div class="mission-card">
                <h2 style="margin: 0 0 20px 0; color: #111827;">${mission_title}</h2>
                
                <div class="mission-detail">
                  <div class="label">📍 Logement</div>
                  <div class="value">${property_name}</div>
                </div>
                
                <div class="mission-detail">
                  <div class="label">📅 Date et heure</div>
                  <div class="value">${mission_date}</div>
                </div>
                
                <div class="mission-detail">
                  <div class="label">💰 Montant</div>
                  <div class="amount">${mission_amount} €</div>
                </div>
                
                ${mission_instructions ? `
                  <div class="mission-detail">
                    <div class="label">📝 Instructions</div>
                    <div class="value">${mission_instructions}</div>
                  </div>
                ` : ''}
              </div>
              
              <div style="text-align: center;">
                <a href="${supabaseUrl.replace('supabase.co', 'lovable.app')}/prestataire/missions" class="cta-button">
                  Voir la mission
                </a>
              </div>
              
              <div class="footer">
                <p>Vous recevez cet email car une nouvelle mission est disponible sur votre compte MyWelkom.</p>
                <p style="margin-top: 10px;">© ${new Date().getFullYear()} MyWelkom. Tous droits réservés.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      throw new Error('RESEND_API_KEY not configured');
    }

    console.log('Sending email via Resend to:', provider_email);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MyWelkom <onboarding@resend.dev>',
        to: provider_email,
        subject,
        html: emailHtml,
      }),
    });

    const resData = await res.json();
    
    if (!res.ok) {
      console.error('Resend API error:', resData);
      throw new Error(`Resend API error: ${JSON.stringify(resData)}`);
    }

    console.log('✅ Email sent successfully:', {
      to: provider_email,
      subject,
      mission_id,
      resend_id: resData.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification sent successfully',
        email_id: resData.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error sending provider notification:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});