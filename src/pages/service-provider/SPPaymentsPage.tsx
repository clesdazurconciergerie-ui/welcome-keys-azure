import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useMissions } from "@/hooks/useMissions";

export default function SPPaymentsPage() {
  const { missions, isLoading } = useMissions('service_provider');

  const validatedMissions = missions.filter(m => m.status === 'validated');
  const totalPaid = validatedMissions.filter(m => m.payment_done).reduce((s, m) => s + (m.mission_amount || 0), 0);
  const totalPending = validatedMissions.filter(m => !m.payment_done).reduce((s, m) => s + (m.mission_amount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Paiements</h1>
        <p className="text-muted-foreground mt-1">Suivi de vos revenus et paiements</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPaid}€</p>
                <p className="text-xs text-muted-foreground">Total payé</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPending}€</p>
                <p className="text-xs text-muted-foreground">En attente de paiement</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{validatedMissions.length}</p>
                <p className="text-xs text-muted-foreground">Missions validées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {validatedMissions.length === 0 && !isLoading ? (
        <Card className="text-center py-12">
          <CardContent>
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Aucun paiement</h3>
            <p className="text-muted-foreground text-sm">Vos paiements apparaîtront après validation des missions</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-4">Détail des missions</h2>
            <div className="space-y-2">
              {validatedMissions.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{m.property?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{m.mission_amount}€</span>
                    {m.payment_done ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-0">Payé ✅</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border-0">En attente</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
