// MODULE — Page Monitoring iCal
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { RefreshCw, CheckCircle2, XCircle, Clock, Activity } from "lucide-react";
import { useICalMonitoring, type SyncHistoryEntry } from "@/hooks/useICalMonitoring";
import { CalendarHealthBadge } from "@/components/monitoring/CalendarHealthBadge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import SEOHead from "@/components/SEOHead";

const statusBadge = (s: string) => {
  if (s === "success") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
  if (s === "running") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
  if (s === "partial_success") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
};

export default function ICalMonitoringPage() {
  const { calendars, history, isLoading, syncOne, syncAll, toggleEnabled } = useICalMonitoring();
  const [selected, setSelected] = useState<SyncHistoryEntry | null>(null);

  const kpis = useMemo(() => {
    const active = calendars.filter((c) => c.is_sync_enabled).length;
    const lastSync = calendars
      .map((c) => c.last_sync_at)
      .filter(Boolean)
      .sort()
      .pop();
    const recent = history.filter(
      (h) => new Date(h.started_at).getTime() > Date.now() - 7 * 86400_000,
    );
    const successRate = recent.length
      ? Math.round((recent.filter((h) => h.status === "success").length / recent.length) * 100)
      : 100;
    const avgHealth = calendars.length
      ? calendars.reduce((s, c) => s + (Number(c.sync_health_score) || 0), 0) / calendars.length
      : 1;
    return { active, lastSync, successRate, avgHealth };
  }, [calendars, history]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <SEOHead title="Monitoring iCal — Welkom" description="Surveillance des synchronisations iCal" />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoring iCal</h1>
          <p className="text-sm text-muted-foreground">
            Surveillance et santé des synchronisations de calendriers externes
          </p>
        </div>
        <Button
          onClick={() => syncAll.mutate()}
          disabled={syncAll.isPending}
          className="bg-primary text-primary-foreground"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncAll.isPending ? "animate-spin" : ""}`} />
          Forcer sync globale
        </Button>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" /> Calendriers actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{kpis.active}</p>
            <p className="text-xs text-muted-foreground">sur {calendars.length} configurés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" /> Dernière sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold text-foreground">
              {kpis.lastSync
                ? formatDistanceToNow(new Date(kpis.lastSync), { addSuffix: true, locale: fr })
                : "Aucune"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" /> Taux de succès 7j
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{kpis.successRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Santé moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarHealthBadge score={kpis.avgHealth} />
          </CardContent>
        </Card>
      </div>

      {/* Calendars table */}
      <Card>
        <CardHeader>
          <CardTitle>Calendriers configurés</CardTitle>
        </CardHeader>
        <CardContent>
          {calendars.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucun calendrier iCal configuré
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logement</TableHead>
                    <TableHead>Plateforme</TableHead>
                    <TableHead>Dernière sync</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Santé</TableHead>
                    <TableHead>Auto</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calendars.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.property?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{c.platform}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.last_sync_at
                          ? formatDistanceToNow(new Date(c.last_sync_at), { addSuffix: true, locale: fr })
                          : "Jamais"}
                      </TableCell>
                      <TableCell>
                        {c.last_sync_status ? (
                          <Badge className={statusBadge(c.last_sync_status)} variant="outline">
                            {c.last_sync_status}
                          </Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <CalendarHealthBadge score={c.sync_health_score} />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={c.is_sync_enabled}
                          onCheckedChange={(v) => toggleEnabled.mutate({ id: c.id, enabled: v })}
                          aria-label="Activer la synchronisation auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncOne.mutate(c.id)}
                          disabled={syncOne.isPending}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Sync
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique (50 dernières sync)</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune synchronisation</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setSelected(h)}
                  className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {h.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {h.ical_calendar?.name ?? "Calendrier"}
                        <span className="text-muted-foreground font-normal ml-2">
                          · {h.ical_calendar?.platform}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(h.started_at), { addSuffix: true, locale: fr })}
                        {h.duration_ms && ` · ${h.duration_ms}ms`}
                        {h.events_created > 0 && ` · ${h.events_created} créés`}
                        {h.events_deleted > 0 && ` · ${h.events_deleted} supprimés`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusBadge(h.status)}>
                    {h.status}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détails de la synchronisation</SheetTitle>
            <SheetDescription>
              {selected?.ical_calendar?.name} · {selected?.ical_calendar?.platform}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-3 text-sm">
              <Row label="Statut" value={selected.status} />
              <Row label="Déclenché par" value={selected.triggered_by} />
              <Row label="Démarré" value={new Date(selected.started_at).toLocaleString("fr-FR")} />
              {selected.completed_at && (
                <Row label="Terminé" value={new Date(selected.completed_at).toLocaleString("fr-FR")} />
              )}
              {selected.duration_ms !== null && <Row label="Durée" value={`${selected.duration_ms} ms`} />}
              {selected.response_time_ms !== null && (
                <Row label="Temps de réponse HTTP" value={`${selected.response_time_ms} ms`} />
              )}
              {selected.http_status !== null && <Row label="HTTP" value={String(selected.http_status)} />}
              <Row label="Événements récupérés" value={String(selected.events_fetched)} />
              <Row label="Créés" value={String(selected.events_created)} />
              <Row label="Mis à jour" value={String(selected.events_updated)} />
              <Row label="Supprimés" value={String(selected.events_deleted)} />
              <Row label="Tentatives" value={String(selected.retry_count)} />
              {selected.error_message && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">
                    {selected.error_code ?? "Erreur"}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 break-words">
                    {selected.error_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}
