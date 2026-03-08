import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useDemoContext } from "@/contexts/DemoContext";

const DEMO_BOOKLETS = [
  { name: "Livret Villa La Palmeraie", views: 34, status: "Publié", code: "PALM-2426" },
  { name: "Livret Les Jardins de Géolia", views: 12, status: "Publié", code: "GEOL-0824" },
];

export default function DemoLivretsPage() {
  const demo = useDemoContext();
  if (!demo) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Livrets d'accueil</h1>
          <p className="text-sm text-muted-foreground mt-1">Livrets digitaux personnalisés pour vos voyageurs.</p>
        </motion.div>
        <Button onClick={demo.blockAction} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold" data-tour="add-booklet">
          <Plus className="w-4 h-4 mr-2" />
          Créer un livret
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_BOOKLETS.map((b, i) => (
          <motion.div key={b.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={demo.blockAction}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-accent" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-0">
                    {b.status}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{b.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{b.views} vues · Code : {b.code}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
