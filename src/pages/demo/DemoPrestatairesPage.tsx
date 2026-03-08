import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useDemoContext } from "@/contexts/DemoContext";

const DEMO_PROVIDERS = [
  { name: "Sophie Dupont", email: "sophie@demo.com", speciality: "Ménage", score: 4.8, status: "active" },
  { name: "Julien Martin", email: "julien@demo.com", speciality: "Check-in", score: 4.5, status: "active" },
  { name: "Thomas Roux", email: "thomas@demo.com", speciality: "Plomberie", score: 4.2, status: "active" },
];

export default function DemoPrestatairesPage() {
  const demo = useDemoContext();
  if (!demo) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Prestataires</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos prestataires de services.</p>
        </motion.div>
        <Button onClick={demo.blockAction} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold" data-tour="add-provider">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un prestataire
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_PROVIDERS.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={demo.blockAction}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{p.score}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{p.speciality}</p>
                <p className="text-xs text-muted-foreground">{p.email}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
