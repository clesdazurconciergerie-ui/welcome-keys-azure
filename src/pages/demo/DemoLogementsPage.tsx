import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useDemoContext } from "@/contexts/DemoContext";

export default function DemoLogementsPage() {
  const demo = useDemoContext();
  const navigate = useNavigate();
  if (!demo) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Biens / Logements</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos biens et leurs paramètres.</p>
        </motion.div>
        <Button onClick={demo.blockAction} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold" data-tour="add-property">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un logement
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {demo.demoProperties.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={demo.blockAction}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-0">
                    Actif
                  </Badge>
                </div>
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{p.address}, {p.city}</p>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{p.bedrooms} ch.</span>
                  <span>{p.capacity} pers.</span>
                  <span>{p.surface_m2} m²</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
