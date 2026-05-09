// MODULE — Page propriétaire: états des lieux v2 (lecture seule)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { ClipboardCheck, Calendar, Home, Eye, Camera } from "lucide-react";
import { useState } from "react";

const TYPE_LABELS: Record<string, string> = {
  entry: "État d'entrée",
  exit: "État de sortie",
  inventory: "Inventaire",
  maintenance: "Maintenance",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", in_progress: "En cours", completed: "Terminé", validated: "Validé",
};
const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "warning"> = {
  draft: "outline", in_progress: "warning", completed: "secondary", validated: "success",
};

interface InspectionRow {
  id: string;
  property_id: string;
  official_date: string;
  inspection_type: string;
  status: string;
  guest_name: string | null;
  notes: string | null;
  property: { name: string; address: string | null } | null;
}

export default function OwnerInspectionsPage() {
  const [selected, setSelected] = useState<InspectionRow | null>(null);

  const { data: inspections, isLoading } = useQuery({
    queryKey: ["owner-property-inspections"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("property_inspections")
        .select("id, property_id, official_date, inspection_type, status, guest_name, notes, property:property_id(name, address)")
        .order("official_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InspectionRow[];
    },
  });

  const { data: photos } = useQuery({
    queryKey: ["owner-inspection-photos", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await (supabase as any)
        .from("inspection_photos")
        .select("id, file_url, caption, room_name, official_date")
        .eq("inspection_id", selected.id)
        .order("display_order");
      return data ?? [];
    },
    enabled: !!selected,
  });

  const { data: items } = useQuery({
    queryKey: ["owner-inspection-items", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await (supabase as any)
        .from("inspection_items")
        .select("id, room_name, item_name, condition, notes")
        .eq("inspection_id", selected.id)
        .order("display_order");
      return data ?? [];
    },
    enabled: !!selected,
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">États des lieux</h1>
        <p className="text-muted-foreground mt-1">Rapports complets pour vos biens (lecture seule)</p>
      </motion.div>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : !inspections || inspections.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="pt-6">
            <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-xl font-semibold mb-2">Aucun état des lieux</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Les rapports apparaîtront ici dès qu'un état des lieux sera créé par votre conciergerie.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {inspections.map((insp, idx) => (
            <motion.div key={insp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Home className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold truncate">{insp.property?.name ?? "Bien"}</span>
                        <Badge variant="outline">{TYPE_LABELS[insp.inspection_type] ?? insp.inspection_type}</Badge>
                        <Badge variant={STATUS_VARIANT[insp.status] ?? "outline"}>
                          {STATUS_LABELS[insp.status] ?? insp.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(insp.official_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        {insp.guest_name && <span>· {insp.guest_name}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(insp)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {TYPE_LABELS[selected.inspection_type] ?? selected.inspection_type} — {selected.property?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="font-medium">Date :</span> {new Date(selected.official_date).toLocaleDateString("fr-FR")}</div>
                  <div><span className="font-medium">Voyageur :</span> {selected.guest_name ?? "—"}</div>
                </div>

                {selected.notes && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium mb-1">Notes</p>
                    <p className="whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}

                {items && items.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Checklist ({items.length} items)</p>
                    <div className="space-y-1">
                      {items.map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between border rounded-md px-3 py-1.5 text-xs">
                          <span><strong>{it.room_name}</strong> · {it.item_name}</span>
                          <Badge variant="outline">{it.condition}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {photos && photos.length > 0 && (
                  <div>
                    <p className="font-medium mb-2 flex items-center gap-1">
                      <Camera className="w-4 h-4" /> Photos ({photos.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {photos.map((p: any) => (
                        <figure key={p.id} className="rounded-md overflow-hidden border">
                          <img src={p.file_url} alt={p.caption ?? ""} className="w-full h-32 object-cover" />
                          <figcaption className="text-[10px] p-1 truncate">
                            {p.room_name && <strong>{p.room_name} · </strong>}
                            {p.caption ?? new Date(p.official_date).toLocaleDateString("fr-FR")}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
