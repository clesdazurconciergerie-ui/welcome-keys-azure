import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Plus } from "lucide-react";
import { motion } from "framer-motion";

const PrestatairesPage = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prestataires</h1>
            <p className="text-muted-foreground mt-1">Gérez vos prestataires ménage et maintenance</p>
          </div>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un prestataire
          </Button>
        </div>
      </motion.div>

      <Card className="text-center py-16 border-border">
        <CardContent className="pt-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-100 flex items-center justify-center">
            <Wrench className="w-8 h-8 text-violet-600" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Module Prestataires</h3>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Planning des interventions, suivi ménage, prestataires maintenance et validation photos.
          </p>
          <p className="text-sm text-violet-600 font-medium">🚧 Bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrestatairesPage;
