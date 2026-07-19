// MODULE — Page unifiée États des lieux (Inspections + Modèles)
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, AlertTriangle, Search, ListChecks, ClipboardList, Trash2 } from "lucide-react";
import { usePropertyInspections } from "@/hooks/usePropertyInspections";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreateInspectionDialog } from "@/components/inspection-v2/CreateInspectionDialog";
import InspectionTemplatesPage from "./InspectionTemplatesPage";
import SEOHead from "@/components/SEOHead";

const TYPE_LABELS: Record<string, string> = {
  entry: "Entrée",
  exit: "Sortie",
  inventory: "Inventaire",
  maintenance: "Maintenance",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  in_progress: "En cours",
  completed: "Terminé",
  validated: "Validé",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  validated: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
};

export default function InspectionsV2Page() {
  const { list, remove } = usePropertyInspections();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("inspections");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.data?.filter((i) =>
      !q ||
      i.property?.name?.toLowerCase().includes(q) ||
      i.guest_name?.toLowerCase().includes(q),
    ) ?? [];
  }, [list.data, search]);

  const stats = useMemo(() => {
    const all = list.data ?? [];
    return {
      total: all.length,
      drafts: all.filter((i) => i.status === "draft" || i.status === "in_progress").length,
      validated: all.filter((i) => i.status === "validated" || i.status === "completed").length,
    };
  }, [list.data]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <SEOHead title="États des lieux — Welkom" description="Gestion unifiée des états des lieux et modèles" />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">États des lieux</h1>
          <p className="text-sm text-muted-foreground">
            Inspections, modèles de checklist et historique en un seul endroit.
          </p>
        </div>
        {tab === "inspections" && (
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" /> Nouvel état des lieux
          </Button>
        )}
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inspections" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Inspections
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <ListChecks className="h-4 w-4" /> Modèles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="En cours" value={stats.drafts} accent="warning" />
            <StatCard label="Validés" value={stats.validated} accent="success" />
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher logement ou voyageur..."
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
                <div className="py-12 text-center space-y-3">
                  <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucun état des lieux pour le moment.
                  </p>
                  <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" /> Créer le premier
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Logement</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
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
                            onClick={() => navigate(`/dashboard/etats-des-lieux/${i.id}`)}
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
                                {STATUS_LABELS[i.status] ?? i.status}
                              </Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/etats-des-lieux/${i.id}`)}>
                                  Ouvrir →
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer cet état des lieux ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Cette action est irréversible. Les photos, items et historique liés seront supprimés.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => remove.mutate(i.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
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
        </TabsContent>

        <TabsContent value="templates" className="mt-4 -mx-4 md:-mx-6">
          <InspectionTemplatesPage />
        </TabsContent>
      </Tabs>

      <CreateInspectionDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(id) => navigate(`/dashboard/etats-des-lieux/${id}`)}
      />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: "warning" | "success" }) {
  const cls =
    accent === "warning" ? "text-yellow-700 dark:text-yellow-300"
      : accent === "success" ? "text-emerald-700 dark:text-emerald-300"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${cls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
