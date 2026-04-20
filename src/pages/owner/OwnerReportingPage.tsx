import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMonthlyReports } from "@/hooks/useMonthlyReports";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Loader2, FileText, Download, BedDouble, TrendingUp, Sparkles, Mail, Calendar } from "lucide-react";
import { motion } from "framer-motion";

const fmtMonth = (iso: string) => {
  const d = new Date(iso);
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const fmtPct = (n: number) => (Number(n) || 0).toFixed(1) + ' %';
const fmtEUR = (n: number) => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

export default function OwnerReportingPage() {
  const { ownerId, isLoading } = useIsOwner();
  const { reports, loading, downloadReport } = useMonthlyReports(ownerId || undefined);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reporting mensuel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vos rapports d'activité mensuels — générés automatiquement le 1er de chaque mois.
        </p>
      </motion.div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Aucun rapport disponible pour le moment</p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Le premier rapport sera généré le 1er du mois prochain.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[hsl(var(--gold))]" />
                        {fmtMonth(r.period_month)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Généré le {new Date(r.generated_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.status === 'sent' && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Mail className="w-3 h-3 mr-1" /> Envoyé par email
                        </Badge>
                      )}
                      <Button size="sm" onClick={() => downloadReport(r)} className="gap-2">
                        <Download className="w-4 h-4" /> Consulter
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-muted/40 rounded-lg p-3 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                        <BedDouble className="w-3 h-3" /> Réservations
                      </div>
                      <div className="text-lg font-bold text-foreground">{r.total_bookings}</div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3 border border-border/60">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Nuitées</div>
                      <div className="text-lg font-bold text-foreground">{r.total_nights}</div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                        <TrendingUp className="w-3 h-3" /> Occupation
                      </div>
                      <div className="text-lg font-bold text-[hsl(var(--gold))]">{fmtPct(r.occupancy_rate)}</div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3 border border-border/60">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                        <Sparkles className="w-3 h-3" /> Prix moyen
                      </div>
                      <div className="text-lg font-bold text-[hsl(var(--gold))]">{fmtEUR(r.adr)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
