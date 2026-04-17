import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import type { Inspection } from '@/hooks/useInspections';

const FONT = "'Inter','SF Pro Display','Helvetica Neue',Arial,sans-serif";

function contrast(hex: string) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16),
    g = parseInt(c.substring(2, 4), 16),
    b = parseInt(c.substring(4, 6), 16);
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

  // Brand palette — bleu profond + or
  const NAVY = co.invoice_primary_color || '#061452';
  const GOLD = co.invoice_accent_color || '#C4A45B';
  const LIGHT = lighten(NAVY, 230);
  const SOFT = '#f7f8fb';
  const htc = co.invoice_text_color || contrast(NAVY);

  const companyName = co.company_name || 'Ma Conciergerie';
  const defSig = co.default_signature_url || null;
  const concSig = inspection.concierge_signature_url || defSig;
  const addr = [co.address, [co.org_postal_code, co.org_city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' — ');
  const phone = co.org_phone || '';
  const vat = co.vat_number || '';
  const legalFooter = co.legal_footer || '';

  const dateFmt = new Date(inspection.inspection_date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const generatedAt = new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const isExit = inspection.inspection_type === 'exit';
  const label = isExit ? "État des lieux de sortie" : "État des lieux d'entrée";
  const refN = `EDL-${new Date(inspection.inspection_date).getFullYear()}-${(inspection.id || '001')
    .substring(0, 6)
    .toUpperCase()}`;

  // Booking details
  const booking = (inspection as any).booking || null;
  const checkIn = booking?.check_in
    ? new Date(booking.check_in).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  const checkOut = booking?.check_out
    ? new Date(booking.check_out).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  const guestEmail = booking?.guest_email || (inspection as any).guest_email || '';
  const guestPhone = booking?.guest_phone || (inspection as any).guest_phone || '';

  const cleaningPhotos = inspection.cleaning_photos_json || [];
  const meterPhotos = (inspection as any).meter_photos_json || [];
  const exitPhotos = inspection.exit_photos_json || [];
  const keys = (inspection as any).keys_handed_over;

  // Meters
  const meters = [
    { label: 'Électricité', value: inspection.meter_electricity },
    { label: 'Eau', value: inspection.meter_water },
    { label: 'Gaz', value: inspection.meter_gas },
  ].filter(m => m.value);

  // Visual checklist items (dynamic based on data)
  const checklist = [
    { label: 'Logement propre & rangé', ok: !inspection.damage_notes },
    { label: 'Compteurs relevés', ok: meters.length > 0 },
    { label: 'Clés remises', ok: !!keys },
    { label: 'Signature voyageur', ok: !!inspection.guest_signature_url },
    { label: 'Photos prises', ok: cleaningPhotos.length + exitPhotos.length > 0 },
  ];

  const gen = async () => {
    setBusy(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const el = ref.current;
      if (!el) return;
      el.style.display = 'block';
      await (html2pdf() as any)
        .set({
          margin: 0,
          filename: `etat-des-lieux-${inspection.property?.name || 'bien'}-${inspection.inspection_date}.pdf`.replace(/\s+/g, '-'),
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2.2, useCORS: true, scrollY: 0, scrollX: 0, letterRendering: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.no-break'] },
        })
        .from(el)
        .save();
      el.style.display = 'none';
    } catch (e) {
      console.error('PDF gen error', e);
    } finally {
      setBusy(false);
    }
  };

  // === Helpers ===
  const sectionTitle = (title: string, icon = '') => `
    <div class="no-break" style="display:flex;align-items:center;gap:10px;margin:18px 0 10px">
      <div style="width:3px;height:18px;background:${GOLD};border-radius:2px"></div>
      <h2 style="margin:0;font-size:11px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:1.8px">${icon}${title}</h2>
    </div>`;

  const infoCard = (label: string, value: string) => `
    <div style="background:${SOFT};border:1px solid ${NAVY}10;border-radius:8px;padding:10px 12px">
      <div style="font-size:8.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;margin-bottom:3px">${label}</div>
      <div style="font-size:11px;color:${NAVY};font-weight:600;line-height:1.3">${value || '—'}</div>
    </div>`;

  const checkRow = (it: { label: string; ok: boolean }) => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:${it.ok ? '#f0fdf4' : '#fef2f2'};border:1px solid ${it.ok ? '#bbf7d0' : '#fecaca'};border-radius:6px">
      <div style="width:14px;height:14px;border-radius:50%;background:${it.ok ? '#16a34a' : '#dc2626'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;line-height:1">${it.ok ? '✓' : '✕'}</div>
      <span style="font-size:9.5px;color:#1a1a1a;font-weight:500">${it.label}</span>
    </div>`;

  const photoGrid = (list: any[], title: string) => {
    if (!list || list.length === 0) return '';
    const items = list.slice(0, 6);
    const more = list.length - items.length;
    return `
      <div class="no-break" style="margin-bottom:14px">
        <div style="font-size:9.5px;font-weight:700;color:${NAVY};margin-bottom:6px;text-transform:uppercase;letter-spacing:0.6px">${title} <span style="color:#9ca3af;font-weight:500">(${list.length})</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${items.map((p: any) => `
            <div style="aspect-ratio:4/3;background:#f3f4f6;border:1px solid ${NAVY}1a;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center">
              <img src="${p.url}" style="width:100%;height:100%;object-fit:cover" crossOrigin="anonymous"/>
            </div>`).join('')}
        </div>
        ${more > 0 ? `<p style="font-size:8px;color:#6b7280;font-style:italic;margin:4px 0 0;text-align:right">+ ${more} photo(s) supplémentaire(s) en application</p>` : ''}
      </div>`;
  };

  const sigBox = (url: string | null, who: string) => `
    <div style="flex:1">
      <div style="font-size:8.5px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">${who}</div>
      <div style="border:1.5px solid ${url ? NAVY + '30' : '#d1d5db'};border-style:${url ? 'solid' : 'dashed'};border-radius:8px;height:80px;display:flex;align-items:center;justify-content:center;padding:6px;background:${url ? '#fff' : '#fafafa'}">
        ${url ? `<img src="${url}" style="max-height:68px;max-width:100%;object-fit:contain" crossOrigin="anonymous"/>` : `<span style="color:#9ca3af;font-size:9px;font-style:italic">Non signé</span>`}
      </div>
      <div style="font-size:8px;color:#6b7280;margin-top:4px;text-align:center">Signé le ${dateFmt}</div>
    </div>`;

  // === FULL HTML DOCUMENT ===
  const html = `
<style>
  .no-break { page-break-inside: avoid; }
  .page-break { page-break-after: always; }
</style>

<!-- HEADER STRIP -->
<div style="background:linear-gradient(135deg, ${NAVY} 0%, ${lighten(NAVY, 30)} 100%);color:${htc};padding:24px 32px;display:flex;align-items:center;justify-content:space-between">
  <div style="display:flex;align-items:center;gap:14px">
    ${co.logo_url ? `<div style="width:52px;height:52px;background:#fff;border-radius:10px;padding:6px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15)"><img src="${co.logo_url}" style="max-width:100%;max-height:100%;object-fit:contain" crossOrigin="anonymous"/></div>` : ''}
    <div>
      <div style="font-size:16px;font-weight:700;letter-spacing:0.3px;line-height:1.2">${companyName}</div>
      ${addr ? `<div style="font-size:9px;opacity:0.85;margin-top:3px">${addr}</div>` : ''}
      ${phone ? `<div style="font-size:9px;opacity:0.85">${phone}</div>` : ''}
    </div>
  </div>
  <div style="text-align:right">
    <div style="display:inline-block;padding:4px 10px;background:${GOLD};color:${NAVY};border-radius:20px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${isExit ? 'SORTIE' : 'ENTRÉE'}</div>
    <div style="font-size:9px;opacity:0.85">Réf. ${refN}</div>
  </div>
</div>

<!-- TITLE -->
<div style="padding:22px 32px 8px">
  <h1 style="margin:0;font-size:24px;font-weight:800;color:${NAVY};letter-spacing:-0.5px;line-height:1.1">${label}</h1>
  <p style="margin:6px 0 0;font-size:11px;color:#6b7280">${dateFmt}</p>
</div>

<div style="padding:0 32px">

  ${sectionTitle('Informations Voyageur')}
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:4px">
    ${infoCard('Nom complet', inspection.guest_name || '—')}
    ${infoCard('Nombre d\'occupants', inspection.occupants_count ? String(inspection.occupants_count) : '—')}
    ${infoCard('Email', guestEmail || '—')}
    ${infoCard('Téléphone', guestPhone || '—')}
    ${infoCard('Date d\'arrivée', checkIn)}
    ${infoCard('Date de départ', checkOut)}
  </div>

  ${sectionTitle('Logement')}
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px">
    ${infoCard('Bien', inspection.property?.name || '—')}
    ${infoCard('Clés remises', keys ? `${keys}` : '—')}
  </div>
  <div style="margin-top:8px">
    ${infoCard('Adresse complète', inspection.property?.address || '—')}
  </div>

  ${sectionTitle('Vérifications')}
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">
    ${checklist.map(checkRow).join('')}
  </div>

  ${meters.length > 0 ? `
  ${sectionTitle('Relevés Compteurs')}
  <div style="display:grid;grid-template-columns:repeat(${meters.length},1fr);gap:8px">
    ${meters.map(m => `
      <div style="border:1.5px solid ${NAVY}15;border-radius:8px;padding:12px;text-align:center;background:#fff">
        <div style="font-size:8.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;font-weight:600">${m.label}</div>
        <div style="font-size:18px;font-weight:700;color:${NAVY};margin-top:4px;font-variant-numeric:tabular-nums">${m.value}</div>
      </div>
    `).join('')}
  </div>` : ''}

  ${inspection.cleaner_name ? `
  ${sectionTitle('Préparation')}
  <div style="background:${SOFT};border-left:3px solid ${GOLD};padding:10px 14px;border-radius:0 6px 6px 0">
    <div style="font-size:8.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;font-weight:600">Ménage effectué par</div>
    <div style="font-size:11px;color:${NAVY};font-weight:600;margin-top:2px">${inspection.cleaner_name}</div>
  </div>` : ''}

  ${inspection.general_comment ? `
  ${sectionTitle('Observations Générales')}
  <div class="no-break" style="background:${SOFT};border:1px solid ${NAVY}10;border-radius:8px;padding:12px 14px">
    <p style="margin:0;font-size:10px;color:#1a1a1a;line-height:1.6;white-space:pre-wrap">${inspection.general_comment}</p>
  </div>` : ''}

  ${inspection.damage_notes ? `
  ${sectionTitle('⚠ Dégâts & Anomalies')}
  <div class="no-break" style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:8px;padding:12px 14px">
    <p style="margin:0;font-size:10px;color:#991b1b;line-height:1.6;font-weight:500;white-space:pre-wrap">${inspection.damage_notes}</p>
  </div>` : ''}

  ${(cleaningPhotos.length + meterPhotos.length + exitPhotos.length) > 0 ? `
  ${sectionTitle('Reportage Photographique')}
  ${photoGrid(cleaningPhotos, 'Photos de référence')}
  ${photoGrid(meterPhotos, 'Compteurs')}
  ${photoGrid(exitPhotos, 'Photos de sortie')}
  ` : ''}

  ${sectionTitle('Signatures')}
  <div class="no-break" style="display:flex;gap:24px;margin-bottom:8px">
    ${sigBox(concSig, 'Conciergerie')}
    ${sigBox(inspection.guest_signature_url, 'Voyageur')}
  </div>

</div>

<!-- LEGAL FOOTER -->
<div style="margin-top:24px;border-top:2px solid ${GOLD};background:${LIGHT};padding:14px 32px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
    <div style="flex:1">
      <div style="font-size:8px;color:${NAVY};font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px">Mentions Légales</div>
      <p style="margin:0;font-size:7.5px;color:#4b5563;line-height:1.5">
        Le présent état des lieux a été réalisé contradictoirement entre les parties. Il fait foi en cas de litige.
        ${vat ? `TVA : ${vat}.` : ''} ${legalFooter}
        Conformément au RGPD, les données personnelles sont conservées le temps légal de la prestation.
      </p>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-size:7.5px;color:${NAVY};font-weight:600">${companyName}</div>
      ${phone ? `<div style="font-size:7px;color:#6b7280">${phone}</div>` : ''}
      <div style="font-size:7px;color:#6b7280;margin-top:4px">Document généré le ${generatedAt}</div>
      <div style="font-size:7px;color:${GOLD};font-weight:600;margin-top:2px">Powered by MyWelkom</div>
    </div>
  </div>
</div>
`;

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
          background: '#ffffff',
          color: '#1a1a1a',
          boxSizing: 'border-box',
          margin: '0 auto',
          fontSize: '10px',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
