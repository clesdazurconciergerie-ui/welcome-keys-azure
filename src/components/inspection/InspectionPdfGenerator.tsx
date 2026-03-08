import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { Inspection } from '@/hooks/useInspections';

interface InspectionPdfGeneratorProps {
  inspection: Inspection;
}

export function InspectionPdfGenerator({ inspection }: InspectionPdfGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      if (!element) return;

      element.style.display = 'block';

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `etat-des-lieux-${inspection.inspection_type}-${inspection.inspection_date}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
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

  const typeLabel = inspection.inspection_type === 'entry' ? "d'entrée" : "de sortie";
  const photos = inspection.inspection_type === 'entry'
    ? inspection.cleaning_photos_json || []
    : inspection.exit_photos_json || [];

  return (
    <>
      <Button variant="outline" size="sm" onClick={generatePdf} disabled={generating} className="gap-1.5">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        PDF
      </Button>

      {/* Hidden print layout */}
      <div ref={printRef} style={{ display: 'none', fontFamily: 'Inter, sans-serif', color: '#1a1a1a', padding: '20px' }}>
        <div style={{ borderBottom: '3px solid #061452', paddingBottom: '12px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#061452', margin: 0 }}>
            État des lieux {typeLabel}
          </h1>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {new Date(inspection.inspection_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '6px 8px', fontWeight: 600, background: '#f3f4f6', width: '35%', border: '1px solid #e5e7eb' }}>Bien</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>{inspection.property?.name || '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', fontWeight: 600, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>Adresse</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>{inspection.property?.address || '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', fontWeight: 600, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>Client / Voyageur</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>{inspection.guest_name || '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', fontWeight: 600, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>Nombre d'occupants</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>{inspection.occupants_count || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* Meter readings */}
        {inspection.inspection_type === 'entry' && (
          <>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: '#061452' }}>Relevés de compteurs</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 8px', fontWeight: 600, background: '#f3f4f6', width: '35%', border: '1px solid #e5e7eb' }}>Électricité</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>{inspection.meter_electricity || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px', fontWeight: 600, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>Eau</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>{inspection.meter_water || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px', fontWeight: 600, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>Gaz</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>{inspection.meter_gas || '—'}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* Comments */}
        {inspection.general_comment && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: '#061452' }}>Observations</h3>
            <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap', background: '#f9fafb', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              {inspection.general_comment}
            </p>
          </div>
        )}

        {inspection.damage_notes && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: '#dc2626' }}>Dégâts / Problèmes</h3>
            <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap', background: '#fef2f2', padding: '10px', borderRadius: '6px', border: '1px solid #fecaca' }}>
              {inspection.damage_notes}
            </p>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: '#061452' }}>
              {inspection.inspection_type === 'entry' ? 'Photos ménage (état avant entrée)' : 'Photos de sortie'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {photos.slice(0, 9).map((p: any, i: number) => (
                <img
                  key={i}
                  src={p.url}
                  alt=""
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                  crossOrigin="anonymous"
                />
              ))}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ marginTop: '30px', display: 'flex', gap: '40px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Signature concierge</p>
            {inspection.concierge_signature_url ? (
              <img src={inspection.concierge_signature_url} alt="Signature" style={{ height: '60px', border: '1px solid #e5e7eb', borderRadius: '4px' }} crossOrigin="anonymous" />
            ) : (
              <div style={{ height: '60px', border: '1px dashed #d1d5db', borderRadius: '4px' }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Signature client</p>
            {inspection.guest_signature_url ? (
              <img src={inspection.guest_signature_url} alt="Signature" style={{ height: '60px', border: '1px solid #e5e7eb', borderRadius: '4px' }} crossOrigin="anonymous" />
            ) : (
              <div style={{ height: '60px', border: '1px dashed #d1d5db', borderRadius: '4px' }} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
