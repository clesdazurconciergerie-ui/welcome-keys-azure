// MODULE — Page de gestion conciergerie des états des lieux (filtres + accès PDF)
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, ClipboardList, ListChecks, FileText, AlertTriangle, CheckCircle2,
  Lock, DoorOpen, DoorClosed,
} from "lucide-react";
import { usePropertyInspections } from "@/hooks/usePropertyInspections";
import { INSPECTION_STATUS_LABEL } from "@/lib/inspection-zones";
import InspectionTemplatesPage from "./InspectionTemplatesPage";
import SEOHead from "@/components/SEOHead";

const PERIODS = [
  { value: "all", label: "Toutes périodes" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "3 derniers mois" },
  { value: "365", label: "12 derniers mois" },
];

export default function InspectionsV2Page() {
  const { list } = usePropertyInspections();
  const navigate = useNavigate();
  const [tab, setTab] = useState("inspections");
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("all");
  const [period, setPeriod] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const properties = useQuery({
    queryKey: ["inspection-filter-properties"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("properties").select("id, name").eq("user_id", user.id).order("name");
      return data ?? [];
    },
  });

  const counts = useQuery({
    queryKey: ["inspection-issue-counts"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("inspection_issues").select("inspection_id");
      const map: Record<string, number> = {};
      for (const r of data ?? []) map[r.inspection_id] = (map[r.inspection_id] ?? 0) + 1;
      return map;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minDate = period === "all" ? null : new Date(Date.now() - Number(period) * 86400000);
    return (list.data ?? []).filter((i: any) => {
      if (propertyId !== "all" && i.property_id !== propertyId) return false;
      if (type !== "all" && i.inspection_type !== type) return false;
      if (status !== "all") {
        const norm = i.status === "validated" ? "validated"
          : i.status === "completed" || i.status === "to_sign" ? "to_sign" : "draft";
        if (norm !== status) return false;
      }
      if (minDate && new Date(i.official_date) < minDate) return false;
      if (q && !(
        i.property?.name?.toLowerCase().includes(q) ||
        i.guest_name?.toLowerCase().includes(q) ||
        i.reference?.toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [list.data, search, propertyId, period, type, status]);

  return (
    <div className="space-y-6 p-4 md:p-6 pb-24">
      <SEOHead title="États des lieux — Welkom" description="Créer, suivre et partager les états des lieux d'entrée et de sortie" />

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">États des lieux</h1>
          <p className="text-sm text-muted-foreground">Entrées, sorties, anomalies et rapports PDF.</p>
        </div>
        {tab === "inspections" && (
          <Button className="h-12 sm:h-10" onClick={() => navigate("/dashboard/etats-des-lieux/nouveau")}>
            <Plus className="h-4 w-4 mr-2" /> Créer un état des lieux
          </Button>
        )}
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inspections" className="gap-2"><ClipboardList className="h-4 w-4" /> Contrôles</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><ListChecks className="h-4 w-4" /> Modèles</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-11" placeholder="Voyageur, bien ou référence…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <FilterSelect value={propertyId} onChange={setPropertyId} placeholder="Bien"
              options={[{ value: "all", label: "Tous les biens" }, ...(properties.data ?? []).map((p: any) => ({ value: p.id, label: p.name }))]} />
            <FilterSelect value={period} onChange={setPeriod} placeholder="Période" options={PERIODS} />
            <FilterSelect value={type} onChange={setType} placeholder="Type" options={[
              { value: "all", label: "Entrée & sortie" }, { value: "entry", label: "Entrée" }, { value: "exit", label: "Sortie" },
            ]} />
            <FilterSelect value={status} onChange={setStatus} placeholder="Statut" options={[
              { value: "all", label: "Tous les statuts" }, { value: "draft", label: "Brouillon" },
              { value: "to_sign", label: "À signer" }, { value: "validated", label: "Finalisé" },
            ]} />
          </div>

          {list.isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-border">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Aucun état des lieux ne correspond à ces filtres.</p>
              <Button onClick={() => navigate("/dashboard/etats-des-lieux/nouveau")}>
                <Plus className="h-4 w-4 mr-2" /> Créer un état des lieux
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {filtered.map((i: any) => {
                const anomalies = counts.data?.[i.id] ?? 0;
                const isFinal = i.status === "validated";
                return (
                  <li key={i.id} className="py-4 px-1 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/dashboard/etats-des-lieux/${i.id}`)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/dashboard/etats-des-lieux/${i.id}`); }}
                      className="flex-1 min-w-0 cursor-pointer text-left"
                    >
                      <p className="font-medium truncate flex items-center gap-2">
                        {i.inspection_type === "exit"
                          ? <DoorClosed className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                          : <DoorOpen className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
                        {i.property?.name ?? "Bien"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(i.official_date).toLocaleDateString("fr-FR")}
                        {" · "}{i.inspection_type === "exit" ? "Sortie" : "Entrée"}
                        {i.guest_name ? ` · ${i.guest_name}` : ""}
                        {i.reference ? ` · ${i.reference}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="gap-1">
                        {isFinal ? <Lock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                        {INSPECTION_STATUS_LABEL[i.status] ?? i.status}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> {anomalies} anomalie{anomalies > 1 ? "s" : ""}
                      </Badge>
                      {i.report_pdf_url && (
                        <Button asChild size="sm" variant="outline">
                          <a href={i.report_pdf_url} target="_blank" rel="noreferrer">
                            <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </li>

                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <InspectionTemplatesPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
