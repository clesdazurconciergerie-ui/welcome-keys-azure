import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, Receipt, Settings, Banknote } from "lucide-react";
import { FinanceDashboardTab } from "@/components/finance/FinanceDashboardTab";
import { FinanceInvoicesTab } from "@/components/finance/FinanceInvoicesTab";
import { FinanceExpensesTab } from "@/components/finance/FinanceExpensesTab";
import { FinanceSettingsTab } from "@/components/finance/FinanceSettingsTab";
import { FinanceCashTab } from "@/components/finance/FinanceCashTab";

export default function FinancePage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez vos revenus, factures et dépenses</p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2"><FileText className="h-4 w-4" />Factures</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2"><Receipt className="h-4 w-4" />Dépenses</TabsTrigger>
          <TabsTrigger value="cash" className="gap-2"><Banknote className="h-4 w-4" />Espèces</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" />Paramètres</TabsTrigger>
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
