// MODULE — Page propriétaire : états des lieux de ses biens (lecture seule + PDF)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  ClipboardCheck, Calendar, Home, Eye, Camera, FileText, AlertTriangle, CheckCircle2, ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { StorageImage } from "@/components/StorageImage";
import {
  ZONE_LABEL, ISSUE_CATEGORY_LABEL, ISSUE_SEVERITY_LABEL,
  INSPECTION_STATUS_LABEL, INSPECTION_TYPE_LABEL,
} from "@/lib/inspection-zones";

interface InspectionRow {
  id: string;
  property_id: string;
  official_date: string;
  inspection_type: string;
  status: string;
  guest_name: string | null;
  notes: string | null;
  general_notes: string | null;
  reference: string | null;
  report_pdf_url: string | null;
  property: { name: string; address: string | null } | null;
}

export default function OwnerInspectionsPage() {
  const [selected, setSelected] = useState<InspectionRow | null>(null);

  const { data: inspections, isLoading } = useQuery({
    queryKey: ["owner-property-inspections"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("property_inspections")
        .select("id, property_id, official_date, inspection_type, status, guest_name, notes, general_notes, reference, report_pdf_url, property:property_id(name, address)")
        .order("official_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InspectionRow[];
    },
  });

  const { data: photos } = useQuery({
    queryKey: ["owner-inspection-photos", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("inspection_photos")
        .select("id, file_url, caption, zone_key, media_type, created_at")
        .eq("inspection_id", selected!.id)
        .order("created_at");
      return data ?? [];
    },
  });

  const { data: zones } = useQuery({
    queryKey: ["owner-inspection-zones", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("inspection_zones")
        .select("id, zone_key, zone_label, status, note")
        .eq("inspection_id", selected!.id)
        .order("display_order");
      return data ?? [];
    },
  });

  const { data: issues } = useQuery({
    queryKey: ["owner-inspection-issues", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("inspection_issues")
        .select("id, zone_key, category, severity, comment")
        .eq("inspection_id", selected!.id)
        .order("created_at");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">États des lieux</h1>
        <p className="text-muted-foreground mt-1">Rapports de vos biens, en lecture seule.</p>
      </motion.div>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : !inspections || inspections.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="pt-6">
            <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
            <h2 className="text-xl font-semibold mb-2">Aucun état des lieux</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Les rapports apparaîtront ici dès qu'un état des lieux sera réalisé par votre conciergerie.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {inspections.map((insp, idx) => (
            <motion.div key={insp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Home className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        <span className="font-semibold truncate">{insp.property?.name ?? "Bien"}</span>
                        <Badge variant="outline">{INSPECTION_TYPE_LABEL[insp.inspection_type] ?? insp.inspection_type}</Badge>
                        <Badge variant="outline">{INSPECTION_STATUS_LABEL[insp.status] ?? insp.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                          {new Date(insp.official_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        {insp.guest_name && <span>· {insp.guest_name}</span>}
                        {insp.reference && <span>· {insp.reference}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {insp.report_pdf_url && (
                        <Button asChild variant="outline" size="sm">
                          <a href={insp.report_pdf_url} target="_blank" rel="noreferrer" download>
                            <FileText className="w-4 h-4 mr-1.5" strokeWidth={1.5} /> PDF
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setSelected(insp)}>
                        <Eye className="w-4 h-4 mr-1.5" strokeWidth={1.5} /> Détail
                      </Button>
                    </div>
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
                  {INSPECTION_TYPE_LABEL[selected.inspection_type] ?? selected.inspection_type} — {selected.property?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Date :</span> {new Date(selected.official_date).toLocaleDateString("fr-FR")}</div>
                  <div><span className="text-muted-foreground">Voyageur :</span> {selected.guest_name ?? "—"}</div>
                </div>

                {zones && zones.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Zones contrôlées</p>
                    <div className="divide-y divide-border border-y border-border">
                      {zones.map((z: any) => (
                        <div key={z.id} className="flex items-center justify-between py-2">
                          <span>{ZONE_LABEL[z.zone_key] ?? z.zone_label}</span>
                          <span className="flex items-center gap-1.5 text-xs">
                            {z.status === "ok" && <><CheckCircle2 className="h-3.5 w-3.5" /> Conforme</>}
                            {z.status === "issue" && <><AlertTriangle className="h-3.5 w-3.5" /> Problème</>}
                            {z.status === "pending" && <><ShieldAlert className="h-3.5 w-3.5" /> Non contrôlée</>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {issues && issues.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium">Anomalies ({issues.length})</p>
                    {issues.map((i: any) => (
                      <div key={i.id} className="border border-border p-2 text-xs">
                        <strong>{ZONE_LABEL[i.zone_key] ?? i.zone_key}</strong> · {ISSUE_CATEGORY_LABEL[i.category] ?? i.category} · {ISSUE_SEVERITY_LABEL[i.severity] ?? i.severity}
                        {i.comment ? ` — ${i.comment}` : ""}
                      </div>
                    ))}
                  </div>
                )}

                {(selected.general_notes || selected.notes) && (
                  <div className="p-3 bg-muted/50">
                    <p className="font-medium mb-1">Notes</p>
                    <p className="whitespace-pre-wrap">{selected.general_notes || selected.notes}</p>
                  </div>
                )}

                {photos && photos.length > 0 && (
                  <div>
                    <p className="font-medium mb-2 flex items-center gap-1">
                      <Camera className="w-4 h-4" strokeWidth={1.5} /> Photos ({photos.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {photos.map((p: any) => (
                        <figure key={p.id} className="overflow-hidden border border-border">
                          {p.media_type === "video" ? (
                            <video src={p.file_url} controls className="w-full h-32 object-cover" />
                          ) : (
                            <StorageImage src={p.file_url} alt={p.caption ?? "Photo état des lieux"} className="w-full h-32 object-cover" />
                          )}
                          <figcaption className="text-[10px] p-1 truncate text-muted-foreground">
                            {ZONE_LABEL[p.zone_key ?? ""] ?? ""} · {new Date(p.created_at).toLocaleDateString("fr-FR")}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}

                {selected.report_pdf_url && (
                  <Button asChild className="w-full">
                    <a href={selected.report_pdf_url} target="_blank" rel="noreferrer" download>
                      <FileText className="w-4 h-4 mr-2" strokeWidth={1.5} /> Télécharger le PDF
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
