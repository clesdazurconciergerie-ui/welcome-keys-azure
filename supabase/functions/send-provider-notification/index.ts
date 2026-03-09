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
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    
    console.log('📧 Payload:', JSON.stringify({
      provider_email: payload.provider_email,
      mission_title: payload.mission_title,
      notification_type: payload.notification_type
    }));
    
    if (!payload.provider_email || !payload.provider_email.includes('@')) {
      console.error('❌ Invalid email:', payload.provider_email);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email' }),
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

    // Clean subject - avoid spam triggers (no emojis in subject)
    const subject = notification_type === 'mission_assigned'
      ? `Mission assignee - ${property_name}`
      : notification_type === 'test'
      ? `Test notification - MyWelkom`
      : `Nouvelle mission disponible - ${property_name}`;

    const appUrl = 'https://welkom.lovable.app';
    const unsubscribeUrl = `${appUrl}/prestataire/parametres`;

    // Clean, spam-friendly HTML template
    const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #333333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; max-width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #6366f1; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">
                ${notification_type === 'mission_assigned' ? 'Mission Assignee' : notification_type === 'test' ? 'Email de Test' : 'Nouvelle Mission'}
              </h1>
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">MyWelkom - Gestion de conciergerie</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                ${mission_title || 'Nouvelle mission'}
              </h2>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #6b7280; font-size: 14px;">Logement</strong><br>
                          <span style="color: #1f2937;">${property_name || 'Non specifie'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #6b7280; font-size: 14px;">Date et heure</strong><br>
                          <span style="color: #1f2937;">${mission_date || 'A definir'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #6b7280; font-size: 14px;">Remuneration</strong><br>
                          <span style="color: #059669; font-size: 20px; font-weight: 700;">${mission_amount || 0} EUR</span>
                        </td>
                      </tr>
                      ${mission_instructions ? `
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                          <strong style="color: #6b7280; font-size: 14px;">Instructions</strong><br>
                          <span style="color: #1f2937;">${mission_instructions}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/prestataire/missions" 
                       style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Voir la mission
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                Vous recevez cet email car vous etes prestataire sur MyWelkom.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                <a href="${unsubscribeUrl}" style="color: #6366f1; text-decoration: underline;">Gerer mes preferences</a>
                &nbsp;|&nbsp;
                <a href="${appUrl}" style="color: #6366f1; text-decoration: underline;">Acceder a MyWelkom</a>
              </p>
              <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                MyWelkom - Simplifiez votre conciergerie<br>
                Cet email a ete envoye a ${provider_email}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Plain text version for better deliverability
    const textContent = `
${notification_type === 'mission_assigned' ? 'Mission Assignee' : 'Nouvelle Mission Disponible'}

${mission_title || 'Nouvelle mission'}

Logement: ${property_name || 'Non specifie'}
Date: ${mission_date || 'A definir'}
Remuneration: ${mission_amount || 0} EUR
${mission_instructions ? `Instructions: ${mission_instructions}` : ''}

Voir la mission: ${appUrl}/prestataire/missions

---
Vous recevez cet email car vous etes prestataire sur MyWelkom.
Gerer vos preferences: ${unsubscribeUrl}
`.trim();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY missing');
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📤 Sending to:', provider_email);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MyWelkom <notifications@mywelkom.com>',
        to: provider_email,
        subject,
        html: emailHtml,
        text: textContent, // Plain text improves deliverability
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });

    const resData = await res.json();
    
    console.log('📥 Resend response:', res.status, JSON.stringify(resData));
    
    if (!res.ok) {
      console.error('❌ Resend error:', resData);
      return new Response(
        JSON.stringify({ success: false, error: resData.message || 'Resend error', details: resData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Email sent:', resData.id);

    return new Response(
      JSON.stringify({ success: true, email_id: resData.id, recipient: provider_email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Exception:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
