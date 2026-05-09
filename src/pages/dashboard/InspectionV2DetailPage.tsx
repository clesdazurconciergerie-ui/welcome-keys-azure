// MODULE — Page détail état des lieux v2
import { useParams, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Download, CheckCircle2, AlertTriangle, Trash2, Calendar, Plus, Camera } from "lucide-react";
import { useInspectionDetail, type InspectionItem } from "@/hooks/usePropertyInspections";
import { Select, SelectContent, SelectItem as SelectItemUI, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import html2pdf from "html2pdf.js";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

const CONDITION_LABELS: Record<string, { label: string; cls: string }> = {
  excellent: { label: "Excellent", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" },
  good: { label: "Bon", cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200" },
  acceptable: { label: "Acceptable", cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200" },
  damaged: { label: "Abîmé", cls: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200" },
  broken: { label: "Cassé / HS", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200" },
  missing: { label: "Manquant", cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200" },
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminé" },
  { value: "validated", label: "Validé" },
];

export default function InspectionV2DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { inspection, photos, items, audit, updateInspection, uploadPhoto, deletePhoto, updateItem, addItem, deleteItem } = useInspectionDetail(id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [room, setRoom] = useState("");
  const [caption, setCaption] = useState("");
  const [editDateOpen, setEditDateOpen] = useState(false);
  const [newDate, setNewDate] = useState("");

  if (inspection.isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }
  const insp = inspection.data;
  if (!insp) return <p className="p-6 text-muted-foreground">État des lieux introuvable</p>;

  const officialMs = new Date(insp.official_date).getTime();
  const actualMs = new Date(insp.actual_created_at).getTime();
  const isAntedated = Math.abs(actualMs - officialMs) > 86400_000;

  const photosByRoom = (photos.data ?? []).reduce<Record<string, typeof photos.data>>((acc, p) => {
    const k = p.room_name ?? "Sans pièce";
    (acc[k] ||= [] as any).push(p);
    return acc;
  }, {});

  const handleUpload = async (file: File) => {
    await uploadPhoto.mutateAsync({ file, roomName: room || undefined, caption: caption || undefined });
    setCaption("");
  };

  const exportPDF = async () => {
    toast.info("Génération du PDF en cours...");
    const node = document.getElementById("inspection-pdf-content");
    if (!node) return;
    try {
      await html2pdf().set({
        margin: 10,
        filename: `etat-des-lieux-${insp.property?.name?.replace(/\s+/g, "-")}-${insp.official_date}.pdf`,
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(node).save();
      toast.success("PDF téléchargé");
    } catch (e) {
      toast.error("Erreur génération PDF");
    }
  };

  const validateInspection = () => {
    updateInspection.mutate({ status: "validated" });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <SEOHead title={`État des lieux ${insp.property?.name}`} description="" />

      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/etats-des-lieux-v2")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Button>

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            État des lieux — {insp.property?.name}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-3.5 w-3.5" />
            Date officielle : <strong className="text-foreground">{new Date(insp.official_date).toLocaleDateString("fr-FR")}</strong>
            {isAntedated && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 gap-1 ml-2">
                <AlertTriangle className="h-3 w-3" /> Antidaté
              </Badge>
            )}
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{insp.inspection_type}</Badge>
            <Badge variant="outline">{insp.status}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { setNewDate(insp.official_date); setEditDateOpen(true); }}>
            Modifier date
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          {insp.status !== "validated" && (
            <Button size="sm" onClick={validateInspection} className="bg-primary text-primary-foreground">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Valider
            </Button>
          )}
        </div>
      </header>

      {editDateOpen && (
        <Card>
          <CardContent className="pt-4 flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1">
              <Label>Nouvelle date officielle</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <Button onClick={async () => { await updateInspection.mutateAsync({ official_date: newDate as any }); setEditDateOpen(false); }}>
              Enregistrer
            </Button>
            <Button variant="ghost" onClick={() => setEditDateOpen(false)}>Annuler</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="photos">
        <TabsList>
          <TabsTrigger value="photos">Photos & Pièces</TabsTrigger>
          <TabsTrigger value="items">Items détaillés</TabsTrigger>
          <TabsTrigger value="history">Historique ({audit.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* TAB PHOTOS */}
        <TabsContent value="photos" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Ajouter une photo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Pièce</Label>
                  <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Salon, Chambre 1..." />
                </div>
                <div>
                  <Label>Légende</Label>
                  <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ opacity: 0, position: "absolute", pointerEvents: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={uploadPhoto.isPending}>
                <Upload className="h-4 w-4 mr-2" />
                {uploadPhoto.isPending ? "Upload..." : "Choisir une photo"}
              </Button>
              <p className="text-xs text-muted-foreground">
                La photo sera officiellement datée du {new Date(insp.official_date).toLocaleDateString("fr-FR")} (héritée de l'état des lieux).
              </p>
            </CardContent>
          </Card>

          {Object.entries(photosByRoom).map(([roomName, list]) => (
            <Card key={roomName}>
              <CardHeader><CardTitle className="text-base">{roomName} ({list?.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {list?.map((p) => (
                    <figure key={p.id} className="rounded-lg border border-border overflow-hidden bg-card group relative">
                      <img src={p.file_url} alt={p.caption ?? "Photo"} className="w-full h-32 object-cover" />
                      <figcaption className="p-2 text-xs">
                        {p.caption && <p className="font-medium text-foreground truncate">{p.caption}</p>}
                        <p className="text-muted-foreground">
                          Prise le {new Date(p.official_date).toLocaleDateString("fr-FR")}
                        </p>
                      </figcaption>
                      <button
                        onClick={() => deletePhoto.mutate(p)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-card/90 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Supprimer photo"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </figure>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* TAB ITEMS */}
        <TabsContent value="items">
          <ItemsChecklist
            items={items.data ?? []}
            loading={items.isLoading}
            onUpdate={(itemId, patch) => updateItem.mutate({ itemId, patch })}
            onAdd={(room_name, item_name) => addItem.mutate({ room_name, item_name })}
            onDelete={(itemId) => deleteItem.mutate(itemId)}
            onAttachPhoto={async (item, file) => {
              await uploadPhoto.mutateAsync({
                file,
                roomName: item.room_name,
                caption: item.item_name,
                itemId: item.id,
              });
            }}
          />
        </TabsContent>

        {/* TAB HISTORY */}
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              {audit.isLoading ? <Skeleton className="h-32" /> : (
                <ol className="space-y-3">
                  {audit.data?.map((entry) => (
                    <li key={entry.id} className="border-l-2 border-accent pl-3 py-1">
                      <p className="text-sm text-foreground">
                        <strong className="capitalize">{entry.action.replace(/_/g, " ")}</strong>
                        {entry.field_changed && <> · {entry.field_changed}</>}
                      </p>
                      {(entry.old_value || entry.new_value) && (
                        <p className="text-xs text-muted-foreground">
                          {entry.old_value && <>De « {entry.old_value} » </>}
                          {entry.new_value && <>à « {entry.new_value} »</>}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString("fr-FR")}
                      </p>
                    </li>
                  ))}
                  {audit.data?.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun historique</p>
                  )}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hidden PDF content */}
      <div id="inspection-pdf-content" style={{ position: "absolute", left: -9999, top: 0, width: "210mm", padding: "20mm", background: "#fff", color: "#061452", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>État des lieux — {insp.inspection_type}</h1>
        <p style={{ fontSize: 14, margin: 0 }}><strong>Bien :</strong> {insp.property?.name}</p>
        {insp.property?.address && <p style={{ fontSize: 14, margin: 0 }}>{insp.property.address}</p>}
        <p style={{ fontSize: 14, marginTop: 8 }}>
          <strong>Date :</strong> {new Date(insp.official_date).toLocaleDateString("fr-FR")}
        </p>
        {insp.guest_name && <p style={{ fontSize: 14, margin: 0 }}><strong>Voyageur :</strong> {insp.guest_name}</p>}
        <hr style={{ margin: "12px 0", borderColor: "#C4A45B" }} />

        {Object.entries(photosByRoom).map(([rn, list]) => (
          <section key={rn} style={{ marginBottom: 16, breakInside: "avoid" }}>
            <h2 style={{ fontSize: 16, color: "#C4A45B" }}>{rn}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {list?.map((p) => (
                <figure key={p.id} style={{ margin: 0, breakInside: "avoid" }}>
                  <img src={p.file_url} crossOrigin="anonymous" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 4 }} />
                  <figcaption style={{ fontSize: 10, marginTop: 2 }}>
                    {p.caption ?? rn} — {new Date(p.official_date).toLocaleDateString("fr-FR")}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}

        {insp.notes && (
          <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 14 }}>Notes</h2>
            <p style={{ fontSize: 12 }}>{insp.notes}</p>
          </section>
        )}

        {(audit.data?.length ?? 0) > 0 && isAntedated && (
          <section style={{ marginTop: 16, borderTop: "1px solid #ccc", paddingTop: 8 }}>
            <h3 style={{ fontSize: 12 }}>Historique des modifications</h3>
            <ul style={{ fontSize: 10, paddingLeft: 16 }}>
              {audit.data?.slice(0, 10).map((e) => (
                <li key={e.id}>
                  {e.action} — {new Date(e.created_at).toLocaleString("fr-FR")}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p style={{ fontSize: 9, marginTop: 24, color: "#666" }}>
          Document généré le {new Date().toLocaleString("fr-FR")}
        </p>
      </div>
    </div>
  );
}
