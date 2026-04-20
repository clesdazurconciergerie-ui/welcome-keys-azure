import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMonthlyReports } from "@/hooks/useMonthlyReports";
import { useOwners } from "@/hooks/useOwners";
import { Loader2, FileText, Download, RefreshCw, Mail, Send } from "lucide-react";
import { motion } from "framer-motion";

const fmtMonth = (iso: string) => {
  const d = new Date(iso);
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Build last 12 months as YYYY-MM
function buildPeriodOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    out.push({ value: `${yyyy}-${mm}`, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return out;
}

export default function MonthlyReportsAdminPage() {
  const { reports, loading, generateReport, downloadReport, refetch } = useMonthlyReports();
  const { owners } = useOwners();
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const d = new Date();
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  });
  const [force, setForce] = useState(false);
  const [generating, setGenerating] = useState(false);

  const periodOptions = buildPeriodOptions();
  const ownerNameById: Record<string, string> = {};
  (owners || []).forEach((o: any) => {
    ownerNameById[o.id] = `${o.first_name || ''} ${o.last_name || ''}`.trim() || o.email || 'Propriétaire';
  });

  const handleGenerate = async () => {
    setGenerating(true);
    await generateReport({
      owner_id: selectedOwner === 'all' ? undefined : selectedOwner,
      period: selectedPeriod,
      force,
    });
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Rapports mensuels propriétaires</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Génération automatique le 1er du mois à 8h. Vous pouvez aussi générer ou régénérer manuellement ci-dessous.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4" /> Générer un rapport
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Propriétaire</Label>
              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les propriétaires actifs</SelectItem>
                  {(owners || []).map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{ownerNameById[o.id]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Période</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periodOptions.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch id="force" checked={force} onCheckedChange={setForce} />
              <Label htmlFor="force" className="text-sm cursor-pointer">Régénérer si déjà existant</Label>
            </div>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Générer maintenant
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Rapports générés</CardTitle>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucun rapport généré pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{ownerNameById[r.owner_id] || 'Propriétaire'}</p>
                      <Badge variant="outline" className="text-[10px]">{fmtMonth(r.period_month)}</Badge>
                      {r.status === 'sent' && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          <Mail className="w-2.5 h-2.5 mr-1" /> Envoyé
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {r.total_bookings} résa · {r.total_nights} nuits · Occ. {Number(r.occupancy_rate).toFixed(1)}% · ADR {Number(r.adr).toFixed(0)}€
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadReport(r)} className="gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Voir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
