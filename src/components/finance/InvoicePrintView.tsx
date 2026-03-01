import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Invoice, InvoiceItem } from "@/hooks/useInvoices";

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
}

export function InvoicePrintView({ invoice, items }: Props) {
  const company = invoice.company_snapshot || {};
  const owner = invoice.owner_snapshot || invoice.owner || {};

  return (
    <div className="print-invoice bg-white p-8 text-sm text-gray-800" id="invoice-print">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{company.company_name || "Ma Conciergerie"}</h2>
          {company.address && <p className="text-gray-600 mt-1 whitespace-pre-line">{company.address}</p>}
          {company.vat_number && <p className="text-gray-500 mt-1">TVA : {company.vat_number}</p>}
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-[hsl(var(--brand-blue))]">FACTURE</h1>
          <p className="text-lg font-semibold mt-1">{invoice.invoice_number}</p>
          <p className="text-gray-500 mt-1">Date : {format(new Date(invoice.invoice_date), "dd MMMM yyyy", { locale: fr })}</p>
        </div>
      </div>

      {/* Client */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Destinataire</p>
        <p className="font-semibold">{owner.first_name} {owner.last_name}</p>
        {owner.email && <p className="text-gray-600">{owner.email}</p>}
      </div>

      {/* Period */}
      <p className="text-gray-600 mb-4">
        Période : <strong>{format(new Date(invoice.period_start), "dd/MM/yyyy")} — {format(new Date(invoice.period_end), "dd/MM/yyyy")}</strong>
      </p>

      {/* Items table */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 text-xs text-gray-500 uppercase">Description</th>
            <th className="text-right py-2 text-xs text-gray-500 uppercase">Qté</th>
            <th className="text-right py-2 text-xs text-gray-500 uppercase">P.U. (€)</th>
            <th className="text-right py-2 text-xs text-gray-500 uppercase">Total (€)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id || i} className="border-b border-gray-100">
              <td className="py-2">{item.description}</td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{Number(item.unit_price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
              <td className="py-2 text-right font-medium">{Number(item.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between">
            <span>Sous-total HT</span>
            <span className="font-medium">{Number(invoice.subtotal).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
          </div>
          {Number(invoice.vat_rate) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>TVA ({invoice.vat_rate}%)</span>
              <span>{Number(invoice.vat_amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t-2 border-gray-300 pt-2 mt-2">
            <span>Total TTC</span>
            <span>{Number(invoice.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
          </div>
        </div>
      </div>

      {/* Payment info */}
      {company.iban && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Coordonnées bancaires</p>
          <p className="font-mono text-sm">{company.iban}</p>
        </div>
      )}

      {/* Footer */}
      {company.legal_footer && (
        <p className="mt-8 text-xs text-gray-400 text-center border-t pt-4">{company.legal_footer}</p>
      )}
    </div>
  );
}
