import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import { motion } from "framer-motion";

export default function SPAccountPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Mon compte</h1>
        <p className="text-muted-foreground mt-1">Gérez vos informations personnelles</p>
      </motion.div>

      <Card className="text-center py-16 border-border">
        <CardContent className="pt-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Paramètres du compte</h3>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Modification du mot de passe et informations personnelles.
          </p>
          <p className="text-sm text-[hsl(var(--gold))] font-medium">🚧 Bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
}
