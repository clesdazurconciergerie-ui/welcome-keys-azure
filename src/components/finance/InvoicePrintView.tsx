import { format } from "date-fns";
import type { Invoice, InvoiceItem } from "@/hooks/useInvoices";

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
  financialSettings?: any;
}

function fmtEUR(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);
}

const NAVY = "#061452";
const GOLD = "#C4A45B";
const GOLD_LIGHT = "#d4bb7a";
const GRAY_STRIP = "#eef0f7";
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

export function InvoicePrintView({ invoice, items, financialSettings }: Props) {
  const co = financialSettings || invoice.company_snapshot || {};
  const ow = invoice.owner_snapshot || invoice.owner || {};
  const totalHT = items.reduce((s, item) => s + Number(item.total || 0), 0);
  const issueDate = format(
    new Date(invoice.issue_date || invoice.invoice_date),
    "dd/MM/yyyy"
  );

  return (
    <div
      id="invoice-print"
      style={{
        fontFamily: FONT,
        width: "210mm",
        height: "297mm",
        margin: "0 auto",
        background: "#fff",
        color: "#1a1a1a",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        paddingBottom: "26mm",
      }}
    >
      <style>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          @page { size: A4 portrait; margin: 0; }
          .no-print, [role="dialog"] > div:first-child { display: none !important; }
        }
      `}</style>

      {/* ═══ A) TOP NAVY BAND ═══ */}
      <div
        style={{
          backgroundColor: NAVY,
          color: "#fff",
          display: "flex",
          alignItems: "stretch",
          minHeight: 105,
        }}
      >
        {/* Left — Issuer */}
        <div
          style={{
            flex: 1,
            padding: "20px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              paddingBottom: 4,
              borderBottom: `2px solid ${GOLD}`,
              display: "inline-block",
            }}
          >
            {co.company_name || "MA CONCIERGERIE"}
          </div>
          <p
            style={{
              margin: "7px 0 0",
              fontSize: 10.5,
              lineHeight: 1.55,
              opacity: 0.9,
              fontFamily: FONT,
            }}
          >
            {co.address || ""}
            {(co.org_postal_code || co.org_city) && (
              <>
                <br />
                {co.org_postal_code} {co.org_city}
              </>
            )}
          </p>
          {co.org_phone && (
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 10.5,
                opacity: 0.9,
                fontFamily: FONT,
              }}
            >
              {co.org_phone}
            </p>
          )}
        </div>

        {/* Center — Logo or nothing */}
        {co.logo_url ? (
          <div
            style={{
              width: 90,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px",
            }}
          >
            <img
              src={co.logo_url}
              alt="Logo"
              style={{ maxHeight: 70, maxWidth: 80, objectFit: "contain" }}
              crossOrigin="anonymous"
            />
          </div>
        ) : (
          <div style={{ width: 20 }} />
        )}

        {/* Right — Owner */}
        <div
          style={{
            flex: 1,
            padding: "20px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              paddingBottom: 4,
              borderBottom: `2px solid ${GOLD}`,
              display: "inline-block",
              marginLeft: "auto",
            }}
          >
            {ow.first_name} {ow.last_name}
          </div>
          {(ow.billing_street ||
            ow.billing_postal_code ||
            ow.billing_city) && (
            <p
              style={{
                margin: "7px 0 0",
                fontSize: 10.5,
                lineHeight: 1.55,
                opacity: 0.9,
                fontFamily: FONT,
              }}
            >
              {ow.billing_street && (
                <>
                  {ow.billing_street}
                  <br />
                </>
              )}
              {ow.billing_postal_code} {ow.billing_city}
            </p>
          )}
          {ow.phone && (
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 10.5,
                opacity: 0.9,
                fontFamily: FONT,
              }}
            >
              {ow.phone}
            </p>
          )}
        </div>
      </div>

      {/* ═══ B) INVOICE TITLE ═══ */}
      <div style={{ padding: "24px 30px 12px", display: "flex" }}>
        <div
          style={{
            width: 3,
            backgroundColor: "#c0392b",
            borderRadius: 1,
            marginRight: 14,
            minHeight: 42,
          }}
        />
        <div>
          <h1
            style={{
              fontFamily: FONT,
              fontSize: 20,
              fontWeight: 700,
              color: NAVY,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              margin: 0,
            }}
          >
            Facture N° {invoice.invoice_number}
          </h1>
          <p
            style={{
              margin: "5px 0 0",
              fontSize: 11.5,
              color: "#555",
              fontFamily: FONT,
            }}
          >
            Date : {issueDate}
          </p>
        </div>
      </div>

      {/* ═══ C) ITEMS TABLE ═══ */}
      <div style={{ padding: "8px 30px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: `2px solid ${NAVY}`,
            fontFamily: FONT,
          }}
        >
          <thead>
            <tr>
              {[
                { label: "Désignation", align: "left" as const, w: undefined },
                { label: "Quantité", align: "center" as const, w: 75 },
                { label: "Prix unitaire", align: "right" as const, w: 105 },
                { label: "Total", align: "right" as const, w: 95 },
              ].map((col, i) => (
                <th
                  key={col.label}
                  style={{
                    backgroundColor: NAVY,
                    color: "#fff",
                    fontFamily: FONT,
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: 0.8,
                    textAlign: col.align,
                    padding: "9px 12px",
                    borderRight:
                      i < 3 ? "1px solid rgba(255,255,255,0.2)" : "none",
                    width: col.w,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id || i}>
                <td
                  style={{
                    padding: "9px 12px",
                    fontSize: 10.5,
                    lineHeight: 1.4,
                    borderBottom: `1px solid ${NAVY}1a`,
                    borderRight: `1px solid ${NAVY}1a`,
                    whiteSpace: "pre-wrap",
                    fontFamily: FONT,
                  }}
                >
                  {item.description}
                </td>
                <td
                  style={{
                    padding: "9px 8px",
                    fontSize: 10.5,
                    textAlign: "center",
                    borderBottom: `1px solid ${NAVY}1a`,
                    borderRight: `1px solid ${NAVY}1a`,
                    fontFamily: FONT,
                  }}
                >
                  {Number(item.quantity)}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    fontSize: 10.5,
                    textAlign: "right",
                    borderBottom: `1px solid ${NAVY}1a`,
                    borderRight: `1px solid ${NAVY}1a`,
                    fontFamily: FONT,
                  }}
                >
                  {fmtEUR(Number(item.unit_price))}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    fontSize: 11,
                    textAlign: "right",
                    fontWeight: 700,
                    borderBottom: `1px solid ${NAVY}1a`,
                    fontFamily: FONT,
                  }}
                >
                  {fmtEUR(Number(item.total))}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: "18px 12px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: 10.5,
                    fontFamily: FONT,
                  }}
                >
                  Aucune ligne
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ D) TOTALS ═══ */}
      <div style={{ padding: "0 30px 4px" }}>
        <div style={{ border: `2px solid ${NAVY}`, borderTop: "none" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              padding: "9px 12px",
              borderBottom: `1px solid ${NAVY}1a`,
            }}
          >
            <span style={{ fontSize: 11.5, marginRight: 18, fontFamily: FONT }}>
              Total HT :
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                minWidth: 90,
                textAlign: "right",
                fontFamily: FONT,
              }}
            >
              {fmtEUR(totalHT)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "9px 12px",
              backgroundColor: GRAY_STRIP,
            }}
          >
            <span
              style={{
                fontSize: 9.5,
                color: NAVY,
                fontStyle: "italic",
                opacity: 0.85,
                fontFamily: FONT,
              }}
            >
              TVA non applicable - article 293 B du CGI.
            </span>
            <span
              style={{
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: 700,
                color: NAVY,
                letterSpacing: 0.5,
              }}
            >
              Total TTC : {fmtEUR(totalHT)}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ E) PAYMENT ═══ */}
      <div style={{ padding: "18px 30px 0" }}>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 700,
            color: NAVY,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            paddingBottom: 7,
            borderBottom: `2px solid ${GOLD}`,
          }}
        >
          Modalités de paiement
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 10.5,
            lineHeight: 1.85,
            fontFamily: FONT,
          }}
        >
          <p style={{ margin: 0 }}>Paiement par virement bancaire</p>
          {co.iban && (
            <p style={{ margin: 0 }}>
              IBAN :{" "}
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  letterSpacing: 1.2,
                  fontWeight: 600,
                }}
              >
                {co.iban}
              </span>
            </p>
          )}
          {co.bic && (
            <p style={{ margin: 0 }}>
              BIC :{" "}
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  letterSpacing: 1.2,
                  fontWeight: 600,
                }}
              >
                {co.bic}
              </span>
            </p>
          )}
        </div>
        <div
          style={{
            height: 1,
            backgroundColor: GOLD_LIGHT,
            margin: "12px 0",
          }}
        />
        <p
          style={{
            fontSize: 10.5,
            color: NAVY,
            margin: 0,
            fontFamily: FONT,
          }}
        >
          Délai de paiement : {co.default_due_days || 7} jours
        </p>
      </div>

      {/* ═══ F) FOOTER — absolute bottom ═══ */}
      {co.legal_footer && (
        <div
          style={{
            position: "absolute",
            bottom: "10mm",
            left: "14mm",
            right: "14mm",
            borderTop: "1px solid #ddd",
            paddingTop: 5,
          }}
        >
          <p
            style={{
              fontSize: 8.5,
              color: "#888",
              textAlign: "center",
              margin: 0,
              lineHeight: 1.45,
              whiteSpace: "pre-line",
              fontFamily: FONT,
            }}
          >
            {co.legal_footer}
          </p>
        </div>
      )}
    </div>
  );
}
