import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, FileText, Users, Euro } from "lucide-react";
import { motion } from "framer-motion";
import { useDemoContext } from "@/contexts/DemoContext";
import { cn } from "@/lib/utils";

export default function DemoFinancePage() {
  const demo = useDemoContext();
  if (!demo) return null;

  const kpis = [
    { label: "Revenus du mois", value: "1 240 €", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Dépenses", value: "285 €", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Factures en attente", value: "1", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Paiements prestataires", value: "145 €", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue consolidée de vos revenus et dépenses.</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-tour="finance-section">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", kpi.bg)}>
                  <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dernières transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { desc: "Commission — Villa La Palmeraie (J. Dupont)", amount: "+193 €", color: "text-emerald-600" },
            { desc: "Ménage — Sophie D.", amount: "-85 €", color: "text-red-600" },
            { desc: "Commission — Les Jardins de Géolia (F. Garcia)", amount: "+138 €", color: "text-emerald-600" },
            { desc: "Accueil voyageurs — Julien M.", amount: "-40 €", color: "text-red-600" },
          ].map((t) => (
            <div key={t.desc} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <p className="text-sm text-foreground truncate">{t.desc}</p>
              <span className={cn("text-sm font-semibold whitespace-nowrap ml-3", t.color)}>{t.amount}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
