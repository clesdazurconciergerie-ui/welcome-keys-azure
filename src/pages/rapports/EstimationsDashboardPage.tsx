// MODULE — Estimation locative · tableau de bord
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Copy, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SEOHead from "@/components/SEOHead";
import { useEstimations } from "@/hooks/useEstimationsLoc";
import { ESTIMATION_STATUSES, STATUS_LABEL } from "@/lib/estimation-locative/constants";

export default function EstimationsDashboardPage() {
  const navigate = useNavigate();
  const { list, create, duplicate, remove } = useEstimations();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = list.data ?? [];
  const cities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.city).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = rows.filter((r) => {
    const owner = r.owner ? `${r.owner.first_name} ${r.owner.last_name}` : "";
    const hay = `${r.reference} ${r.address ?? ""} ${r.city ?? ""} ${owner}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (city !== "all" && r.city !== city) return false;
    if (status !== "all" && r.status !== status) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <SEOHead
        title="Estimation locative — Azur Keys Properties"
        description="Estimations de potentiel locatif en courte durée dans le Var."
      />

      <header className="flex flex-wrap items-end justify-between gap-6 border-b pb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            Azur Keys Properties
          </p>
          <h1 className="text-3xl font-light tracking-tight mt-2">Estimation locative</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Potentiel locatif courte durée — Var (83).
          </p>
        </div>
        <Button
          onClick={() => create.mutate(undefined, { onSuccess: (e) => navigate(`/rapports/estimations/${e.id}`) })}
          disabled={create.isPending}
        >
          {create.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />}
          Nouvelle estimation
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Référence, adresse ou propriétaire"
            className="pl-9"
          />
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ville" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {ESTIMATION_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">Aucune estimation pour le moment.</p>
        </div>
      ) : (
        <ul className="divide-y border-t">
          {filtered.map((r) => (
            <li key={r.id} className="group flex items-center gap-4 py-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/rapports/estimations/${r.id}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/rapports/estimations/${r.id}`)}
                className="flex-1 cursor-pointer min-w-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs tracking-wider">{r.reference}</span>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm">
                  {r.address || "Adresse à renseigner"}
                  {r.city ? ` · ${r.city}` : ""}
                </p>
                {r.owner && (
                  <p className="text-xs text-muted-foreground">
                    {r.owner.first_name} {r.owner.last_name}
                  </p>
                )}
              </div>
              <button
                onClick={() => duplicate.mutate(r)}
                className="p-2 text-muted-foreground hover:text-foreground"
                aria-label="Dupliquer"
              >
                <Copy className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => { if (confirm(`Supprimer ${r.reference} ?`)) remove.mutate(r.id); }}
                className="p-2 text-muted-foreground hover:text-destructive"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
