import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import type { Inspection } from '@/hooks/useInspections';

const FONT = "'Inter','Helvetica Neue',Arial,sans-serif";

function contrast(hex: string) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1a1a1a' : '#ffffff';
}
function lighten(hex: string, n: number) {
  const c = hex.replace('#', '');
  const r = Math.min(255, parseInt(c.substring(0, 2), 16) + n);
  const g = Math.min(255, parseInt(c.substring(2, 4), 16) + n);
  const b = Math.min(255, parseInt(c.substring(4, 6), 16) + n);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function InspectionPdfGenerator({ inspection }: { inspection: Inspection }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const { settings } = useFinancialSettings();
  const co = (settings as any) || {};
  const NAVY = co.invoice_primary_color || '#061452';
  const GOLD = co.invoice_accent_color || '#C4A45B';
  const GRAY = lighten(NAVY, 215);
  const htc = co.invoice_text_color || contrast(NAVY);
  const companyName = co.company_name || '';
  const defSig = co.default_signature_url || null;
  const concSig = inspection.concierge_signature_url || defSig;
  const addr = [co.address, [co.org_postal_code, co.org_city].filter(Boolean).join(' ')].filter(Boolean).join(' — ');

  const dateFmt = new Date(inspection.inspection_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const label = inspection.inspection_type === 'exit' ? "État des lieux de sortie" : "État des lieux d'entrée";
  const refN = `EDL-${new Date(inspection.inspection_date).getFullYear()}-${(inspection.id || '001').substring(0, 3).toUpperCase()}`;

  // Collect max 4 photos in priority order
  const all = [
    ...(inspection.cleaning_photos_json || []),
    ...((inspection as any).meter_photos_json || []),
    ...(inspection.exit_photos_json || []),
  ];
  const photos = all.slice(0, 4);
  const extra = all.length - photos.length;
  const keys = (inspection as any).keys_handed_over;

  const gen = async () => {
    setBusy(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const el = ref.current;
      if (!el) return;
      el.style.display = 'block';
      await html2pdf().set({
        margin: 0,
        filename: `etat-des-lieux-${inspection.inspection_date}.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).save();
      el.style.display = 'none';
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  /*
   * FIXED COMPOSITION — all heights hardcoded in the 210×297mm box.
   * Using inline dangerouslySetInnerHTML to avoid React hydration
   * adding extra wrapper divs that break the height budget.
   */

  const infoRows = [
    ['Bien', inspection.property?.name || '—'],
    ['Adresse', inspection.property?.address || '—'],
    ['Voyageur', inspection.guest_name || '—'],
    ['Occupants', inspection.occupants_count ? String(inspection.occupants_count) : '—'],
    ...(keys ? [['Clés remises', String(keys)]] : []),
    ['Ménage par', inspection.cleaner_name || '—'],
  ];

  const rowsHtml = infoRows.map(([l, v]) =>
    `<tr><td style="padding:4px 10px;font-weight:600;border-bottom:1px solid ${NAVY}12;border-right:1px solid ${NAVY}12;width:38%">${l}</td><td style="padding:4px 10px;border-bottom:1px solid ${NAVY}12">${v}</td></tr>`
  ).join('');

  const photosHtml = photos.length ? photos.map((p: any) =>
    `<img src="${p.url}" style="width:48%;height:100px;object-fit:cover;border-radius:3px;border:1px solid ${NAVY}1a" crossOrigin="anonymous"/>`
  ).join('') : '';

  const extraLine = extra > 0
    ? `<p style="font-size:8px;color:#6b7280;font-style:italic;margin:4px 0 0">+ ${extra} photo${extra > 1 ? 's' : ''} supplémentaire${extra > 1 ? 's' : ''} dans l'application</p>`
    : '';

  const sigBox = (url: string | null) => url
    ? `<div style="border:1px solid ${NAVY}1a;border-radius:3px;height:65px;display:flex;align-items:center;padding:4px"><img src="${url}" style="max-height:56px;max-width:100%;object-fit:contain" crossOrigin="anonymous"/></div>`
    : `<div style="height:65px;border:1px dashed #d1d5db;border-radius:3px"></div>`;

  const commentBlock = inspection.general_comment
    ? `<div style="padding:0 24px;margin-top:6px">
        <div style="font-size:9px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:0.6px;border-bottom:1.5px solid ${GOLD};padding-bottom:2px;margin-bottom:3px">Observations</div>
        <p style="font-size:8.5px;line-height:1.4;margin:0;max-height:30px;overflow:hidden;white-space:pre-wrap">${inspection.general_comment}</p>
       </div>` : '';

  const damageBlock = inspection.damage_notes
    ? `<div style="padding:0 24px;margin-top:4px">
        <div style="font-size:9px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1.5px solid #dc2626;padding-bottom:2px;margin-bottom:3px">Dégâts</div>
        <p style="font-size:8.5px;line-height:1.4;margin:0;max-height:24px;overflow:hidden;white-space:pre-wrap;background:#fef2f2;padding:3px 6px;border-radius:2px;border:1px solid #fecaca">${inspection.damage_notes}</p>
       </div>` : '';

  const html = `
<!-- A. HEADER — 70px -->
<div style="height:70px;background:${NAVY};color:${htc};display:flex;align-items:stretch;box-sizing:border-box">
  <div style="flex:1;padding:10px 24px;display:flex;flex-direction:column;justify-content:center">
    <div style="font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid ${GOLD};display:inline-block;padding-bottom:2px">${companyName || 'MA CONCIERGERIE'}</div>
    ${addr ? `<p style="margin:3px 0 0;font-size:8.5px;opacity:.85;line-height:1.3">${addr}</p>` : ''}
  </div>
  ${co.logo_url ? `<div style="width:60px;display:flex;align-items:center;justify-content:center;padding:4px"><img src="${co.logo_url}" style="max-height:46px;max-width:52px;object-fit:contain" crossOrigin="anonymous"/></div>` : ''}
  <div style="flex:1;padding:10px 24px;display:flex;flex-direction:column;justify-content:center;text-align:right">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;border-bottom:2px solid ${GOLD};display:inline-block;margin-left:auto;padding-bottom:2px">${inspection.guest_name || 'NOM VOYAGEUR'}</div>
    <p style="margin:3px 0 0;font-size:8.5px;opacity:.85">${inspection.property?.name || ''}</p>
  </div>
</div>

<!-- B. TITLE — 44px -->
<div style="height:44px;padding:8px 24px;display:flex;align-items:center;box-sizing:border-box">
  <div style="width:3px;height:26px;background:${GOLD};border-radius:1px;margin-right:10px;flex-shrink:0"></div>
  <div>
    <div style="font-size:14px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:1.5px;line-height:1.2">${label}</div>
    <div style="font-size:9px;color:#555;margin-top:1px">Réf : ${refN} · Date : ${dateFmt}</div>
  </div>
</div>

<!-- C. INFO TABLE — max 130px -->
<div style="padding:0 24px;max-height:130px;overflow:hidden">
  <table style="width:100%;border-collapse:collapse;border:1.5px solid ${NAVY};font-size:9px;font-family:${FONT}">
    <thead><tr>
      <th style="background:${NAVY};color:${htc};font-size:8.5px;font-weight:600;letter-spacing:.5px;text-align:left;padding:4px 10px;border-right:1px solid ${htc}33;width:38%">Information</th>
      <th style="background:${NAVY};color:${htc};font-size:8.5px;font-weight:600;letter-spacing:.5px;text-align:left;padding:4px 10px">Détail</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</div>

<!-- TEXT BLOCKS -->
${commentBlock}
${damageBlock}

<!-- D. PHOTOS — 4 max, 2×2 grid, fixed 220px block -->
${photos.length > 0 ? `
<div style="padding:8px 24px 0;max-height:230px;overflow:hidden">
  <div style="font-size:9px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid ${GOLD};padding-bottom:2px;margin-bottom:6px">Photos</div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:space-between">
    ${photosHtml}
  </div>
  ${extraLine}
</div>` : ''}

<!-- E. SIGNATURES — fixed 100px -->
<div style="padding:10px 24px 0;display:flex;gap:24px;height:100px;box-sizing:border-box">
  <div style="flex:1">
    <div style="font-size:8.5px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid ${GOLD};padding-bottom:3px;margin-bottom:5px">Signature conciergerie</div>
    ${sigBox(concSig)}
  </div>
  <div style="flex:1">
    <div style="font-size:8.5px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid ${GOLD};padding-bottom:3px;margin-bottom:5px">Signature client</div>
    ${sigBox(inspection.guest_signature_url)}
  </div>
</div>

<!-- F. FOOTER — pinned bottom 24px -->
<div style="position:absolute;bottom:0;left:0;right:0;height:24px;border-top:1.5px solid ${GOLD};background:${GRAY};display:flex;align-items:center;justify-content:space-between;padding:0 24px;box-sizing:border-box">
  <span style="font-size:7.5px;color:${NAVY};opacity:.7">Document généré via <b>MyWelkom</b>${companyName ? ` · ${companyName}` : ''}</span>
  <span style="font-size:7.5px;color:${NAVY};opacity:.7">${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
</div>`;

  return (
    <>
      <Button variant="outline" size="sm" onClick={gen} disabled={busy} className="gap-1.5">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        PDF
      </Button>
      <div
        ref={ref}
        style={{
          display: 'none',
          fontFamily: FONT,
          width: '210mm',
          height: '297mm',
          maxHeight: '297mm',
          overflow: 'hidden',
          background: '#fff',
          color: '#1a1a1a',
          position: 'relative',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
