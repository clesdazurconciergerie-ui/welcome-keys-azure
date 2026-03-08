import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useDemoContext } from "@/contexts/DemoContext";

const DEMO_OWNERS = [
  { name: "Pierre Durand", email: "pierre@demo.com", properties: 1, status: "active" },
  { name: "Catherine Blanc", email: "catherine@demo.com", properties: 1, status: "active" },
];

export default function DemoProprietairesPage() {
  const demo = useDemoContext();
  if (!demo) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Propriétaires</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez les propriétaires et leurs accès.</p>
        </motion.div>
        <Button onClick={demo.blockAction} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold" data-tour="add-owner">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un propriétaire
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_OWNERS.map((o, i) => (
          <motion.div key={o.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={demo.blockAction}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[hsl(var(--gold))]" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-0">Actif</Badge>
                </div>
                <h3 className="font-semibold text-foreground">{o.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{o.email}</p>
                <p className="text-xs text-muted-foreground">{o.properties} bien(s)</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
