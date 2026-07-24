import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { FinanceDashboardTab } from "@/components/finance/FinanceDashboardTab";
import { FinanceInvoicesTab } from "@/components/finance/FinanceInvoicesTab";
import { FinanceExpensesTab } from "@/components/finance/FinanceExpensesTab";
import { FinanceSettingsTab } from "@/components/finance/FinanceSettingsTab";
import { FinanceCashTab } from "@/components/finance/FinanceCashTab";
import { ArrowUpRight } from "lucide-react";

const TABS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "invoices", label: "Factures" },
  { value: "expenses", label: "Dépenses" },
  { value: "cash", label: "Espèces" },
  { value: "settings", label: "Paramètres" },
];

export default function FinancePage() {
  return (
    <div className="max-w-6xl animate-fade-in">
      {/* Editorial header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-foreground/10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Comptabilité</p>
          <h1 className="text-5xl font-light tracking-tight">Finance</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Revenus, factures et dépenses — vue consolidée.
          </p>
        </div>
        <Link
          to="/dashboard/finance/revenus-a-completer"
          className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-widest border-b border-foreground/30 pb-1 hover:border-foreground transition-colors self-start sm:self-end"
        >
          Revenus à compléter
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
        </Link>
      </div>

      <Tabs defaultValue="dashboard" className="w-full mt-6">
        <TabsList className="w-full justify-start bg-transparent p-0 h-auto border-b border-foreground/10 rounded-none gap-8">
          {TABS.map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="relative px-0 py-3 bg-transparent text-[11px] uppercase tracking-[0.25em] text-muted-foreground rounded-none border-0 shadow-none data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent hover:text-foreground transition-colors after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-px after:bg-foreground after:scale-x-0 data-[state=active]:after:scale-x-100 after:origin-left after:transition-transform after:duration-300"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><FinanceDashboardTab /></TabsContent>
        <TabsContent value="invoices"><FinanceInvoicesTab /></TabsContent>
        <TabsContent value="expenses"><FinanceExpensesTab /></TabsContent>
        <TabsContent value="cash"><FinanceCashTab /></TabsContent>
        <TabsContent value="settings"><FinanceSettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
