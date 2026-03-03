/** Format a number as EUR currency */
export function formatEUR(amount: number): string {
  return amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/** Compute margin percentage */
export function marginPercent(profit: number, revenue: number): string {
  if (revenue <= 0) return "—";
  return ((profit / revenue) * 100).toFixed(1) + "%";
}

/** Status label map */
export const invoiceStatusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  canceled: "Annulée",
};

export const invoiceStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  canceled: "bg-muted text-muted-foreground line-through",
};

export const expenseStatusLabels: Record<string, string> = {
  to_pay: "À payer",
  pending: "En attente",
  pending_payment: "En attente",
  paid: "Payé",
  canceled: "Annulé",
};

export const expenseStatusColors: Record<string, string> = {
  to_pay: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  pending_payment: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  canceled: "bg-muted text-muted-foreground",
};

export const lineTypeLabels: Record<string, string> = {
  rental_reservation: "Revenu locatif (réservation)",
  rental_manual: "Revenu locatif (manuel)",
  service: "Prestation",
  pass_through_cost: "Frais refacturés",
  adjustment: "Ajustement",
};
