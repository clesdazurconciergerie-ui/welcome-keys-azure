import { format } from "date-fns";
import type { Invoice, InvoiceItem } from "@/hooks/useInvoices";

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
  financialSettings?: any;
}

function fmtEUR(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
}

/* ────────────────────────────────────────────
   Pixel-accurate A4 invoice (210 × 297 mm)
   ──────────────────────────────────────────── */
export function InvoicePrintView({ invoice, items, financialSettings }: Props) {
  const co = financialSettings || invoice.company_snapshot || {};
  const ow = invoice.owner_snapshot || invoice.owner || {};
  const totalHT = items.reduce((s, item) => s + Number(item.total || 0), 0);
  const issueDate = format(new Date(invoice.issue_date || invoice.invoice_date), "dd/MM/yyyy");

  const NAVY = "#061452";
  const GOLD = "#C4A45B";
  const GOLD_LIGHT = "#d4bb7a";
  const GRAY_STRIP = "#eef0f7";

  return (
    <div
      id="invoice-print"
      style={{
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        width: "210mm",
        height: "297mm",
        margin: "0 auto",
        background: "#fff",
        color: "#1a1a1a",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        /* reserve space so content never overlaps footer */
        paddingBottom: "28mm",
      }}
    >
      {/* ── Print & font styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; width: 210mm; height: 297mm; }
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            width: 210mm !important; height: 297mm !important;
            margin: 0 !important; padding-bottom: 28mm !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          @page { size: A4 portrait; margin: 0; }
          /* hide dialog UI */
          [role="dialog"], .no-print { display: none !important; }
        }
      `}</style>

      {/* ═══════ A) TOP NAVY BAND ═══════ */}
      <div style={{
        backgroundColor: NAVY,
        color: "#fff",
        display: "flex",
        alignItems: "stretch",
        minHeight: 110,
      }}>
        {/* Left — Issuer */}
        <div style={{ flex: 1, padding: "22px 30px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 2.5,
            textTransform: "uppercase",
            margin: 0,
            paddingBottom: 5,
            borderBottom: `2px solid ${GOLD}`,
            display: "inline-block",
          }}>
            {co.company_name || "MA CONCIERGERIE"}
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: 11, lineHeight: 1.6, opacity: 0.88 }}>
            {co.address || ""}
            {(co.org_postal_code || co.org_city) && <><br />{co.org_postal_code} {co.org_city}</>}
          </p>
          {co.org_phone && <p style={{ margin: "2px 0 0", fontSize: 11, opacity: 0.88 }}>{co.org_phone}</p>}
        </div>

        {/* Center — Key icon */}
        <div style={{ width: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity={0.7}>
            <circle cx="8" cy="15" r="5" />
            <path d="M12 12l7-7" />
            <path d="M19 5l-2.5 2.5" />
            <path d="M16.5 7.5L19 10" />
          </svg>
        </div>

        {/* Right — Owner / Client */}
        <div style={{ flex: 1, padding: "22px 30px", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "right" }}>
          <h2 style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            margin: 0,
            paddingBottom: 5,
            borderBottom: `2px solid ${GOLD}`,
            display: "inline-block",
            marginLeft: "auto",
          }}>
            {ow.first_name} {ow.last_name}
          </h2>
          {(ow.billing_street || ow.billing_postal_code || ow.billing_city) && (
            <p style={{ margin: "8px 0 0", fontSize: 11, lineHeight: 1.6, opacity: 0.88 }}>
              {ow.billing_street && <>{ow.billing_street}<br /></>}
              {ow.billing_postal_code} {ow.billing_city}
            </p>
          )}
          {ow.phone && <p style={{ margin: "2px 0 0", fontSize: 11, opacity: 0.88 }}>{ow.phone}</p>}
        </div>
      </div>

      {/* ═══════ B) INVOICE TITLE ═══════ */}
      <div style={{ padding: "28px 32px 14px", display: "flex" }}>
        <div style={{ width: 3, backgroundColor: "#c0392b", borderRadius: 2, marginRight: 16, minHeight: 48 }} />
        <div>
          <h1 style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 22,
            fontWeight: 700,
            color: NAVY,
            textTransform: "uppercase",
            letterSpacing: 2,
            margin: 0,
          }}>
            Facture N° {invoice.invoice_number}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#555" }}>Date : {issueDate}</p>
        </div>
      </div>

      {/* ═══════ C) ITEMS TABLE ═══════ */}
      <div style={{ padding: "10px 32px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: `2px solid ${NAVY}` }}>
          <thead>
            <tr>
              {["Désignation", "Quantité", "Prix unitaire", "Total"].map((h, i) => (
                <th key={h} style={{
                  backgroundColor: NAVY,
                  color: "#fff",
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1,
                  textAlign: i === 0 ? "left" : i === 1 ? "center" : "right",
                  padding: "10px 14px",
                  borderRight: i < 3 ? "1px solid rgba(255,255,255,0.2)" : "none",
                  ...(i === 1 ? { width: 80 } : i === 2 ? { width: 110 } : i === 3 ? { width: 100 } : {}),
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id || i}>
                <td style={{ padding: "10px 14px", fontSize: 11, lineHeight: 1.4, borderBottom: `1px solid ${NAVY}22`, borderRight: `1px solid ${NAVY}22`, whiteSpace: "pre-wrap" }}>
                  {item.description}
                </td>
                <td style={{ padding: "10px 10px", fontSize: 11, textAlign: "center", borderBottom: `1px solid ${NAVY}22`, borderRight: `1px solid ${NAVY}22` }}>
                  {Number(item.quantity)}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 11, textAlign: "right", borderBottom: `1px solid ${NAVY}22`, borderRight: `1px solid ${NAVY}22` }}>
                  {fmtEUR(Number(item.unit_price))}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 12, textAlign: "right", fontWeight: 700, borderBottom: `1px solid ${NAVY}22` }}>
                  {fmtEUR(Number(item.total))}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "20px 14px", textAlign: "center", color: "#999", fontSize: 11 }}>
                  Aucune ligne
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════ D) TOTALS ═══════ */}
      <div style={{ padding: "0 32px 6px" }}>
        <div style={{ border: `2px solid ${NAVY}`, borderTop: "none" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${NAVY}22` }}>
            <span style={{ fontSize: 12, marginRight: 20 }}>Total HT :</span>
            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 100, textAlign: "right" }}>{fmtEUR(totalHT)}</span>
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            backgroundColor: GRAY_STRIP,
          }}>
            <span style={{ fontSize: 10, color: NAVY, fontStyle: "italic", opacity: 0.85 }}>
              TVA non applicable - article 293 B du CGI.
            </span>
            <span style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: 14,
              fontWeight: 700,
              color: NAVY,
              letterSpacing: 1,
            }}>
              Total TTC : {fmtEUR(totalHT)}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════ E) PAYMENT SECTION ═══════ */}
      <div style={{ padding: "20px 32px 0" }}>
        <h3 style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 14,
          fontWeight: 700,
          color: NAVY,
          textTransform: "uppercase",
          letterSpacing: 2,
          margin: 0,
          paddingBottom: 8,
          borderBottom: `2px solid ${GOLD}`,
        }}>
          Modalités de paiement
        </h3>
        <div style={{ marginTop: 12, fontSize: 11, lineHeight: 1.9 }}>
          <p style={{ margin: 0 }}>Paiement par virement bancaire</p>
          {co.iban && (
            <p style={{ margin: 0 }}>
              IBAN : <span style={{ fontFamily: "'Courier New', monospace", letterSpacing: 1.5, fontWeight: 600 }}>{co.iban}</span>
            </p>
          )}
          {co.bic && (
            <p style={{ margin: 0 }}>
              BIC : <span style={{ fontFamily: "'Courier New', monospace", letterSpacing: 1.5, fontWeight: 600 }}>{co.bic}</span>
            </p>
          )}
        </div>
        <div style={{ height: 1, backgroundColor: GOLD_LIGHT, margin: "14px 0" }} />
        <p style={{ fontSize: 11, color: NAVY, margin: 0 }}>
          Délai de paiement : {co.default_due_days || 7} jours
        </p>
      </div>

      {/* ═══════ F) FOOTER — absolute bottom ═══════ */}
      {co.legal_footer && (
        <div style={{
          position: "absolute",
          bottom: "10mm",
          left: "15mm",
          right: "15mm",
          borderTop: `1px solid #ddd`,
          paddingTop: 6,
        }}>
          <p style={{ fontSize: 9, color: "#888", textAlign: "center", margin: 0, lineHeight: 1.5, whiteSpace: "pre-line" }}>
            {co.legal_footer}
          </p>
        </div>
      )}
    </div>
  );
}
