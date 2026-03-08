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
      el.style.display = 'flex';
      const elW = el.offsetWidth;
      const elH = el.offsetHeight;
      await html2pdf().set({
        margin: 0,
        filename: `etat-des-lieux-${inspection.inspection_date}.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, width: elW, height: elH, scrollY: 0, scrollX: 0 },
        jsPDF: { unit: 'px', format: [elW * 2, elH * 2], orientation: 'portrait', hotfixes: ['px_scaling'] },
        pagebreak: { mode: ['avoid-all'] },
      }).from(el).save();
      el.style.display = 'none';
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  const infoRows = [
    ['Bien', inspection.property?.name || '—'],
    ['Adresse', inspection.property?.address || '—'],
    ['Voyageur', inspection.guest_name || '—'],
    ['Occupants', inspection.occupants_count ? String(inspection.occupants_count) : '—'],
    ...(keys ? [['Clés remises', String(keys)]] : []),
    ['Ménage par', inspection.cleaner_name || '—'],
  ];

  const rowsHtml = infoRows.map(([l, v]) =>
    `<tr><td style="padding:6px 12px;font-weight:600;border-bottom:1px solid ${NAVY}15;border-right:1px solid ${NAVY}15;width:35%">${l}</td><td style="padding:6px 12px;border-bottom:1px solid ${NAVY}15">${v}</td></tr>`
  ).join('');

  const photosHtml = photos.map((p: any) =>
    `<img src="${p.url}" style="width:48%;object-fit:cover;border-radius:4px;border:1px solid ${NAVY}1a" crossOrigin="anonymous"/>`
  ).join('');

  const extraLine = extra > 0
    ? `<p style="font-size:8.5px;color:#6b7280;font-style:italic;margin:6px 0 0;text-align:center">+ ${extra} photo${extra > 1 ? 's' : ''} supplémentaire${extra > 1 ? 's' : ''} disponible${extra > 1 ? 's' : ''} dans l'application</p>`
    : '';

  const sigBox = (url: string | null) => url
    ? `<div style="border:1px solid ${NAVY}1a;border-radius:4px;height:80px;display:flex;align-items:center;justify-content:center;padding:6px;background:#fafafa"><img src="${url}" style="max-height:68px;max-width:100%;object-fit:contain" crossOrigin="anonymous"/></div>`
    : `<div style="height:80px;border:1.5px dashed #d1d5db;border-radius:4px;background:#fafafa"></div>`;

  const commentBlock = inspection.general_comment
    ? `<div style="padding:0 28px;margin-top:10px">
        <div style="font-size:9.5px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:0.6px;border-bottom:2px solid ${GOLD};padding-bottom:3px;margin-bottom:5px">Observations</div>
        <p style="font-size:9px;line-height:1.5;margin:0;max-height:40px;overflow:hidden;white-space:pre-wrap">${inspection.general_comment}</p>
       </div>` : '';

  const damageBlock = inspection.damage_notes
    ? `<div style="padding:0 28px;margin-top:8px">
        <div style="font-size:9.5px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.6px;border-bottom:2px solid #dc2626;padding-bottom:3px;margin-bottom:5px">Dégâts</div>
        <p style="font-size:9px;line-height:1.5;margin:0;max-height:32px;overflow:hidden;white-space:pre-wrap;background:#fef2f2;padding:4px 8px;border-radius:3px;border:1px solid #fecaca">${inspection.damage_notes}</p>
       </div>` : '';

  // The key: use display:flex;flex-direction:column;height:100% so photo section grows
  const html = `
<div style="display:flex;flex-direction:column;height:100%;width:100%;box-sizing:border-box">

  <!-- A. HEADER — 100px -->
  <div style="height:100px;min-height:100px;background:${NAVY};color:${htc};display:flex;align-items:stretch;box-sizing:border-box">
    <div style="flex:1;padding:14px 28px;display:flex;flex-direction:column;justify-content:center">
      <div style="font-size:15px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;border-bottom:2.5px solid ${GOLD};display:inline-block;padding-bottom:3px">${companyName || 'MA CONCIERGERIE'}</div>
      ${addr ? `<p style="margin:5px 0 0;font-size:9px;opacity:.85;line-height:1.4">${addr}</p>` : ''}
    </div>
    ${co.logo_url ? `<div style="width:80px;display:flex;align-items:center;justify-content:center;padding:8px"><img src="${co.logo_url}" style="max-height:60px;max-width:64px;object-fit:contain" crossOrigin="anonymous"/></div>` : ''}
    <div style="flex:1;padding:14px 28px;display:flex;flex-direction:column;justify-content:center;text-align:right">
      <div style="font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;border-bottom:2.5px solid ${GOLD};display:inline-block;margin-left:auto;padding-bottom:3px">${inspection.guest_name || 'NOM VOYAGEUR'}</div>
      <p style="margin:5px 0 0;font-size:9px;opacity:.85">${inspection.property?.name || ''}</p>
    </div>
  </div>

  <!-- B. TITLE — 56px -->
  <div style="height:56px;min-height:56px;padding:12px 28px;display:flex;align-items:center;box-sizing:border-box">
    <div style="width:4px;height:32px;background:${GOLD};border-radius:2px;margin-right:14px;flex-shrink:0"></div>
    <div>
      <div style="font-size:16px;font-weight:800;color:${NAVY};text-transform:uppercase;letter-spacing:2px;line-height:1.2">${label}</div>
      <div style="font-size:10px;color:#555;margin-top:2px">Réf : ${refN} · Date : ${dateFmt}</div>
    </div>
  </div>

  <!-- C. INFO TABLE -->
  <div style="padding:0 28px;flex-shrink:0">
    <table style="width:100%;border-collapse:collapse;border:1.5px solid ${NAVY};font-size:10px;font-family:${FONT}">
      <thead><tr>
        <th style="background:${NAVY};color:${htc};font-size:9px;font-weight:600;letter-spacing:.5px;text-align:left;padding:6px 12px;border-right:1px solid ${htc}33;width:35%">Information</th>
        <th style="background:${NAVY};color:${htc};font-size:9px;font-weight:600;letter-spacing:.5px;text-align:left;padding:6px 12px">Détail</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>

  <!-- TEXT BLOCKS -->
  ${commentBlock}
  ${damageBlock}

  <!-- D. PHOTOS — flex:1 fills remaining space -->
  ${photos.length > 0 ? `
  <div style="flex:1;min-height:60px;padding:12px 28px 0;display:flex;flex-direction:column;overflow:hidden">
    <div style="font-size:10px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:.6px;border-bottom:2px solid ${GOLD};padding-bottom:3px;margin-bottom:8px;flex-shrink:0">Photos</div>
    <div style="flex:1;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-content:start">
      ${photos.map((p: any) =>
        `<div style="width:48%;flex:0 0 48%;height:calc(50% - 4px);display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:4px;border:1px solid ${NAVY}1a;background:#f9f9f9"><img src="${p.url}" style="max-width:100%;max-height:100%;object-fit:contain" crossOrigin="anonymous"/></div>`
      ).join('')}
    </div>
    ${extraLine}
  </div>` : `<div style="flex:1"></div>`}

  <!-- E. SIGNATURES — 120px -->
  <div style="height:120px;min-height:120px;padding:10px 28px;display:flex;gap:28px;box-sizing:border-box;flex-shrink:0">
    <div style="flex:1;display:flex;flex-direction:column">
      <div style="font-size:9.5px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:.6px;border-bottom:2px solid ${GOLD};padding-bottom:3px;margin-bottom:6px">Signature conciergerie</div>
      <div style="flex:1">${sigBox(concSig)}</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column">
      <div style="font-size:9.5px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:.6px;border-bottom:2px solid ${GOLD};padding-bottom:3px;margin-bottom:6px">Signature client</div>
      <div style="flex:1">${sigBox(inspection.guest_signature_url)}</div>
    </div>
  </div>

  <!-- F. FOOTER — 28px -->
  <div style="height:28px;min-height:28px;border-top:2px solid ${GOLD};background:${GRAY};display:flex;align-items:center;justify-content:space-between;padding:0 28px;box-sizing:border-box;flex-shrink:0">
    <span style="font-size:8px;color:${NAVY};opacity:.7">Document généré via <b>MyWelkom</b>${companyName ? ` · ${companyName}` : ''}</span>
    <span style="font-size:8px;color:${NAVY};opacity:.7">${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
  </div>

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
          overflow: 'hidden',
          background: '#fff',
          color: '#1a1a1a',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
