// MODULE — Liste compacte des états des lieux v2 (réutilisable: fiche bien + portail propriétaire)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const TYPE_LABELS: Record<string, string> = {
  entry: "Entrée", exit: "Sortie", inventory: "Inventaire", maintenance: "Maintenance",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", in_progress: "En cours", completed: "Terminé", validated: "Validé",
};
const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "warning"> = {
  draft: "outline", in_progress: "warning", completed: "secondary", validated: "success",
};

interface Props {
  propertyId: string;
  /** "owner" → liens vers /proprietaire/etats-des-lieux/:id ; "concierge" → /dashboard */
  basePath?: "owner" | "concierge";
  /** Affiche un CTA pour créer un nouvel état (concierge uniquement) */
  onCreate?: () => void;
}

export function PropertyInspectionsList({ propertyId, basePath = "concierge", onCreate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["property-inspections", "by-property", propertyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("property_inspections")
        .select("id, official_date, inspection_type, status, guest_name, parent_inspection_id")
        .eq("property_id", propertyId)
        .order("official_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId,
  });

  const detailHref = (id: string) =>
    basePath === "owner"
      ? `/proprietaire/etats-des-lieux/${id}`
      : `/dashboard/etats-des-lieux-v2/${id}`;

  if (isLoading) return <Skeleton className="h-32" />;

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun état des lieux pour ce bien.</p>
          {onCreate && (
            <Button onClick={onCreate} className="bg-primary text-primary-foreground">
              Créer le premier
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {onCreate && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onCreate} className="bg-primary text-primary-foreground">
            + Nouvel état des lieux
          </Button>
        </div>
      )}
      {data.map((i: any) => (
        <Link
          key={i.id}
          to={detailHref(i.id)}
          className="block border rounded-lg p-3 hover:bg-secondary/40 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{TYPE_LABELS[i.inspection_type] ?? i.inspection_type}</Badge>
            <Badge variant={STATUS_VARIANT[i.status] ?? "outline"}>
              {STATUS_LABELS[i.status] ?? i.status}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(i.official_date).toLocaleDateString("fr-FR")}
            </span>
            {i.guest_name && <span className="text-sm">· {i.guest_name}</span>}
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  );
}
