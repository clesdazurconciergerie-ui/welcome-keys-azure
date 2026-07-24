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

/** Monochrome status pills — thin outline, subtle fill for emphasis */
export const invoiceStatusColors: Record<string, string> = {
  draft: "bg-transparent text-muted-foreground border border-foreground/20",
  sent: "bg-transparent text-foreground border border-foreground/40",
  paid: "bg-foreground text-background border border-foreground",
  overdue: "bg-transparent text-foreground border border-foreground border-dashed",
  canceled: "bg-transparent text-muted-foreground border border-foreground/10 line-through",
};

export const expenseStatusLabels: Record<string, string> = {
  to_pay: "À payer",
  pending: "En attente",
  pending_payment: "En attente",
  paid: "Payé",
  canceled: "Annulé",
};

export const expenseStatusColors: Record<string, string> = {
  to_pay: "bg-transparent text-foreground border border-foreground border-dashed",
  pending: "bg-transparent text-foreground border border-foreground border-dashed",
  pending_payment: "bg-transparent text-foreground border border-foreground border-dashed",
  paid: "bg-foreground text-background border border-foreground",
  canceled: "bg-transparent text-muted-foreground border border-foreground/10",
};

export const lineTypeLabels: Record<string, string> = {
  rental_reservation: "Revenu locatif (réservation)",
  rental_manual: "Revenu locatif (manuel)",
  service: "Prestation",
  pass_through_cost: "Frais refacturés",
  adjustment: "Ajustement",
};
