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
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
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
          image: { type: 'jpeg', quality: 0.95 },
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

  const cleaningPhotos = inspection.cleaning_photos_json || [];
  const exitPhotos = inspection.exit_photos_json || [];
  const meterPhotos = (inspection as any).meter_photos_json || [];
  const keysHandedOver = (inspection as any).keys_handed_over;
  const conciergeSignature = inspection.concierge_signature_url || defaultSignatureUrl;

  const dateFormatted = new Date(inspection.inspection_date).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const typeLabel = inspection.inspection_type === 'exit' ? "État des lieux de sortie" : "État des lieux d'entrée";

  // Build a reference number like EDL-2026-001
  const year = new Date(inspection.inspection_date).getFullYear();
  const refNumber = `EDL-${year}-${inspection.id?.substring(0, 3).toUpperCase() || '001'}`;

  const addressLine = [co.address, [co.org_postal_code, co.org_city].filter(Boolean).join(' ')].filter(Boolean).join(' — ');

  return (
    <>
      <Button variant="outline" size="sm" onClick={generatePdf} disabled={generating} className="gap-1.5">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        PDF
      </Button>

      {/* Hidden A4 print layout — mirrors invoice structure */}
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
          paddingBottom: '20mm',
        }}
      >
        {/* ═══ A) TOP BAND — same as invoice ═══ */}
        <div
          style={{
            backgroundColor: NAVY,
            color: headerTextColor,
            display: 'flex',
            alignItems: 'stretch',
            minHeight: 105,
          }}
        >
          {/* Left — Issuer */}
          <div style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{
              fontFamily: FONT, fontSize: 17, fontWeight: 700,
              letterSpacing: 2, textTransform: 'uppercase',
              paddingBottom: 4, borderBottom: `2px solid ${GOLD}`, display: 'inline-block',
            }}>
              {companyName || 'MA CONCIERGERIE'}
            </div>
            {addressLine && (
              <p style={{ margin: '7px 0 0', fontSize: 10.5, lineHeight: 1.55, opacity: 0.9, fontFamily: FONT }}>
                {addressLine}
              </p>
            )}
            {co.org_phone && (
              <p style={{ margin: '2px 0 0', fontSize: 10.5, opacity: 0.9, fontFamily: FONT }}>{co.org_phone}</p>
            )}
          </div>

          {/* Center — Logo */}
          {co.logo_url ? (
            <div style={{ width: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
              <img src={co.logo_url} alt="Logo" style={{ maxHeight: 70, maxWidth: 80, objectFit: 'contain' }} crossOrigin="anonymous" />
            </div>
          ) : (
            <div style={{ width: 20 }} />
          )}

          {/* Right — Property owner / guest */}
          <div style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'right' }}>
            <div style={{
              fontFamily: FONT, fontSize: 15, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase',
              paddingBottom: 4, borderBottom: `2px solid ${GOLD}`, display: 'inline-block', marginLeft: 'auto',
            }}>
              {inspection.guest_name || 'NOM VOYAGEUR'}
            </div>
            <p style={{ margin: '7px 0 0', fontSize: 10.5, lineHeight: 1.55, opacity: 0.9, fontFamily: FONT }}>
              {inspection.property?.name || ''}
            </p>
          </div>
        </div>

        {/* ═══ B) DOCUMENT TITLE — same layout as invoice ═══ */}
        <div style={{ padding: '24px 30px 12px', display: 'flex' }}>
          <div style={{ width: 3, backgroundColor: GOLD, borderRadius: 1, marginRight: 14, minHeight: 42 }} />
          <div>
            <h1 style={{
              fontFamily: FONT, fontSize: 20, fontWeight: 700,
              color: NAVY, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0,
            }}>
              {typeLabel}
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#555', fontFamily: FONT }}>
              Référence : {refNumber}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#555', fontFamily: FONT }}>
              Date : {dateFormatted}
            </p>
          </div>
        </div>

        {/* ═══ C) PROPERTY INFO — table style ═══ */}
        <div style={{ padding: '8px 30px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${NAVY}`, fontFamily: FONT }}>
            <thead>
              <tr>
                <th style={{
                  backgroundColor: NAVY, color: headerTextColor, fontFamily: FONT,
                  fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8,
                  textAlign: 'left', padding: '9px 12px', borderRight: `1px solid ${headerTextColor}33`, width: '40%',
                }}>Information</th>
                <th style={{
                  backgroundColor: NAVY, color: headerTextColor, fontFamily: FONT,
                  fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8,
                  textAlign: 'left', padding: '9px 12px',
                }}>Détail</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Bien', inspection.property?.name || '—'],
                ['Adresse', inspection.property?.address || '—'],
                ['Voyageur', inspection.guest_name || '—'],
                ['Nombre d\'occupants', inspection.occupants_count ? String(inspection.occupants_count) : '—'],
                ...(keysHandedOver ? [['Clés remises', String(keysHandedOver)]] : []),
                ['Ménage effectué par', inspection.cleaner_name || '—'],
              ].map(([label, value], i) => (
                <tr key={i}>
                  <td style={{
                    padding: '9px 12px', fontSize: 10.5, fontWeight: 600,
                    borderBottom: `1px solid ${NAVY}1a`, borderRight: `1px solid ${NAVY}1a`, fontFamily: FONT,
                  }}>{label}</td>
                  <td style={{
                    padding: '9px 12px', fontSize: 10.5,
                    borderBottom: `1px solid ${NAVY}1a`, fontFamily: FONT,
                  }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═══ D) OBSERVATIONS ═══ */}
        {inspection.general_comment && (
          <div style={{ padding: '18px 30px 0' }}>
            <div style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 700, color: NAVY,
              textTransform: 'uppercase', letterSpacing: 1.5, paddingBottom: 7,
              borderBottom: `2px solid ${GOLD}`,
            }}>Observations</div>
            <p style={{
              marginTop: 10, fontSize: 10.5, lineHeight: 1.7,
              whiteSpace: 'pre-wrap', fontFamily: FONT,
            }}>{inspection.general_comment}</p>
          </div>
        )}

        {/* ═══ E) DAMAGES ═══ */}
        {inspection.damage_notes && (
          <div style={{ padding: '18px 30px 0' }}>
            <div style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#dc2626',
              textTransform: 'uppercase', letterSpacing: 1.5, paddingBottom: 7,
              borderBottom: '2px solid #dc2626',
            }}>Dégâts / Anomalies</div>
            <p style={{
              marginTop: 10, fontSize: 10.5, lineHeight: 1.7,
              whiteSpace: 'pre-wrap', fontFamily: FONT,
              background: '#fef2f2', padding: '10px 12px', borderRadius: 4, border: '1px solid #fecaca',
            }}>{inspection.damage_notes}</p>
          </div>
        )}

        {/* ═══ F) PHOTO SECTIONS ═══ */}
        {cleaningPhotos.length > 0 && (
          <div style={{ padding: '18px 30px 0' }}>
            <div style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 700, color: NAVY,
              textTransform: 'uppercase', letterSpacing: 1.5, paddingBottom: 7,
              borderBottom: `2px solid ${GOLD}`,
            }}>Photos du dernier ménage</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
              {cleaningPhotos.slice(0, 9).map((p: any, i: number) => (
                <img key={i} src={p.url} alt="" style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  borderRadius: 4, border: `1px solid ${NAVY}1a`,
                }} crossOrigin="anonymous" />
              ))}
            </div>
          </div>
        )}

        {meterPhotos.length > 0 && (
          <div style={{ padding: '18px 30px 0' }}>
            <div style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 700, color: NAVY,
              textTransform: 'uppercase', letterSpacing: 1.5, paddingBottom: 7,
              borderBottom: `2px solid ${GOLD}`,
            }}>Photos des compteurs</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
              {meterPhotos.slice(0, 6).map((p: any, i: number) => (
                <img key={i} src={p.url} alt="" style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  borderRadius: 4, border: `1px solid ${NAVY}1a`,
                }} crossOrigin="anonymous" />
              ))}
            </div>
          </div>
        )}

        {exitPhotos.length > 0 && (
          <div style={{ padding: '18px 30px 0' }}>
            <div style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 700, color: NAVY,
              textTransform: 'uppercase', letterSpacing: 1.5, paddingBottom: 7,
              borderBottom: `2px solid ${GOLD}`,
            }}>Photos complémentaires</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
              {exitPhotos.slice(0, 9).map((p: any, i: number) => (
                <img key={i} src={p.url} alt="" style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  borderRadius: 4, border: `1px solid ${NAVY}1a`,
                }} crossOrigin="anonymous" />
              ))}
            </div>
          </div>
        )}

        {/* ═══ G) SIGNATURES ═══ */}
        <div style={{ padding: '28px 30px 0', display: 'flex', gap: 40 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 700, color: NAVY,
              textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 6,
              borderBottom: `2px solid ${GOLD}`, marginBottom: 10,
            }}>Signature conciergerie</div>
            {conciergeSignature ? (
              <div style={{ border: `1px solid ${NAVY}1a`, borderRadius: 4, padding: 6, minHeight: 70, display: 'flex', alignItems: 'center' }}>
                <img src={conciergeSignature} alt="Signature concierge" style={{ maxHeight: 65, maxWidth: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
              </div>
            ) : (
              <div style={{ height: 70, border: '1px dashed #d1d5db', borderRadius: 4 }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 700, color: NAVY,
              textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 6,
              borderBottom: `2px solid ${GOLD}`, marginBottom: 10,
            }}>Signature client</div>
            {inspection.guest_signature_url ? (
              <div style={{ border: `1px solid ${NAVY}1a`, borderRadius: 4, padding: 6, minHeight: 70, display: 'flex', alignItems: 'center' }}>
                <img src={inspection.guest_signature_url} alt="Signature client" style={{ maxHeight: 65, maxWidth: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
              </div>
            ) : (
              <div style={{ height: 70, border: '1px dashed #d1d5db', borderRadius: 4 }} />
            )}
          </div>
        </div>

        {/* ═══ H) FOOTER ═══ */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '10px 30px', borderTop: `2px solid ${GOLD}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: GRAY_STRIP,
        }}>
          <div style={{ fontFamily: FONT, fontSize: 9, color: NAVY, opacity: 0.7 }}>
            <span>Document généré via <strong>MyWelkom</strong></span>
            {companyName && <span> · Conciergerie : {companyName}</span>}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 9, color: NAVY, opacity: 0.7 }}>
            Date de génération : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </>
  );
}
