import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function SPSettingsPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configurez votre compte prestataire</p>
      </motion.div>

      <Card className="text-center py-16 border-border">
        <CardContent className="pt-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Paramètres du compte</h3>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Modification du mot de passe, notifications et préférences.
          </p>
          <p className="text-sm text-[hsl(var(--gold))] font-medium">🚧 Bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
}
