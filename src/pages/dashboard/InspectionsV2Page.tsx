// MODULE — Page liste états des lieux flexibles
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, AlertTriangle, Search } from "lucide-react";
import { usePropertyInspections } from "@/hooks/usePropertyInspections";
import { CreateInspectionDialog } from "@/components/inspection-v2/CreateInspectionDialog";
import SEOHead from "@/components/SEOHead";

const TYPE_LABELS: Record<string, string> = {
  entry: "Entrée",
  exit: "Sortie",
  inventory: "Inventaire",
  maintenance: "Maintenance",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  validated: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
};

export default function InspectionsV2Page() {
  const { list } = usePropertyInspections();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.data?.filter((i) =>
      !q ||
      i.property?.name?.toLowerCase().includes(q) ||
      i.guest_name?.toLowerCase().includes(q),
    ) ?? [];
  }, [list.data, search]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <SEOHead title="États des lieux — Welkom" description="Gestion flexible des états des lieux avec antidatage" />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">États des lieux</h1>
          <p className="text-sm text-muted-foreground">
            Système flexible avec double datation (officielle + audit interne)
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> Nouvel état des lieux
        </Button>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher logement, voyageur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Tous les états des lieux</CardTitle></CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucun état des lieux. Cliquez sur "Nouvel état des lieux" pour commencer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logement</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date officielle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le (réel)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => {
                    const officialMs = new Date(i.official_date).getTime();
                    const actualMs = new Date(i.actual_created_at).getTime();
                    const isAntedated = Math.abs(actualMs - officialMs) > 86400_000;
                    return (
                      <TableRow
                        key={i.id}
                        className="cursor-pointer hover:bg-secondary/40"
                        onClick={() => navigate(`/dashboard/etats-des-lieux-v2/${i.id}`)}
                      >
                        <TableCell className="font-medium">{i.property?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TYPE_LABELS[i.inspection_type] ?? i.inspection_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{new Date(i.official_date).toLocaleDateString("fr-FR")}</span>
                            {isAntedated && (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 gap-1">
                                <AlertTriangle className="h-3 w-3" /> Antidaté
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[i.status] ?? ""}>
                            {i.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(i.actual_created_at).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">Ouvrir →</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateInspectionDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(id) => navigate(`/dashboard/etats-des-lieux-v2/${id}`)}
      />
    </div>
  );
}
