import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import type { Inspection } from '@/hooks/useInspections';

interface InspectionPdfGeneratorProps {
  inspection: Inspection;
}

const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

function contrastColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1a1a1a' : '#ffffff';
}

function lighten(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = Math.min(255, parseInt(c.substring(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(c.substring(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(c.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function InspectionPdfGenerator({ inspection }: InspectionPdfGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const { settings } = useFinancialSettings();

  const co = (settings as any) || {};
  const NAVY = co.invoice_primary_color || '#061452';
  const GOLD = co.invoice_accent_color || '#C4A45B';
  const GRAY_STRIP = lighten(NAVY, 210);
  const headerTextColor = co.invoice_text_color || contrastColor(NAVY);
  const defaultSignatureUrl = co.default_signature_url || null;
  const companyName = co.company_name || '';

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      if (!element) return;
      element.style.display = 'block';
      await html2pdf()
        .set({
          margin: 0,
          filename: `etat-des-lieux-${inspection.inspection_date}.pdf`,
          image: { type: 'jpeg', quality: 0.92 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
      element.style.display = 'none';
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Layout computation ───
  // A4 = 297mm. We use px at 96dpi where 210mm ≈ 794px, 297mm ≈ 1123px.
  // All heights below in px within the 1123px page.

  const HEADER_H = 68;   // navy band
  const TITLE_H = 38;    // title + ref
  const TABLE_H = 24 * 6; // ~6 rows × 24px each = 144, but compact = less
  const INFO_H = 110;    // compact table
  const SIG_H = 72;      // signature section
  const FOOTER_H = 28;   // footer bar
  const SECTION_TITLE_H = 20; // per photo section title

  const hasComment = !!inspection.general_comment;
  const hasDamage = !!inspection.damage_notes;
  const commentH = hasComment ? Math.min(40, 18 + (inspection.general_comment || '').length * 0.12) : 0;
  const damageH = hasDamage ? Math.min(35, 18 + (inspection.damage_notes || '').length * 0.12) : 0;

  const fixedH = HEADER_H + TITLE_H + INFO_H + commentH + damageH + SIG_H + FOOTER_H + 30; // 30px margins

  const availableForPhotos = Math.max(0, 1123 - fixedH);

  // Collect all photos
  const cleaningAll = inspection.cleaning_photos_json || [];
  const meterAll = (inspection as any).meter_photos_json || [];
  const exitAll = inspection.exit_photos_json || [];

  // Build flat list with section labels
  type PhotoEntry = { url: string; section: string };
  const allPhotos: PhotoEntry[] = [
    ...cleaningAll.map((p: any) => ({ url: p.url, section: 'Ménage' })),
    ...meterAll.map((p: any) => ({ url: p.url, section: 'Compteurs' })),
    ...exitAll.map((p: any) => ({ url: p.url, section: 'Complémentaires' })),
  ];

  // Determine how many photos fit.
  // Each row of 3 = thumbnailH + gap. Section titles add height.
  // We try different thumbnail heights: 44, 36, 28px
  let thumbH = 44;
  let maxPhotos = 0;
  let photoSectionH = 0;

  for (const tryH of [44, 36, 28]) {
    const rowH = tryH + 4; // thumbnail + gap
    // Estimate: 1 section title + rows
    const sectionCount = new Set(allPhotos.map(p => p.section)).size;
    const titleOverhead = sectionCount * SECTION_TITLE_H;
    const availRows = Math.floor((availableForPhotos - titleOverhead) / rowH);
    const fitPhotos = Math.max(0, availRows * 3);

    if (fitPhotos >= 3 || tryH === 28) {
      thumbH = tryH;
      maxPhotos = Math.min(allPhotos.length, fitPhotos, 9); // hard cap 9
      const usedRows = Math.ceil(maxPhotos / 3);
      photoSectionH = titleOverhead + usedRows * rowH;
      break;
    }
  }

  // If even 28px thumbnails don't fit any photos, show 0
  if (availableForPhotos < 50) {
    maxPhotos = 0;
    photoSectionH = 0;
  }

  const displayPhotos = allPhotos.slice(0, maxPhotos);
  const extraPhotos = allPhotos.length - displayPhotos.length;

  // Group displayed photos by section for rendering
  const groupedSections: { title: string; photos: string[] }[] = [];
  for (const p of displayPhotos) {
    const last = groupedSections[groupedSections.length - 1];
    if (last && last.title === p.section) {
      last.photos.push(p.url);
    } else {
      groupedSections.push({ title: p.section, photos: [p.url] });
    }
  }

  const keysHandedOver = (inspection as any).keys_handed_over;
  const conciergeSignature = inspection.concierge_signature_url || defaultSignatureUrl;
  const dateFormatted = new Date(inspection.inspection_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const typeLabel = inspection.inspection_type === 'exit' ? "État des lieux de sortie" : "État des lieux d'entrée";
  const year = new Date(inspection.inspection_date).getFullYear();
  const refNumber = `EDL-${year}-${inspection.id?.substring(0, 3).toUpperCase() || '001'}`;
  const addressLine = [co.address, [co.org_postal_code, co.org_city].filter(Boolean).join(' ')].filter(Boolean).join(' — ');

  return (
    <>
      <Button variant="outline" size="sm" onClick={generatePdf} disabled={generating} className="gap-1.5">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        PDF
      </Button>

      {/* ═══ SINGLE-PAGE A4 CONTAINER ═══ */}
      <div
        ref={printRef}
        style={{
          display: 'none',
          fontFamily: FONT,
          width: '210mm',
          minHeight: '297mm',
          maxHeight: '297mm',
          height: '297mm',
          margin: '0 auto',
          background: '#fff',
          color: '#1a1a1a',
          position: 'relative',
          overflow: 'hidden', // HARD clip — nothing escapes page 1
          boxSizing: 'border-box',
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div style={{
          backgroundColor: NAVY, color: headerTextColor,
          display: 'flex', alignItems: 'stretch', height: HEADER_H,
        }}>
          <div style={{ flex: 1, padding: '8px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', paddingBottom: 2, borderBottom: `2px solid ${GOLD}`, display: 'inline-block' }}>
              {companyName || 'MA CONCIERGERIE'}
            </div>
            {addressLine && <p style={{ margin: '3px 0 0', fontSize: 8.5, lineHeight: 1.3, opacity: 0.85 }}>{addressLine}</p>}
          </div>
          {co.logo_url && (
            <div style={{ width: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
              <img src={co.logo_url} alt="" style={{ maxHeight: 44, maxWidth: 52, objectFit: 'contain' }} crossOrigin="anonymous" />
            </div>
          )}
          <div style={{ flex: 1, padding: '8px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', paddingBottom: 2, borderBottom: `2px solid ${GOLD}`, display: 'inline-block', marginLeft: 'auto' }}>
              {inspection.guest_name || 'NOM VOYAGEUR'}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 8.5, opacity: 0.85 }}>{inspection.property?.name || ''}</p>
          </div>
        </div>

        {/* ═══ TITLE ═══ */}
        <div style={{ padding: '10px 20px 6px', display: 'flex' }}>
          <div style={{ width: 3, backgroundColor: GOLD, borderRadius: 1, marginRight: 8, minHeight: 24 }} />
          <div>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>{typeLabel}</h1>
            <p style={{ margin: '1px 0 0', fontSize: 9, color: '#555' }}>Réf : {refNumber} · Date : {dateFormatted}</p>
          </div>
        </div>

        {/* ═══ INFO TABLE ═══ */}
        <div style={{ padding: '2px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${NAVY}`, fontSize: 9 }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: NAVY, color: headerTextColor, fontSize: 8.5, fontWeight: 600, letterSpacing: 0.5, textAlign: 'left', padding: '4px 8px', borderRight: `1px solid ${headerTextColor}33`, width: '36%' }}>Information</th>
                <th style={{ backgroundColor: NAVY, color: headerTextColor, fontSize: 8.5, fontWeight: 600, letterSpacing: 0.5, textAlign: 'left', padding: '4px 8px' }}>Détail</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Bien', inspection.property?.name],
                ['Adresse', inspection.property?.address],
                ['Voyageur', inspection.guest_name],
                ['Occupants', inspection.occupants_count ? String(inspection.occupants_count) : null],
                ...(keysHandedOver ? [['Clés', String(keysHandedOver)]] : []),
                ['Ménage par', inspection.cleaner_name],
              ].map(([label, value], i) => (
                <tr key={i}>
                  <td style={{ padding: '3px 8px', fontWeight: 600, borderBottom: `1px solid ${NAVY}12`, borderRight: `1px solid ${NAVY}12` }}>{label}</td>
                  <td style={{ padding: '3px 8px', borderBottom: `1px solid ${NAVY}12` }}>{value || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═══ OBSERVATIONS ═══ */}
        {hasComment && (
          <div style={{ padding: '6px 20px 0' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `1.5px solid ${GOLD}` }}>Observations</div>
            <p style={{ marginTop: 3, fontSize: 8.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', maxHeight: 32, overflow: 'hidden' }}>{inspection.general_comment}</p>
          </div>
        )}
        {hasDamage && (
          <div style={{ padding: '6px 20px 0' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: '1.5px solid #dc2626' }}>Dégâts</div>
            <p style={{ marginTop: 3, fontSize: 8.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', background: '#fef2f2', padding: '4px 6px', borderRadius: 2, border: '1px solid #fecaca', maxHeight: 28, overflow: 'hidden' }}>{inspection.damage_notes}</p>
          </div>
        )}

        {/* ═══ PHOTOS — strictly bounded ═══ */}
        {groupedSections.length > 0 && (
          <div style={{ padding: '6px 20px 0', maxHeight: photoSectionH, overflow: 'hidden' }}>
            {groupedSections.map((section, si) => (
              <div key={si} style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: 0.6, paddingBottom: 2, borderBottom: `1.5px solid ${GOLD}`, marginBottom: 3 }}>
                  {section.title}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                  {section.photos.map((url, i) => (
                    <img key={i} src={url} alt="" style={{
                      width: '100%', height: thumbH, objectFit: 'cover',
                      borderRadius: 2, border: `1px solid ${NAVY}1a`,
                    }} crossOrigin="anonymous" />
                  ))}
                </div>
              </div>
            ))}
            {extraPhotos > 0 && (
              <p style={{ fontSize: 7.5, color: '#6b7280', fontStyle: 'italic', margin: '1px 0 0' }}>
                + {extraPhotos} photo{extraPhotos > 1 ? 's' : ''} supplémentaire{extraPhotos > 1 ? 's' : ''} dans l'application
              </p>
            )}
          </div>
        )}

        {/* ═══ SIGNATURES — always visible ═══ */}
        <div style={{ padding: '8px 20px 0', display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: 0.6, paddingBottom: 3, borderBottom: `1.5px solid ${GOLD}`, marginBottom: 4 }}>Signature conciergerie</div>
            {conciergeSignature ? (
              <div style={{ border: `1px solid ${NAVY}1a`, borderRadius: 2, padding: 3, height: 48, display: 'flex', alignItems: 'center' }}>
                <img src={conciergeSignature} alt="" style={{ maxHeight: 40, maxWidth: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
              </div>
            ) : (
              <div style={{ height: 48, border: '1px dashed #d1d5db', borderRadius: 2 }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: 0.6, paddingBottom: 3, borderBottom: `1.5px solid ${GOLD}`, marginBottom: 4 }}>Signature client</div>
            {inspection.guest_signature_url ? (
              <div style={{ border: `1px solid ${NAVY}1a`, borderRadius: 2, padding: 3, height: 48, display: 'flex', alignItems: 'center' }}>
                <img src={inspection.guest_signature_url} alt="" style={{ maxHeight: 40, maxWidth: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
              </div>
            ) : (
              <div style={{ height: 48, border: '1px dashed #d1d5db', borderRadius: 2 }} />
            )}
          </div>
        </div>

        {/* ═══ FOOTER — pinned to bottom ═══ */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '6px 20px', borderTop: `1.5px solid ${GOLD}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: GRAY_STRIP, height: FOOTER_H,
        }}>
          <div style={{ fontSize: 7.5, color: NAVY, opacity: 0.7 }}>
            Document généré via <strong>MyWelkom</strong>{companyName && ` · Conciergerie : ${companyName}`}
          </div>
          <div style={{ fontSize: 7.5, color: NAVY, opacity: 0.7 }}>
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </>
  );
}
