import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { motion } from "framer-motion";

const ProprietairesPage = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Propriétaires</h1>
            <p className="text-muted-foreground mt-1">Gérez vos propriétaires et leurs informations</p>
          </div>
          <Button className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un propriétaire
          </Button>
        </div>
      </motion.div>

      <Card className="text-center py-16 border-border">
        <CardContent className="pt-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-[hsl(var(--gold))]" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Module Propriétaires</h3>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Centralisez les fiches de vos propriétaires, contrats, coordonnées et historique de communication.
          </p>
          <p className="text-sm text-[hsl(var(--gold))] font-medium">🚧 Bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProprietairesPage;
