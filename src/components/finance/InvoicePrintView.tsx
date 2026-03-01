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

export function InvoicePrintView({ invoice, items, financialSettings }: Props) {
  const co = financialSettings || invoice.company_snapshot || {};
  const ow = invoice.owner_snapshot || invoice.owner || {};
  const totalHT = items.reduce((s, item) => s + Number(item.total || 0), 0);
  const issueDate = format(new Date(invoice.issue_date || invoice.invoice_date), "dd/MM/yyyy");

  // Colors
  const NAVY = "#061452";
  const GOLD = "#C4A45B";
  const GOLD_LIGHT = "#d4bb7a";
  const GRAY_STRIP = "#eef0f7";

  return (
    <div id="invoice-print" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", width: 794, minHeight: 1123, margin: "0 auto", background: "#fff", color: "#1a1a1a", position: "relative", overflow: "hidden" }}>
      {/* Google Font import for Cinzel (serif display) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* ═══════════ 1) TOP HEADER BAND ═══════════ */}
      <div style={{
        backgroundColor: NAVY,
        color: "#fff",
        display: "flex",
        alignItems: "stretch",
        minHeight: 130,
      }}>
        {/* Left: Issuer */}
        <div style={{ flex: 1, padding: "28px 36px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{
            fontFamily: "'Cinzel', 'Georgia', serif",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            margin: 0,
            paddingBottom: 6,
            borderBottom: `2px solid ${GOLD}`,
            display: "inline-block",
          }}>
            {co.company_name || "MA CONCIERGERIE"}
          </h2>
          <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.7, opacity: 0.88 }}>
            {co.address || ""}
            {co.org_postal_code || co.org_city ? (
              <><br />{co.org_postal_code} {co.org_city}</>
            ) : null}
          </p>
          {co.org_phone && (
            <p style={{ margin: "3px 0 0", fontSize: 12, opacity: 0.88 }}>{co.org_phone}</p>
          )}
        </div>

        {/* Center: Key icon */}
        <div style={{ width: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity={0.7}>
            <circle cx="8" cy="15" r="5" />
            <path d="M12 12l7-7" />
            <path d="M19 5l-2.5 2.5" />
            <path d="M16.5 7.5L19 10" />
          </svg>
        </div>

        {/* Right: Client/Owner */}
        <div style={{ flex: 1, padding: "28px 36px", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "right" }}>
          <h2 style={{
            fontFamily: "'Cinzel', 'Georgia', serif",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            margin: 0,
            paddingBottom: 6,
            borderBottom: `2px solid ${GOLD}`,
            display: "inline-block",
            marginLeft: "auto",
          }}>
            {ow.first_name} {ow.last_name}
          </h2>
          {(ow.billing_street || ow.billing_postal_code || ow.billing_city) && (
            <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.7, opacity: 0.88 }}>
              {ow.billing_street && <>{ow.billing_street}<br /></>}
              {ow.billing_postal_code} {ow.billing_city}
            </p>
          )}
          {ow.phone && (
            <p style={{ margin: "3px 0 0", fontSize: 12, opacity: 0.88 }}>{ow.phone}</p>
          )}
        </div>
      </div>

      {/* ═══════════ 2) INVOICE TITLE BLOCK ═══════════ */}
      <div style={{ padding: "36px 40px 20px 40px", display: "flex" }}>
        {/* Red vertical accent line */}
        <div style={{ width: 4, backgroundColor: "#c0392b", borderRadius: 2, marginRight: 20, minHeight: 60 }} />
        <div>
          <h1 style={{
            fontFamily: "'Cinzel', 'Georgia', serif",
            fontSize: 28,
            fontWeight: 700,
            color: NAVY,
            textTransform: "uppercase",
            letterSpacing: 2,
            margin: 0,
          }}>
            Facture N° {invoice.invoice_number}
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#555" }}>
            Date : {issueDate}
          </p>
        </div>
      </div>

      {/* ═══════════ 3) ITEMS TABLE ═══════════ */}
      <div style={{ padding: "16px 40px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: `2px solid ${NAVY}` }}>
          <thead>
            <tr>
              <th style={{
                backgroundColor: NAVY,
                color: "#fff",
                fontFamily: "'Cinzel', 'Georgia', serif",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1,
                textAlign: "left",
                padding: "14px 18px",
                borderRight: `1px solid rgba(255,255,255,0.2)`,
              }}>
                Désignation
              </th>
              <th style={{
                backgroundColor: NAVY,
                color: "#fff",
                fontFamily: "'Cinzel', 'Georgia', serif",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1,
                textAlign: "center",
                padding: "14px 14px",
                width: 100,
                borderRight: `1px solid rgba(255,255,255,0.2)`,
              }}>
                Quantité
              </th>
              <th style={{
                backgroundColor: NAVY,
                color: "#fff",
                fontFamily: "'Cinzel', 'Georgia', serif",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1,
                textAlign: "right",
                padding: "14px 18px",
                width: 130,
                borderRight: `1px solid rgba(255,255,255,0.2)`,
              }}>
                Prix unitaire
              </th>
              <th style={{
                backgroundColor: NAVY,
                color: "#fff",
                fontFamily: "'Cinzel', 'Georgia', serif",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1,
                textAlign: "right",
                padding: "14px 18px",
                width: 110,
              }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id || i}>
                <td style={{
                  padding: "14px 18px",
                  fontSize: 13,
                  lineHeight: 1.5,
                  borderBottom: `1px solid ${NAVY}22`,
                  borderRight: `1px solid ${NAVY}22`,
                  whiteSpace: "pre-wrap",
                }}>
                  {item.description}
                </td>
                <td style={{
                  padding: "14px 14px",
                  fontSize: 13,
                  textAlign: "center",
                  borderBottom: `1px solid ${NAVY}22`,
                  borderRight: `1px solid ${NAVY}22`,
                }}>
                  {Number(item.quantity)}
                </td>
                <td style={{
                  padding: "14px 18px",
                  fontSize: 13,
                  textAlign: "right",
                  borderBottom: `1px solid ${NAVY}22`,
                  borderRight: `1px solid ${NAVY}22`,
                }}>
                  {fmtEUR(Number(item.unit_price))}
                </td>
                <td style={{
                  padding: "14px 18px",
                  fontSize: 14,
                  textAlign: "right",
                  fontWeight: 700,
                  borderBottom: `1px solid ${NAVY}22`,
                }}>
                  {fmtEUR(Number(item.total))}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "28px 18px", textAlign: "center", color: "#999", fontSize: 13 }}>
                  Aucune ligne
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════ 4) TOTALS BLOCK ═══════════ */}
      <div style={{ padding: "0 40px 8px" }}>
        <div style={{ border: `2px solid ${NAVY}`, borderTop: "none" }}>
          {/* Total HT */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: `1px solid ${NAVY}22`,
          }}>
            <span style={{ fontSize: 14, marginRight: 24 }}>Total HT :</span>
            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 110, textAlign: "right" }}>{fmtEUR(totalHT)}</span>
          </div>

          {/* VAT mention + Total TTC on gray-blue strip */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            backgroundColor: GRAY_STRIP,
          }}>
            <span style={{ fontSize: 12, color: NAVY, fontStyle: "italic", opacity: 0.85 }}>
              TVA non applicable - article 293 B du CGI.
            </span>
            <span style={{
              fontFamily: "'Cinzel', 'Georgia', serif",
              fontSize: 17,
              fontWeight: 700,
              color: NAVY,
              letterSpacing: 1,
            }}>
              Total TTC : {fmtEUR(totalHT)}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════ 5) PAYMENT TERMS BLOCK ═══════════ */}
      <div style={{ padding: "28px 40px 20px" }}>
        <h3 style={{
          fontFamily: "'Cinzel', 'Georgia', serif",
          fontSize: 18,
          fontWeight: 700,
          color: NAVY,
          textTransform: "uppercase",
          letterSpacing: 2,
          margin: 0,
          paddingBottom: 10,
          borderBottom: `2px solid ${GOLD}`,
        }}>
          Modalités de paiement
        </h3>

        <div style={{ marginTop: 16, fontSize: 13, lineHeight: 2 }}>
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

        {/* Gold separator */}
        <div style={{ height: 1, backgroundColor: GOLD_LIGHT, margin: "18px 0" }} />

        {/* Due days */}
        <p style={{
          display: "inline-block",
          fontSize: 13,
          fontWeight: 600,
          color: NAVY,
          padding: "6px 16px",
          border: `1.5px solid ${NAVY}`,
          borderRadius: 4,
          margin: 0,
        }}>
          Délai de paiement : {co.default_due_days || 7} jours
        </p>
      </div>

      {/* Legal footer */}
      {co.legal_footer && (
        <div style={{ padding: "12px 40px 20px", borderTop: `1px solid #e8e8e8`, marginTop: 16 }}>
          <p style={{ fontSize: 10, color: "#999", textAlign: "center", margin: 0 }}>
            {co.legal_footer}
          </p>
        </div>
      )}
    </div>
  );
}
