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
import { ArrowLeft, Upload, Download, CheckCircle2, AlertTriangle, Trash2, Calendar, Plus, Camera, PenLine, Gauge } from "lucide-react";
import { useInspectionDetail, type InspectionItem } from "@/hooks/usePropertyInspections";
import { Select, SelectContent, SelectItem as SelectItemUI, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import html2pdf from "html2pdf.js";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { CreateInspectionDialog } from "@/components/inspection-v2/CreateInspectionDialog";
import { SignaturePad } from "@/components/inspection/SignaturePad";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CONDITION_LABELS: Record<string, { label: string; cls: string }> = {
  excellent: { label: "Excellent", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" },
  good: { label: "Bon", cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200" },
  acceptable: { label: "Acceptable", cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200" },
  damaged: { label: "Abîmé", cls: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200" },
  broken: { label: "Cassé / HS", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200" },
  missing: { label: "Manquant", cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200" },
};


const TYPE_LABELS: Record<string, string> = {
  entry: "État d'entrée",
  exit: "État de sortie",
  inventory: "Inventaire",
  maintenance: "Visite maintenance",
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
  const { inspection, photos, items, audit, updateInspection, uploadPhoto, deletePhoto, uploadSignature, updateItem, addItem, deleteItem } = useInspectionDetail(id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [room, setRoom] = useState("");
  const [caption, setCaption] = useState("");
  const [editDateOpen, setEditDateOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [createExitOpen, setCreateExitOpen] = useState(false);

  // Find a child exit inspection if it exists (workflow continuation)
  const { data: childExit } = useQuery({
    queryKey: ["inspection-child-exit", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await (supabase as any)
        .from("property_inspections")
        .select("id, status, official_date, inspection_type")
        .eq("parent_inspection_id", id)
        .eq("inspection_type", "exit")
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

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

  const hasBothSignatures = !!(insp.concierge_signature_url && insp.guest_signature_url);
  const hasPhotos = (photos.data?.length ?? 0) > 0;
  const canValidate = hasBothSignatures && hasPhotos;

  const validateInspection = () => {
    if (!canValidate) {
      const missing: string[] = [];
      if (!hasPhotos) missing.push("au moins 1 photo");
      if (!insp.concierge_signature_url) missing.push("signature gestionnaire");
      if (!insp.guest_signature_url) missing.push("signature voyageur");
      toast.error(`Manquant : ${missing.join(", ")}`);
      return;
    }
    updateInspection.mutate({ status: "validated", signed_at: new Date().toISOString() } as any);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <SEOHead title={`État des lieux ${insp.property?.name}`} description="" />

      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/etats-des-lieux")}>
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
            <Badge variant="outline">{TYPE_LABELS[insp.inspection_type] ?? insp.inspection_type}</Badge>
            <Badge variant="outline">{STATUS_OPTIONS.find((s) => s.value === insp.status)?.label ?? insp.status}</Badge>
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

      {/* Workflow protectif: État d'entrée → État de sortie */}
      {insp.inspection_type === "entry" && (
        <Card className="border-l-4 border-l-black">
          <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-black" />
                Workflow état des lieux complet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {insp.status !== "validated"
                  ? "Validez l'état d'entrée, puis créez l'état de sortie en fin de séjour pour vous protéger."
                  : childExit
                    ? `État de sortie en cours (${childExit.status === "validated" ? "validé" : "non validé"} — ${new Date(childExit.official_date).toLocaleDateString("fr-FR")}).`
                    : "L'état d'entrée est validé. Créez maintenant l'état de sortie pour clôturer le séjour."}
              </p>
            </div>
            {childExit ? (
              <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/etats-des-lieux/${childExit.id}`)}>
                Ouvrir l'état de sortie →
              </Button>
            ) : (
              insp.status === "validated" && (
                <Button size="sm" onClick={() => setCreateExitOpen(true)} className="bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-1" /> Créer l'état de sortie
                </Button>
              )
            )}
          </CardContent>
        </Card>
      )}

      <CreateInspectionDialog
        open={createExitOpen}
        onOpenChange={setCreateExitOpen}
        defaultPropertyId={insp.property_id}
        defaultType="exit"
        parentInspectionId={insp.id}
        onCreated={(newId) => navigate(`/dashboard/etats-des-lieux/${newId}`)}
      />

      <Tabs defaultValue="items">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="items">1. Checklist</TabsTrigger>
          <TabsTrigger value="photos">2. Photos</TabsTrigger>
          <TabsTrigger value="meters">3. Compteurs & notes</TabsTrigger>
          <TabsTrigger value="signatures">
            4. Signatures
            {hasBothSignatures && <CheckCircle2 className="h-3.5 w-3.5 ml-1 text-emerald-600" />}
          </TabsTrigger>
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

        {/* TAB METERS & NOTES */}
        <TabsContent value="meters" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gauge className="h-4 w-4" /> Relevés de compteurs</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Électricité (kWh)</Label>
                <Input
                  defaultValue={insp.meter_electricity ?? ""}
                  onBlur={(e) => e.target.value !== (insp.meter_electricity ?? "") && updateInspection.mutate({ meter_electricity: e.target.value } as any)}
                />
              </div>
              <div>
                <Label>Eau (m³)</Label>
                <Input
                  defaultValue={insp.meter_water ?? ""}
                  onBlur={(e) => e.target.value !== (insp.meter_water ?? "") && updateInspection.mutate({ meter_water: e.target.value } as any)}
                />
              </div>
              <div>
                <Label>Gaz (m³)</Label>
                <Input
                  defaultValue={insp.meter_gas ?? ""}
                  onBlur={(e) => e.target.value !== (insp.meter_gas ?? "") && updateInspection.mutate({ meter_gas: e.target.value } as any)}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Notes & dommages</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Nombre d'occupants</Label>
                <Input
                  type="number"
                  defaultValue={insp.occupants_count ?? ""}
                  onBlur={(e) => updateInspection.mutate({ occupants_count: e.target.value ? parseInt(e.target.value) : null } as any)}
                  className="max-w-[140px]"
                />
              </div>
              <div>
                <Label>Notes générales</Label>
                <Textarea
                  defaultValue={insp.notes ?? ""}
                  onBlur={(e) => e.target.value !== (insp.notes ?? "") && updateInspection.mutate({ notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>Dommages observés</Label>
                <Textarea
                  defaultValue={insp.damage_notes ?? ""}
                  onBlur={(e) => e.target.value !== (insp.damage_notes ?? "") && updateInspection.mutate({ damage_notes: e.target.value } as any)}
                  rows={3}
                  placeholder="Rayures, taches, casse..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB SIGNATURES */}
        <TabsContent value="signatures" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <PenLine className="h-4 w-4 mt-0.5 flex-shrink-0" />
                Les deux parties doivent signer pour valider l'état des lieux. La validation est nécessaire pour finaliser et protéger juridiquement le document.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SignatureCard
              title="Gestionnaire / Concierge"
              existingUrl={insp.concierge_signature_url}
              existingName={insp.concierge_signer_name}
              onSave={(dataUrl, name) => uploadSignature.mutate({ type: "concierge", dataUrl, signerName: name })}
              pending={uploadSignature.isPending}
            />
            <SignatureCard
              title="Voyageur"
              existingUrl={insp.guest_signature_url}
              existingName={insp.guest_signer_name}
              onSave={(dataUrl, name) => uploadSignature.mutate({ type: "guest", dataUrl, signerName: name })}
              pending={uploadSignature.isPending}
            />
          </div>

          {!canValidate && insp.status !== "validated" && (
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Pour valider l'état des lieux, complétez :
                </p>
                <ul className="text-sm text-muted-foreground mt-2 ml-6 list-disc">
                  {!hasPhotos && <li>Au moins 1 photo</li>}
                  {!insp.concierge_signature_url && <li>Signature du gestionnaire</li>}
                  {!insp.guest_signature_url && <li>Signature du voyageur</li>}
                </ul>
              </CardContent>
            </Card>
          )}
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
      <div id="inspection-pdf-content" style={{ position: "absolute", left: -9999, top: 0, width: "210mm", padding: "20mm", background: "#fff", color: "#000000", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>État des lieux — {insp.inspection_type}</h1>
        <p style={{ fontSize: 14, margin: 0 }}><strong>Bien :</strong> {insp.property?.name}</p>
        {insp.property?.address && <p style={{ fontSize: 14, margin: 0 }}>{insp.property.address}</p>}
        <p style={{ fontSize: 14, marginTop: 8 }}>
          <strong>Date :</strong> {new Date(insp.official_date).toLocaleDateString("fr-FR")}
        </p>
        {insp.guest_name && <p style={{ fontSize: 14, margin: 0 }}><strong>Voyageur :</strong> {insp.guest_name}</p>}
        <hr style={{ margin: "12px 0", borderColor: "#FFFFFF" }} />

        {Object.entries(photosByRoom).map(([rn, list]) => (
          <section key={rn} style={{ marginBottom: 16, breakInside: "avoid" }}>
            <h2 style={{ fontSize: 16, color: "#FFFFFF" }}>{rn}</h2>
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

function ItemsChecklist({
  items, loading, onUpdate, onAdd, onDelete, onAttachPhoto,
}: {
  items: InspectionItem[];
  loading: boolean;
  onUpdate: (itemId: string, patch: Partial<InspectionItem>) => void;
  onAdd: (roomName: string, itemName: string) => void;
  onDelete: (itemId: string) => void;
  onAttachPhoto: (item: InspectionItem, file: File) => Promise<void>;
}) {
  const [newRoom, setNewRoom] = useState("");
  const [newItem, setNewItem] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [quickItem, setQuickItem] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  if (loading) {
    return <Card><CardContent className="pt-6"><Skeleton className="h-40" /></CardContent></Card>;
  }

  const grouped = items.reduce<Record<string, InspectionItem[]>>((acc, it) => {
    (acc[it.room_name] ||= []).push(it);
    return acc;
  }, {});
  const roomNames = Object.keys(grouped);

  const completion = items.length === 0 ? 0
    : Math.round((items.filter((i) => i.condition !== "good" || i.notes).length + items.filter((i) => i.condition === "good").length) / items.length * 100);

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <Card>
          <CardContent className="py-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{items.length}</strong> items répartis sur {roomNames.length} pièce{roomNames.length > 1 ? "s" : ""}
            </p>
            <Badge variant="outline">{completion}% checké</Badge>
          </CardContent>
        </Card>
      )}

      {items.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Aucun item dans cette checklist. Ajoutez une pièce ou créez votre premier item ci-dessous.
            </p>
          </CardContent>
        </Card>
      )}

      {roomNames.map((roomName) => (
        <Card key={roomName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{roomName} ({grouped[roomName].length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {grouped[roomName].map((item) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2 bg-card">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm flex-1 min-w-[140px]">{item.item_name}</p>
                  <Select
                    value={item.condition}
                    onValueChange={(v) => onUpdate(item.id, { condition: v })}
                  >
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                        <SelectItemUI key={k} value={k}>{v.label}</SelectItemUI>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className={CONDITION_LABELS[item.condition]?.cls ?? ""}>
                    {CONDITION_LABELS[item.condition]?.label ?? item.condition}
                  </Badge>
                  <input
                    ref={(el) => { fileInputs.current[item.id] = el; }}
                    type="file"
                    accept="image/*"
                    style={{ opacity: 0, position: "absolute", pointerEvents: "none", width: 0, height: 0 }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onAttachPhoto(item, f);
                      e.target.value = "";
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={() => fileInputs.current[item.id]?.click()}>
                    <Camera className="h-3.5 w-3.5 mr-1" /> Photo
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <Textarea
                  value={item.notes ?? ""}
                  onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
                  placeholder="Notes (rayures, marques, fonctionnement...)"
                  rows={1}
                  className="text-sm"
                />
              </div>
            ))}

            {addingTo === roomName ? (
              <div className="flex gap-2">
                <Input
                  value={quickItem}
                  onChange={(e) => setQuickItem(e.target.value)}
                  placeholder="Nouvel item"
                  className="h-8"
                />
                <Button size="sm" onClick={() => {
                  if (quickItem.trim()) {
                    onAdd(roomName, quickItem.trim());
                    setQuickItem("");
                    setAddingTo(null);
                  }
                }}>Ajouter</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setQuickItem(""); }}>×</Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setAddingTo(roomName)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Item
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ajouter une nouvelle pièce</CardTitle></CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            placeholder="Nom de la pièce (ex: Cuisine)"
          />
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Premier item (optionnel)"
          />
          <Button onClick={() => {
            if (!newRoom.trim()) return;
            onAdd(newRoom.trim(), newItem.trim() || "À compléter");
            setNewRoom(""); setNewItem("");
          }}>
            <Plus className="h-4 w-4 mr-1" /> Pièce
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SignatureCard({
  title, existingUrl, existingName, onSave, pending,
}: {
  title: string;
  existingUrl?: string | null;
  existingName?: string | null;
  onSave: (dataUrl: string, name: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(existingName ?? "");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          {title}
          {existingUrl && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Signé</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {existingUrl ? (
          <div className="space-y-2">
            <img src={existingUrl} alt={`Signature ${title}`} className="border rounded-md bg-white max-h-32" />
            {existingName && <p className="text-sm text-muted-foreground">Signé par <strong className="text-foreground">{existingName}</strong></p>}
            <p className="text-xs text-muted-foreground">Re-signer pour remplacer.</p>
          </div>
        ) : null}
        <div>
          <Label>Nom du signataire</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" />
        </div>
        <SignaturePad label="Signature" onSignatureChange={setDataUrl} />
        <Button
          size="sm"
          disabled={!dataUrl || !name.trim() || pending}
          onClick={() => dataUrl && onSave(dataUrl, name.trim())}
          className="bg-primary text-primary-foreground"
        >
          <PenLine className="h-4 w-4 mr-1" /> Enregistrer la signature
        </Button>
      </CardContent>
    </Card>
  );
}
