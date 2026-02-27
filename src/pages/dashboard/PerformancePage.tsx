import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const PerformancePage = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Performance</h1>
        <p className="text-muted-foreground mt-1">Statistiques et indicateurs clés</p>
      </motion.div>

      <Card className="text-center py-16 border-border">
        <CardContent className="pt-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Tableau de performance</h3>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Taux d'occupation, revenus, satisfaction voyageurs et KPIs de votre activité.
          </p>
          <p className="text-sm text-primary font-medium">🚧 Bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformancePage;
