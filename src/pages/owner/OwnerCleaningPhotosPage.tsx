import { Card, CardContent } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { motion } from "framer-motion";

export default function OwnerCleaningPhotosPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Photos ménage</h1>
        <p className="text-muted-foreground mt-1">Photos des interventions ménage pour vos biens</p>
      </motion.div>

      <Card className="text-center py-16 border-border">
        <CardContent className="pt-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
            <Camera className="w-8 h-8 text-[hsl(var(--gold))]" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Photos ménage</h3>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Les photos uploadées par les prestataires apparaîtront ici avec leur statut (Validé / À refaire / Incident).
          </p>
          <p className="text-sm text-[hsl(var(--gold))] font-medium">🚧 Bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
}
