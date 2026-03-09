import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotificationPayload {
  provider_email: string;
  mission_title: string;
  property_name: string;
  mission_date: string;
  mission_amount: number;
  mission_instructions?: string;
  mission_id: string;
  notification_type: 'mission_available' | 'mission_assigned' | 'test';
}

Deno.serve(async (req) => {
  console.log('=== send-provider-notification START ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight - returning 200');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse payload
    const payload: NotificationPayload = await req.json();
    
    console.log('📧 PAYLOAD RECEIVED:');
    console.log('  - provider_email:', payload.provider_email);
    console.log('  - mission_title:', payload.mission_title);
    console.log('  - property_name:', payload.property_name);
    console.log('  - mission_date:', payload.mission_date);
    console.log('  - mission_amount:', payload.mission_amount);
    console.log('  - notification_type:', payload.notification_type);
    console.log('  - mission_id:', payload.mission_id);
    
    // Validate required fields
    if (!payload.provider_email) {
      console.error('❌ VALIDATION ERROR: provider_email is missing');
      return new Response(
        JSON.stringify({ success: false, error: 'provider_email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.provider_email.includes('@')) {
      console.error('❌ VALIDATION ERROR: invalid email format:', payload.provider_email);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      ? `🎯 Mission assignée — ${property_name}`
      : notification_type === 'test'
      ? `🧪 Test email — MyWelkom`
      : `✨ Nouvelle mission disponible — ${property_name}`;

    // App URL for the CTA button
    const appUrl = 'https://welkom.lovable.app';

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .mission-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .mission-detail { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .mission-detail:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #6b7280; font-size: 14px; }
            .value { color: #111827; font-size: 16px; margin-top: 4px; }
            .amount { color: #059669; font-weight: 700; font-size: 20px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">${notification_type === 'mission_assigned' ? '🎯 Mission Assignée' : notification_type === 'test' ? '🧪 Email de Test' : '✨ Nouvelle Mission'}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">MyWelkom</p>
            </div>
            <div class="content">
              <div class="mission-card">
                <h2 style="margin: 0 0 20px 0; color: #111827;">${mission_title || 'Mission Test'}</h2>
                
                <div class="mission-detail">
                  <div class="label">📍 Logement</div>
                  <div class="value">${property_name || 'Propriété test'}</div>
                </div>
                
                <div class="mission-detail">
                  <div class="label">📅 Date et heure</div>
                  <div class="value">${mission_date || 'Date test'}</div>
                </div>
                
                <div class="mission-detail">
                  <div class="label">💰 Montant</div>
                  <div class="amount">${mission_amount || 0} €</div>
                </div>
                
                ${mission_instructions ? `
                  <div class="mission-detail">
                    <div class="label">📝 Instructions</div>
                    <div class="value">${mission_instructions}</div>
                  </div>
                ` : ''}
              </div>
              
              <div style="text-align: center;">
                <a href="${appUrl}/prestataire/missions" class="cta-button">
                  Voir la mission
                </a>
              </div>
              
              <div class="footer">
                <p>Vous recevez cet email car une mission est disponible sur votre compte MyWelkom.</p>
                <p style="margin-top: 10px;">© ${new Date().getFullYear()} MyWelkom. Tous droits réservés.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Get Resend API key
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    console.log('🔑 RESEND_API_KEY exists:', !!RESEND_API_KEY);
    console.log('🔑 RESEND_API_KEY length:', RESEND_API_KEY?.length || 0);
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured in environment');
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Resend
    const sender = 'MyWelkom <notifications@mywelkom.com>';
    
    console.log('📤 SENDING EMAIL:');
    console.log('  - from:', sender);
    console.log('  - to:', provider_email);
    console.log('  - subject:', subject);

    const resendPayload = {
      from: sender,
      to: provider_email,
      subject,
      html: emailHtml,
    };

    console.log('📤 Calling Resend API...');
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    });

    const resData = await res.json();
    
    console.log('📥 RESEND RESPONSE:');
    console.log('  - status:', res.status);
    console.log('  - ok:', res.ok);
    console.log('  - data:', JSON.stringify(resData));
    
    if (!res.ok) {
      console.error('❌ RESEND API ERROR:');
      console.error('  - statusCode:', resData.statusCode);
      console.error('  - name:', resData.name);
      console.error('  - message:', resData.message);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Resend API error: ${resData.message || JSON.stringify(resData)}`,
          resend_error: resData,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ EMAIL SENT SUCCESSFULLY:');
    console.log('  - resend_id:', resData.id);
    console.log('  - to:', provider_email);
    console.log('  - mission_id:', mission_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification sent successfully',
        email_id: resData.id,
        recipient: provider_email,
        subject: subject,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ EXCEPTION in send-provider-notification:');
    console.error('  - name:', error.name);
    console.error('  - message:', error.message);
    console.error('  - stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        error_type: error.name,
        stack: error.stack,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
