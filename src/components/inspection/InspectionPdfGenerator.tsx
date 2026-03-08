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

  const cleaningPhotos = (inspection.cleaning_photos_json || []).slice(0, 6);
  const exitPhotos = (inspection.exit_photos_json || []).slice(0, 6);
  const meterPhotos = ((inspection as any).meter_photos_json || []).slice(0, 6);
  const allPhotosCount = (inspection.cleaning_photos_json || []).length + (inspection.exit_photos_json || []).length + ((inspection as any).meter_photos_json || []).length;
  const displayedCount = cleaningPhotos.length + exitPhotos.length + meterPhotos.length;
  const extraPhotos = allPhotosCount - displayedCount;

  const keysHandedOver = (inspection as any).keys_handed_over;
  const conciergeSignature = inspection.concierge_signature_url || defaultSignatureUrl;

  const dateFormatted = new Date(inspection.inspection_date).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const typeLabel = inspection.inspection_type === 'exit' ? "État des lieux de sortie" : "État des lieux d'entrée";
  const year = new Date(inspection.inspection_date).getFullYear();
  const refNumber = `EDL-${year}-${inspection.id?.substring(0, 3).toUpperCase() || '001'}`;
  const addressLine = [co.address, [co.org_postal_code, co.org_city].filter(Boolean).join(' ')].filter(Boolean).join(' — ');

  // Decide how many photo rows to show — keep to max 2 rows (6 photos) per section, pick only sections with photos
  const photoSections: { title: string; photos: any[] }[] = [];
  if (cleaningPhotos.length) photoSections.push({ title: 'Photos du ménage', photos: cleaningPhotos });
  if (meterPhotos.length) photoSections.push({ title: 'Photos compteurs', photos: meterPhotos });
  if (exitPhotos.length) photoSections.push({ title: 'Photos complémentaires', photos: exitPhotos });

  // If total photos > 6, limit each section proportionally
  let totalAllowed = 6;
  const limitedSections = photoSections.map(s => {
    const take = Math.min(s.photos.length, totalAllowed);
    totalAllowed -= take;
    return { ...s, photos: s.photos.slice(0, take) };
  }).filter(s => s.photos.length > 0);

  return (
    <>
      <Button variant="outline" size="sm" onClick={generatePdf} disabled={generating} className="gap-1.5">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        PDF
      </Button>

      <div
        ref={printRef}
        style={{
          display: 'none',
          fontFamily: FONT,
          width: '210mm',
          height: '297mm',
          margin: '0 auto',
          background: '#fff',
          color: '#1a1a1a',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* ═══ HEADER — compact ═══ */}
        <div style={{
          backgroundColor: NAVY, color: headerTextColor,
          display: 'flex', alignItems: 'stretch', minHeight: 72, maxHeight: 80,
        }}>
          <div style={{ flex: 1, padding: '12px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{
              fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
              paddingBottom: 3, borderBottom: `2px solid ${GOLD}`, display: 'inline-block',
            }}>{companyName || 'MA CONCIERGERIE'}</div>
            {addressLine && (
              <p style={{ margin: '4px 0 0', fontSize: 9, lineHeight: 1.4, opacity: 0.85 }}>{addressLine}</p>
            )}
          </div>
          {co.logo_url && (
            <div style={{ width: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
              <img src={co.logo_url} alt="" style={{ maxHeight: 50, maxWidth: 60, objectFit: 'contain' }} crossOrigin="anonymous" />
            </div>
          )}
          <div style={{ flex: 1, padding: '12px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'right' }}>
            <div style={{
              fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
              paddingBottom: 3, borderBottom: `2px solid ${GOLD}`, display: 'inline-block', marginLeft: 'auto',
            }}>{inspection.guest_name || 'NOM VOYAGEUR'}</div>
            <p style={{ margin: '4px 0 0', fontSize: 9, opacity: 0.85 }}>{inspection.property?.name || ''}</p>
          </div>
        </div>

        {/* ═══ TITLE — compact ═══ */}
        <div style={{ padding: '14px 24px 8px', display: 'flex' }}>
          <div style={{ width: 3, backgroundColor: GOLD, borderRadius: 1, marginRight: 10, minHeight: 32 }} />
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>
              {typeLabel}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#555' }}>
              Réf : {refNumber} · Date : {dateFormatted}
            </p>
          </div>
        </div>

        {/* ═══ INFO TABLE — compact ═══ */}
        <div style={{ padding: '4px 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${NAVY}`, fontSize: 9.5 }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: NAVY, color: headerTextColor, fontSize: 9, fontWeight: 600, letterSpacing: 0.6, textAlign: 'left', padding: '5px 10px', borderRight: `1px solid ${headerTextColor}33`, width: '38%' }}>Information</th>
                <th style={{ backgroundColor: NAVY, color: headerTextColor, fontSize: 9, fontWeight: 600, letterSpacing: 0.6, textAlign: 'left', padding: '5px 10px' }}>Détail</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Bien', inspection.property?.name],
                ['Adresse', inspection.property?.address],
                ['Voyageur', inspection.guest_name],
                ['Occupants', inspection.occupants_count ? String(inspection.occupants_count) : null],
                ...(keysHandedOver ? [['Clés remises', String(keysHandedOver)]] : []),
                ['Ménage par', inspection.cleaner_name],
              ].map(([label, value], i) => (
                <tr key={i}>
                  <td style={{ padding: '4px 10px', fontWeight: 600, borderBottom: `1px solid ${NAVY}15`, borderRight: `1px solid ${NAVY}15` }}>{label}</td>
                  <td style={{ padding: '4px 10px', borderBottom: `1px solid ${NAVY}15` }}>{value || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═══ OBSERVATIONS — compact ═══ */}
        {inspection.general_comment && (
          <div style={{ padding: '8px 24px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 4, borderBottom: `1.5px solid ${GOLD}` }}>
              Observations
            </div>
            <p style={{ marginTop: 4, fontSize: 9, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{inspection.general_comment}</p>
          </div>
        )}

        {inspection.damage_notes && (
          <div style={{ padding: '8px 24px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 4, borderBottom: '1.5px solid #dc2626' }}>
              Dégâts / Anomalies
            </div>
            <p style={{ marginTop: 4, fontSize: 9, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: '#fef2f2', padding: '6px 8px', borderRadius: 3, border: '1px solid #fecaca' }}>{inspection.damage_notes}</p>
          </div>
        )}

        {/* ═══ PHOTOS — thumbnail grid, max 6 total ═══ */}
        {limitedSections.length > 0 && (
          <div style={{ padding: '8px 24px 0' }}>
            {limitedSections.map((section, si) => (
              <div key={si} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `1.5px solid ${GOLD}`, marginBottom: 5 }}>
                  {section.title}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                  {section.photos.map((p: any, i: number) => (
                    <img key={i} src={p.url} alt="" style={{
                      width: '100%', height: 52, objectFit: 'cover',
                      borderRadius: 3, border: `1px solid ${NAVY}1a`,
                    }} crossOrigin="anonymous" />
                  ))}
                </div>
              </div>
            ))}
            {extraPhotos > 0 && (
              <p style={{ fontSize: 8, color: '#6b7280', fontStyle: 'italic', margin: '2px 0 0' }}>
                + {extraPhotos} photo{extraPhotos > 1 ? 's' : ''} supplémentaire{extraPhotos > 1 ? 's' : ''} disponible{extraPhotos > 1 ? 's' : ''} dans l'application
              </p>
            )}
          </div>
        )}

        {/* ═══ SIGNATURES ═══ */}
        <div style={{ padding: '12px 24px 0', display: 'flex', gap: 30, pageBreakInside: 'avoid' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 4, borderBottom: `1.5px solid ${GOLD}`, marginBottom: 6 }}>
              Signature conciergerie
            </div>
            {conciergeSignature ? (
              <div style={{ border: `1px solid ${NAVY}1a`, borderRadius: 3, padding: 4, height: 55, display: 'flex', alignItems: 'center' }}>
                <img src={conciergeSignature} alt="Signature" style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
              </div>
            ) : (
              <div style={{ height: 55, border: '1px dashed #d1d5db', borderRadius: 3 }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 4, borderBottom: `1.5px solid ${GOLD}`, marginBottom: 6 }}>
              Signature client
            </div>
            {inspection.guest_signature_url ? (
              <div style={{ border: `1px solid ${NAVY}1a`, borderRadius: 3, padding: 4, height: 55, display: 'flex', alignItems: 'center' }}>
                <img src={inspection.guest_signature_url} alt="Signature" style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
              </div>
            ) : (
              <div style={{ height: 55, border: '1px dashed #d1d5db', borderRadius: 3 }} />
            )}
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '7px 24px', borderTop: `1.5px solid ${GOLD}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: GRAY_STRIP,
        }}>
          <div style={{ fontSize: 8, color: NAVY, opacity: 0.7 }}>
            Document généré via <strong>MyWelkom</strong>{companyName && ` · Conciergerie : ${companyName}`}
          </div>
          <div style={{ fontSize: 8, color: NAVY, opacity: 0.7 }}>
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </>
  );
}
