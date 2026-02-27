import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { motion } from "framer-motion";

const ParametresPage = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de votre compte</p>
      </motion.div>

      <Card className="text-center py-16 border-border">
        <CardContent className="pt-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <Settings className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Paramètres</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Profil, notifications, intégrations et préférences de compte.
          </p>
          <p className="text-sm text-muted-foreground font-medium mt-2">🚧 Bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParametresPage;
