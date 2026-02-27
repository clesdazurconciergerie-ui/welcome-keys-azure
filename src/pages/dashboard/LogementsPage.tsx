import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Plus } from "lucide-react";
import { motion } from "framer-motion";

const LogementsPage = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Logements</h1>
            <p className="text-muted-foreground mt-1">Gestion centralisée de vos biens</p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un logement
          </Button>
        </div>
      </motion.div>

      <Card className="text-center py-16 border-border">
        <CardContent className="pt-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <Home className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Module Logements</h3>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Visualisez tous vos biens, statuts, calendrier d'occupation et rattachement aux propriétaires.
          </p>
          <p className="text-sm text-emerald-600 font-medium">🚧 Bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogementsPage;
