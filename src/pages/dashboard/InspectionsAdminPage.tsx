// MODULE — Page admin global des états des lieux (super_admin)
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";

export default function InspectionsAdminPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAllowed(false); return; }
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      setAllowed(!!data);
    })();
  }, []);

  const inspections = useQuery({
    queryKey: ["admin-inspections"],
    enabled: allowed === true,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("property_inspections")
        .select("id, official_date, actual_created_at, inspection_type, status, user_id, property:property_id(name)")
        .order("actual_created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const list = inspections.data ?? [];
    const total = list.length;
    const antedated = list.filter((i: any) =>
      Math.abs(new Date(i.actual_created_at).getTime() - new Date(i.official_date).getTime()) > 86400_000
    ).length;
    const validated = list.filter((i: any) => i.status === "validated").length;
    return { total, antedated, validated };
  }, [inspections.data]);

  if (allowed === null) {
    return <div className="p-6"><Skeleton className="h-8 w-48" /></div>;
  }
  if (!allowed) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <ShieldAlert className="h-10 w-10 mx-auto text-destructive" />
            <p className="font-medium">Accès refusé</p>
            <p className="text-sm text-muted-foreground">Cette page est réservée aux super administrateurs.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <SEOHead title="Admin · États des lieux — Welkom" description="Vue globale des états des lieux" />

      <header>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" /> Admin — États des lieux
        </h1>
        <p className="text-sm text-muted-foreground">Vue globale lecture seule sur tous les utilisateurs.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Total (récents)" value={stats.total} />
        <KpiCard label="Antidatés" value={stats.antedated} accent="warning" />
        <KpiCard label="Validés" value={stats.validated} accent="success" />
      </div>

      <Card>
        <CardHeader><CardTitle>Derniers états des lieux</CardTitle></CardHeader>
        <CardContent>
          {inspections.isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logement</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date officielle</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Écart</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(inspections.data ?? []).map((i: any) => {
                    const diffDays = Math.round(
                      (new Date(i.actual_created_at).getTime() - new Date(i.official_date).getTime()) / 86400_000
                    );
                    const flagged = Math.abs(diffDays) >= 1;
                    return (
                      <TableRow
                        key={i.id}
                        className="cursor-pointer hover:bg-secondary/40"
                        onClick={() => navigate(`/dashboard/etats-des-lieux-v2/${i.id}`)}
                      >
                        <TableCell className="font-medium">{i.property?.name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{i.inspection_type}</Badge></TableCell>
                        <TableCell>{new Date(i.official_date).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(i.actual_created_at).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          {flagged ? (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 gap-1">
                              <AlertTriangle className="h-3 w-3" /> {diffDays > 0 ? `+${diffDays}` : diffDays}j
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: "warning" | "success" }) {
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
