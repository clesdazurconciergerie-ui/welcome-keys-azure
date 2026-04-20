import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  /** Optional explicit owner_id. If not provided, generates for ALL active owners. */
  owner_id?: string
  /** YYYY-MM format. Defaults to previous month. */
  period?: string
  /** If true, force overwrite existing report for that period. */
  force?: boolean
}

const fmtEUR = (n: number) =>
  (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const fmtPct = (n: number) => (Number(n) || 0).toFixed(1) + ' %'
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

function getPreviousMonth(): { year: number; month: number; firstDay: string; lastDay: string; label: string } {
  const now = new Date()
  // First day of previous month
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const last = new Date(now.getFullYear(), now.getMonth(), 0)
  const firstDay = first.toISOString().substring(0, 10)
  const lastDay = last.toISOString().substring(0, 10)
  const label = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return { year: first.getFullYear(), month: first.getMonth() + 1, firstDay, lastDay, label }
}

function parsePeriod(p?: string): { firstDay: string; lastDay: string; label: string } {
  if (!p) {
    const prev = getPreviousMonth()
    return { firstDay: prev.firstDay, lastDay: prev.lastDay, label: prev.label }
  }
  const [y, m] = p.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const last = new Date(y, m, 0)
  return {
    firstDay: first.toISOString().substring(0, 10),
    lastDay: last.toISOString().substring(0, 10),
    label: first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  }
}

function nightsInMonth(checkIn: string, checkOut: string, monthStart: string, monthEnd: string): number {
  const start = new Date(Math.max(new Date(checkIn).getTime(), new Date(monthStart).getTime()))
  const end = new Date(Math.min(new Date(checkOut).getTime(), new Date(monthEnd + 'T23:59:59').getTime()))
  if (end <= start) return 0
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

function buildReportHtml(data: any): string {
  const itemsHtml = (data.bookings || [])
    .map((b: any) => `
      <tr>
        <td>${fmtDate(b.check_in)} → ${fmtDate(b.check_out)}</td>
        <td>${b.guest_name || '—'}</td>
        <td>${b.platform || 'Manuel'}</td>
        <td>${b.property_name || '—'}</td>
        <td style="text-align:right">${b.nights}</td>
        <td style="text-align:right">${fmtEUR(b.gross || 0)}</td>
      </tr>`).join('')

  const interventionsHtml = (data.interventions || [])
    .map((i: any) => `
      <tr>
        <td>${fmtDate(i.scheduled_date)}</td>
        <td>${i.property_name}</td>
        <td>${i.type === 'cleaning_checkout' || i.type === 'cleaning' ? 'Ménage' : i.type}</td>
        <td style="text-align:center">${i.photos_count}</td>
      </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Rapport mensuel ${data.period_label}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px; background: #fff; font-size: 13px; line-height: 1.5; }
  .header { border-bottom: 3px solid #061452; padding-bottom: 18px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { margin: 0 0 4px; color: #061452; font-size: 22px; }
  .header-left p { margin: 0; color: #666; font-size: 13px; }
  .header-right { text-align: right; color: #666; font-size: 12px; }
  .header-right strong { color: #061452; font-size: 14px; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section h2 { color: #061452; font-size: 15px; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e5e5; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
  .kpi { background: #f7f8fb; border: 1px solid #e8eaf0; border-radius: 8px; padding: 14px; text-align: center; }
  .kpi-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .kpi-value { font-size: 20px; font-weight: 700; color: #061452; }
  .kpi-accent { color: #C4A45B; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #061452; color: #fff; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #fafafa; }
  .empty { text-align: center; color: #999; padding: 18px; font-style: italic; }
  .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 10px; }
</style></head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Rapport mensuel</h1>
      <p>${data.period_label}</p>
    </div>
    <div class="header-right">
      <strong>${data.owner_name}</strong><br>
      ${data.owner_email || ''}<br>
      Émis le ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>

  <div class="section">
    <h2>📊 Indicateurs clés</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Réservations</div><div class="kpi-value">${data.total_bookings}</div></div>
      <div class="kpi"><div class="kpi-label">Nuitées</div><div class="kpi-value">${data.total_nights}</div></div>
      <div class="kpi"><div class="kpi-label">Taux d'occupation</div><div class="kpi-value kpi-accent">${fmtPct(data.occupancy_rate)}</div></div>
      <div class="kpi"><div class="kpi-label">Prix moyen / nuit</div><div class="kpi-value kpi-accent">${fmtEUR(data.adr)}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>🛏️ Détail des réservations</h2>
    ${data.bookings && data.bookings.length > 0 ? `
      <table>
        <thead><tr><th>Période</th><th>Voyageur</th><th>Plateforme</th><th>Bien</th><th style="text-align:right">Nuits</th><th style="text-align:right">Montant</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    ` : '<div class="empty">Aucune réservation sur la période.</div>'}
  </div>

  <div class="section">
    <h2>🧹 Interventions & ménages</h2>
    ${data.interventions && data.interventions.length > 0 ? `
      <table>
        <thead><tr><th>Date</th><th>Bien</th><th>Type</th><th style="text-align:center">Photos</th></tr></thead>
        <tbody>${interventionsHtml}</tbody>
      </table>
      <p style="margin-top:10px;font-size:11px;color:#666">${data.total_interventions} intervention(s) — ${data.total_photos} photo(s) au total.</p>
    ` : '<div class="empty">Aucune intervention sur la période.</div>'}
  </div>

  <div class="footer">
    Rapport généré automatiquement par MyWelkom — ${data.concierge_name || 'Votre conciergerie'}
  </div>
</body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const body: RequestBody = await req.json().catch(() => ({}))
    const { firstDay, lastDay, label } = parsePeriod(body.period)
    const periodMonth = firstDay // PK component

    // Determine target owners
    let ownersQuery = supabase
      .from('owners')
      .select('id, first_name, last_name, email, concierge_user_id, status')
      .eq('status', 'active')
    if (body.owner_id) ownersQuery = ownersQuery.eq('id', body.owner_id)

    const { data: owners, error: ownersErr } = await ownersQuery
    if (ownersErr) throw ownersErr
    if (!owners || owners.length === 0) {
      return new Response(JSON.stringify({ ok: true, generated: 0, message: 'No active owners' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let generated = 0
    const errors: any[] = []

    for (const owner of owners) {
      try {
        // Skip if exists and not forced
        if (!body.force) {
          const { data: existing } = await supabase
            .from('monthly_reports')
            .select('id')
            .eq('owner_id', owner.id)
            .eq('period_month', periodMonth)
            .maybeSingle()
          if (existing) continue
        }

        // Fetch owner's properties
        const { data: links } = await supabase
          .from('owner_properties')
          .select('property_id, properties:property_id(id, name)')
          .eq('owner_id', owner.id)
        const propertyIds = (links || []).map((l: any) => l.property_id)
        const propertyMap: Record<string, string> = {}
        ;(links || []).forEach((l: any) => {
          if (l.properties) propertyMap[l.property_id] = l.properties.name
        })

        if (propertyIds.length === 0) {
          // Empty report
          await supabase.from('monthly_reports').upsert({
            owner_id: owner.id,
            concierge_user_id: owner.concierge_user_id,
            period_month: periodMonth,
            payload: { period_label: label, empty: true },
          }, { onConflict: 'owner_id,period_month' })
          generated++
          continue
        }

        // Bookings overlapping the month
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, property_id, check_in, check_out, guest_name, source_platform, source, gross_amount, owner_net')
          .in('property_id', propertyIds)
          .lt('check_in', new Date(new Date(lastDay).getTime() + 86400000).toISOString().substring(0, 10))
          .gt('check_out', firstDay)
          .neq('price_status', 'canceled')

        // Calendar events (iCal) overlapping the month — for occupancy when bookings missing
        const { data: events } = await supabase
          .from('calendar_events')
          .select('id, property_id, start_date, end_date, guest_name, platform, event_type, status')
          .in('property_id', propertyIds)
          .lt('start_date', new Date(new Date(lastDay).getTime() + 86400000).toISOString().substring(0, 10))
          .gt('end_date', firstDay)
          .neq('status', 'cancelled')

        const seenEventIds = new Set<string>()
        const enriched: any[] = []
        let totalNights = 0
        let totalGross = 0
        let totalNet = 0

        // Add bookings (canonical)
        for (const b of bookings || []) {
          const n = nightsInMonth(b.check_in, b.check_out, firstDay, lastDay)
          if (n <= 0) continue
          totalNights += n
          totalGross += Number(b.gross_amount || 0)
          totalNet += Number(b.owner_net || 0)
          enriched.push({
            check_in: b.check_in,
            check_out: b.check_out,
            guest_name: b.guest_name,
            platform: b.source_platform || b.source || 'Manuel',
            property_name: propertyMap[b.property_id] || 'Bien',
            nights: n,
            gross: Number(b.gross_amount || 0),
          })
        }

        // Add iCal events that have no booking link (rare)
        for (const e of events || []) {
          if (e.event_type === 'blocked') continue
          const n = nightsInMonth(e.start_date, e.end_date, firstDay, lastDay)
          if (n <= 0) continue
          // Avoid double counting: if booking already covers same dates, skip
          const dup = enriched.some(b =>
            b.check_in === e.start_date && b.check_out === e.end_date
          )
          if (dup) continue
          totalNights += n
          enriched.push({
            check_in: e.start_date,
            check_out: e.end_date,
            guest_name: e.guest_name,
            platform: e.platform || 'iCal',
            property_name: propertyMap[e.property_id] || 'Bien',
            nights: n,
            gross: 0,
          })
        }

        // Available nights = nb properties × nb days in month
        const daysInMonth = (new Date(lastDay).getDate())
        const availableNights = propertyIds.length * daysInMonth
        const occupancyRate = availableNights > 0 ? (totalNights / availableNights) * 100 : 0
        const adr = totalNights > 0 ? totalGross / totalNights : 0

        // Interventions in month with photos count
        const { data: interventions } = await supabase
          .from('cleaning_interventions')
          .select('id, property_id, scheduled_date, type, mission_type, status, cleaning_photos(id)')
          .in('property_id', propertyIds)
          .gte('scheduled_date', firstDay)
          .lte('scheduled_date', lastDay)
          .order('scheduled_date', { ascending: true })

        const enrichedInterventions = (interventions || []).map((i: any) => ({
          scheduled_date: i.scheduled_date,
          property_name: propertyMap[i.property_id] || 'Bien',
          type: i.mission_type || i.type,
          photos_count: (i.cleaning_photos || []).length,
        }))
        const totalPhotos = enrichedInterventions.reduce((s, i) => s + i.photos_count, 0)

        // Get concierge name
        const { data: conciergeProfile } = await supabase
          .from('financial_settings')
          .select('company_name')
          .eq('user_id', owner.concierge_user_id)
          .maybeSingle()

        const reportData = {
          period_label: label.charAt(0).toUpperCase() + label.slice(1),
          owner_name: `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Propriétaire',
          owner_email: owner.email,
          concierge_name: conciergeProfile?.company_name || 'Votre conciergerie',
          total_bookings: enriched.length,
          total_nights: totalNights,
          available_nights: availableNights,
          occupancy_rate: occupancyRate,
          adr,
          gross_revenue: totalGross,
          owner_net: totalNet,
          total_interventions: enrichedInterventions.length,
          total_photos: totalPhotos,
          bookings: enriched.sort((a, b) => a.check_in.localeCompare(b.check_in)),
          interventions: enrichedInterventions,
        }

        // Generate HTML and upload as .html (PDF generation in browser via lib for simplicity)
        const html = buildReportHtml(reportData)
        const filePath = `monthly-reports/${owner.concierge_user_id}/${owner.id}/${periodMonth}.html`

        const { error: uploadErr } = await supabase.storage
          .from('owner-documents')
          .upload(filePath, new Blob([html], { type: 'text/html' }), {
            contentType: 'text/html; charset=utf-8',
            upsert: true,
          })
        if (uploadErr) throw uploadErr

        // Upsert report record
        await supabase.from('monthly_reports').upsert({
          owner_id: owner.id,
          concierge_user_id: owner.concierge_user_id,
          period_month: periodMonth,
          total_bookings: reportData.total_bookings,
          total_nights: totalNights,
          available_nights: availableNights,
          occupancy_rate: Math.min(999, occupancyRate),
          adr,
          gross_revenue: totalGross,
          owner_net: totalNet,
          total_interventions: reportData.total_interventions,
          total_photos: totalPhotos,
          payload: reportData,
          pdf_path: filePath,
          status: 'generated',
        }, { onConflict: 'owner_id,period_month' })

        // Send email if owner has one
        if (owner.email) {
          try {
            const { data: signed } = await supabase.storage
              .from('owner-documents')
              .createSignedUrl(filePath, 60 * 60 * 24 * 30) // 30 days

            const reportUrl = signed?.signedUrl

            const resendKey = Deno.env.get('RESEND_API_KEY')
            if (resendKey && reportUrl) {
              const emailHtml = `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                  <h2 style="color:#061452;">Votre rapport mensuel — ${reportData.period_label}</h2>
                  <p>Bonjour ${reportData.owner_name},</p>
                  <p>Voici votre rapport mensuel pour <strong>${reportData.period_label}</strong> :</p>
                  <ul style="line-height:1.8">
                    <li><strong>${reportData.total_bookings}</strong> réservation(s)</li>
                    <li><strong>${reportData.total_nights}</strong> nuitée(s)</li>
                    <li>Taux d'occupation : <strong>${fmtPct(occupancyRate)}</strong></li>
                    <li>Prix moyen / nuit : <strong>${fmtEUR(adr)}</strong></li>
                    <li><strong>${reportData.total_interventions}</strong> intervention(s) effectuée(s)</li>
                  </ul>
                  <p style="margin-top:24px">
                    <a href="${reportUrl}" style="background:#061452;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">
                      Consulter le rapport complet
                    </a>
                  </p>
                  <p style="color:#666;font-size:12px;margin-top:24px">Vous pouvez aussi accéder à tous vos rapports dans votre espace propriétaire MyWelkom.</p>
                </div>`

              const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'MyWelkom <notifications@mywelkom.com>',
                  to: [owner.email],
                  subject: `Votre rapport mensuel — ${reportData.period_label}`,
                  html: emailHtml,
                }),
              })

              if (resendRes.ok) {
                await supabase.from('monthly_reports').update({
                  status: 'sent',
                  email_sent_at: new Date().toISOString(),
                }).eq('owner_id', owner.id).eq('period_month', periodMonth)
              }
            }
          } catch (emailErr) {
            console.error('Email send failed for owner', owner.id, emailErr)
          }
        }

        generated++
      } catch (e: any) {
        console.error('Error generating report for owner', owner.id, e)
        errors.push({ owner_id: owner.id, error: e?.message || String(e) })
      }
    }

    return new Response(JSON.stringify({ ok: true, generated, errors, period: periodMonth }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('Fatal error:', e)
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
