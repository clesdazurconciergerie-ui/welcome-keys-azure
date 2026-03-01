import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Invoice, InvoiceItem } from "@/hooks/useInvoices";
import { formatEUR } from "@/lib/finance-utils";

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
  financialSettings?: any;
}

export function InvoicePrintView({ invoice, items, financialSettings }: Props) {
  const company = financialSettings || invoice.company_snapshot || {};
  const owner = invoice.owner_snapshot || invoice.owner || {};

  const totalHT = items.reduce((s, item) => s + Number(item.total || 0), 0);

  return (
    <div className="print-invoice bg-white text-[#1a1a1a]" id="invoice-print" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", maxWidth: 800, margin: "0 auto" }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          @page { margin: 15mm; }
        }
      `}</style>

      {/* ═══ A) TOP HEADER BAR ═══ */}
      <div style={{ backgroundColor: "#061452", color: "#ffffff", padding: "24px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderRadius: "8px 8px 0 0" }}>
        {/* Left: Organization */}
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", fontVariant: "small-caps" }}>
            {company.company_name || company.org_name || "Ma Conciergerie"}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>
            {company.address || ""}
            {company.org_postal_code && company.org_city && (
              <><br />{company.org_postal_code} {company.org_city}</>
            )}
          </p>
          {company.org_phone && (
            <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>{company.org_phone}</p>
          )}
        </div>

        {/* Center: Key icon */}
        <div style={{ flex: "0 0 60px", display: "flex", justifyContent: "center", paddingTop: 4 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="15" r="5" />
            <path d="M12 12l7-7" />
            <path d="M19 5l-2.5 2.5" />
            <path d="M16.5 7.5L19 10" />
          </svg>
        </div>

        {/* Right: Owner/Client */}
        <div style={{ flex: 1, textAlign: "right" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", fontVariant: "small-caps" }}>
            {owner.first_name} {owner.last_name}
          </h2>
          {(owner.billing_street || owner.billing_postal_code || owner.billing_city) ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>
              {owner.billing_street && <>{owner.billing_street}<br /></>}
              {owner.billing_postal_code} {owner.billing_city}
            </p>
          ) : null}
          {owner.phone && (
            <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>{owner.phone}</p>
          )}
        </div>
      </div>

      {/* ═══ B) INVOICE META BLOCK ═══ */}
      <div style={{ padding: "28px 32px 16px", borderLeft: "3px solid #c0392b", marginLeft: 24, marginTop: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#061452", textTransform: "uppercase", fontVariant: "small-caps", letterSpacing: 1 }}>
          Facture N° {invoice.invoice_number}
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#555" }}>
          Date : {format(new Date(invoice.issue_date || invoice.invoice_date), "dd/MM/yyyy")}
        </p>
      </div>

      {/* ═══ C) ITEMS TABLE ═══ */}
      <div style={{ padding: "20px 32px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ backgroundColor: "#061452", color: "#ffffff" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, fontSize: 13 }}>Désignation</th>
              <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 600, fontSize: 13, width: 90 }}>Quantité</th>
              <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 600, fontSize: 13, width: 120 }}>Prix unitaire</th>
              <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 600, fontSize: 13, width: 100 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id || i} style={{ borderBottom: "1px solid #e0e0e0" }}>
                <td style={{ padding: "10px 14px", borderLeft: "1px solid #c0392b", borderRight: "1px solid #e0e0e0" }}>
                  {item.description}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "center", borderRight: "1px solid #e0e0e0" }}>
                  {Number(item.quantity)}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right", borderRight: "1px solid #e0e0e0" }}>
                  {formatEUR(Number(item.unit_price))}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, borderRight: "1px solid #c0392b" }}>
                  {formatEUR(Number(item.total))}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "20px 14px", textAlign: "center", color: "#999" }}>
                  Aucune ligne
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ D) TOTALS BLOCK ═══ */}
      <div style={{ padding: "0 32px 20px" }}>
        {/* Total HT line */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 14px", borderBottom: "1px solid #e0e0e0" }}>
          <span style={{ fontSize: 14, marginRight: 16 }}>Total HT:</span>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 100, textAlign: "right" }}>{formatEUR(totalHT)}</span>
        </div>

        {/* VAT mention + Total TTC */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          backgroundColor: "#f0f0ff",
          borderLeft: "3px solid #061452",
          marginTop: 8,
          borderRadius: 4,
        }}>
          <span style={{ fontSize: 13, color: "#061452", fontStyle: "italic" }}>
            TVA non applicable - article 293 B du CGI.
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#061452" }}>
            Total TTC: {formatEUR(totalHT)}
          </span>
        </div>
      </div>

      {/* ═══ E) PAYMENT TERMS BLOCK ═══ */}
      <div style={{ margin: "16px 32px", padding: "20px 24px", border: "2px solid #2ecc71", borderRadius: 8 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: "#061452", textTransform: "uppercase", fontVariant: "small-caps", letterSpacing: 1 }}>
          Modalités de paiement
        </h3>
        <p style={{ margin: "0 0 6px", fontSize: 13 }}>Paiement par virement bancaire</p>
        {company.iban && (
          <p style={{ margin: "0 0 4px", fontSize: 13 }}>
            IBAN : <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>{company.iban}</span>
          </p>
        )}
        {company.bic && (
          <p style={{ margin: "0 0 4px", fontSize: 13 }}>
            BIC : <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>{company.bic}</span>
          </p>
        )}
        <div style={{ borderTop: "2px solid #3498db", marginTop: 12, paddingTop: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#c0392b", fontWeight: 600, border: "1px solid #c0392b", display: "inline-block", padding: "4px 10px", borderRadius: 4 }}>
            Délai de paiement : {company.default_due_days || 7} jours
          </p>
        </div>
      </div>

      {/* Legal footer */}
      {company.legal_footer && (
        <p style={{ padding: "12px 32px", fontSize: 11, color: "#999", textAlign: "center", borderTop: "1px solid #eee", marginTop: 16 }}>
          {company.legal_footer}
        </p>
      )}
    </div>
  );
}
