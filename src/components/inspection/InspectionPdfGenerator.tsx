import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import type { Inspection } from '@/hooks/useInspections';

interface InspectionPdfGeneratorProps {
  inspection: Inspection;
}

export function InspectionPdfGenerator({ inspection }: InspectionPdfGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const { settings } = useFinancialSettings();

  const primaryColor = (settings as any)?.invoice_primary_color || '#061452';
  const accentColor = (settings as any)?.invoice_accent_color || '#C4A45B';
  const logoUrl = settings?.logo_url || null;
  const companyName = settings?.company_name || '';
  const defaultSignatureUrl = (settings as any)?.default_signature_url || null;

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      if (!element) return;

      element.style.display = 'block';

      await html2pdf()
        .set({
          margin: [8, 10, 14, 10],
          filename: `etat-des-lieux-${inspection.inspection_date}.pdf`,
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

  const cleaningPhotos = inspection.cleaning_photos_json || [];
  const exitPhotos = inspection.exit_photos_json || [];
  const meterPhotos = (inspection as any).meter_photos_json || [];
  const keysHandedOver = (inspection as any).keys_handed_over;
  const conciergeSignature = inspection.concierge_signature_url || defaultSignatureUrl;

  const dateFormatted = new Date(inspection.inspection_date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const typeLabel = inspection.inspection_type === 'exit' ? "État des lieux de sortie" : "État des lieux d'entrée";

  const sectionTitle = (text: string) => `
    <div style="display:flex;align-items:center;gap:8px;margin:20px 0 10px 0;">
      <div style="width:3px;height:18px;background:${accentColor};border-radius:2px;"></div>
      <h3 style="font-size:13px;font-weight:700;color:${primaryColor};text-transform:uppercase;letter-spacing:0.5px;margin:0;">${text}</h3>
    </div>
  `;

  const infoRow = (label: string, value: string | number | null | undefined) => `
    <tr>
      <td style="padding:7px 10px;font-weight:600;font-size:12px;color:${primaryColor};background:#f8f9fb;width:38%;border-bottom:1px solid #eef0f3;">${label}</td>
      <td style="padding:7px 10px;font-size:12px;color:#374151;border-bottom:1px solid #eef0f3;">${value || '—'}</td>
    </tr>
  `;

  const photoGrid = (photos: any[], maxCount: number) => {
    if (!photos.length) return '';
    return `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
        ${photos.slice(0, maxCount).map((p: any) => `
          <img src="${p.url}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;border:1px solid #eef0f3;" crossOrigin="anonymous" />
        `).join('')}
      </div>
    `;
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={generatePdf} disabled={generating} className="gap-1.5">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        PDF
      </Button>

      {/* Hidden branded print layout */}
      <div
        ref={printRef}
        style={{ display: 'none', fontFamily: 'Inter, Helvetica, Arial, sans-serif', color: '#1a1a1a', padding: '0' }}
        dangerouslySetInnerHTML={{ __html: `
          <!-- HEADER -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0 14px 0;border-bottom:3px solid ${primaryColor};">
            <div style="flex-shrink:0;">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="Logo" style="max-height:52px;max-width:160px;object-fit:contain;" crossOrigin="anonymous" />`
                : (companyName
                  ? `<div style="font-size:16px;font-weight:800;color:${primaryColor};letter-spacing:0.5px;">${companyName}</div>`
                  : '')
              }
            </div>
            <div style="text-align:right;">
              <h1 style="font-size:18px;font-weight:800;color:${primaryColor};margin:0;letter-spacing:0.3px;">
                ${typeLabel}
              </h1>
              <p style="font-size:11px;color:#6b7280;margin:4px 0 0 0;text-transform:capitalize;">
                ${dateFormatted}
              </p>
            </div>
          </div>
          <div style="height:2px;background:linear-gradient(90deg,${accentColor},transparent);margin-bottom:18px;"></div>

          <!-- PROPERTY INFO -->
          ${sectionTitle('Informations du logement')}
          <table style="width:100%;border-collapse:collapse;border-radius:6px;overflow:hidden;border:1px solid #eef0f3;">
            <tbody>
              ${infoRow('Bien', inspection.property?.name)}
              ${infoRow('Adresse', inspection.property?.address)}
              ${infoRow('Voyageur', inspection.guest_name)}
              ${infoRow('Nombre d\'occupants', inspection.occupants_count)}
              ${keysHandedOver ? infoRow('Clés remises', keysHandedOver) : ''}
              ${infoRow('Ménage effectué par', inspection.cleaner_name)}
            </tbody>
          </table>

          <!-- OBSERVATIONS -->
          ${inspection.general_comment ? `
            ${sectionTitle('Observations')}
            <div style="font-size:12px;white-space:pre-wrap;background:#f8f9fb;padding:10px 12px;border-radius:6px;border:1px solid #eef0f3;color:#374151;line-height:1.5;">
              ${inspection.general_comment}
            </div>
          ` : ''}

          <!-- DAMAGES -->
          ${inspection.damage_notes ? `
            ${sectionTitle('Dégâts / Anomalies')}
            <div style="font-size:12px;white-space:pre-wrap;background:#fef2f2;padding:10px 12px;border-radius:6px;border:1px solid #fecaca;color:#991b1b;line-height:1.5;">
              ${inspection.damage_notes}
            </div>
          ` : ''}

          <!-- CLEANING PHOTOS -->
          ${cleaningPhotos.length > 0 ? `
            ${sectionTitle('Photos du dernier ménage')}
            ${photoGrid(cleaningPhotos, 9)}
          ` : ''}

          <!-- METER PHOTOS -->
          ${meterPhotos.length > 0 ? `
            ${sectionTitle('Photos des compteurs')}
            ${photoGrid(meterPhotos, 6)}
          ` : ''}

          <!-- EXIT / ADDITIONAL PHOTOS -->
          ${exitPhotos.length > 0 ? `
            ${sectionTitle('Photos supplémentaires')}
            ${photoGrid(exitPhotos, 9)}
          ` : ''}

          <!-- SIGNATURES -->
          <div style="margin-top:30px;display:flex;gap:40px;page-break-inside:avoid;">
            <div style="flex:1;">
              <p style="font-size:11px;font-weight:700;color:${primaryColor};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Signature concierge</p>
              ${conciergeSignature
                ? `<img src="${conciergeSignature}" alt="Signature concierge" style="max-height:70px;border:1px solid #eef0f3;border-radius:4px;padding:4px;" crossOrigin="anonymous" />`
                : `<div style="height:70px;border:1px dashed #d1d5db;border-radius:4px;"></div>`
              }
            </div>
            <div style="flex:1;">
              <p style="font-size:11px;font-weight:700;color:${primaryColor};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Signature client</p>
              ${inspection.guest_signature_url
                ? `<img src="${inspection.guest_signature_url}" alt="Signature client" style="max-height:70px;border:1px solid #eef0f3;border-radius:4px;padding:4px;" crossOrigin="anonymous" />`
                : `<div style="height:70px;border:1px dashed #d1d5db;border-radius:4px;"></div>`
              }
            </div>
          </div>

          <!-- FOOTER -->
          <div style="margin-top:30px;padding-top:10px;border-top:2px solid ${accentColor};display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="font-size:9px;color:#9ca3af;margin:0;">Document généré par <strong style="color:${primaryColor};">MyWelkom</strong></p>
              ${companyName ? `<p style="font-size:9px;color:#9ca3af;margin:2px 0 0 0;">Conciergerie : ${companyName}</p>` : ''}
            </div>
            <p style="font-size:9px;color:#9ca3af;margin:0;">
              ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        ` }}
      />
    </>
  );
}
