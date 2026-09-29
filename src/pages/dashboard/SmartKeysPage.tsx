import { FormEvent, useDeferredValue, useMemo, useState } from "react";
import { useProperties } from "@/hooks/useProperties";
import { useBookings } from "@/hooks/useBookings";
import { KeyHolderType, KeySet, KeySetInput, KeySetItem, KeySetRole, KeySetStatus, useKeyMovements, useKeySets, usePropertyBooklets } from "@/hooks/useKeySets";
import { generateKeyLabelPdf } from "@/lib/key-label-pdf";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, Archive, CheckCircle2, Clock3, Download, History, KeyRound, Loader2, MapPin, Minus, Nfc, PackageCheck, Plus, Search, Trash2, UserRoundCheck } from "lucide-react";

const roleLabels: Record<KeySetRole, string> = { traveler: "Voyageurs", cleaning: "Équipe de ménage", owner: "Propriétaire", emergency: "Secours", other: "Autre" };
const statusLabels: Record<KeySetStatus, string> = { stored: "Au stock", assigned: "Attribuée", lockbox: "En boîte à clés", owner: "Chez le propriétaire", cleaning: "Avec le ménage", missing: "Manquante", incomplete: "Incomplète" };
const holderLabels: Record<KeyHolderType, string> = { guest: "Voyageur", owner: "Propriétaire", provider: "Prestataire", team: "Équipe interne", lockbox: "Boîte à clés", storage: "Stock Azure Keys", other: "Autre" };
const statusClass: Record<KeySetStatus, string> = {
  stored: "bg-emerald-50 text-emerald-700 border-emerald-200", assigned: "bg-blue-50 text-blue-700 border-blue-200",
  lockbox: "bg-cyan-50 text-cyan-700 border-cyan-200", owner: "bg-violet-50 text-violet-700 border-violet-200",
  cleaning: "bg-amber-50 text-amber-800 border-amber-200", missing: "bg-red-50 text-red-700 border-red-200",
  incomplete: "bg-orange-50 text-orange-700 border-orange-200",
};
const emptyForm: KeySetInput = {
  property_id: "", booklet_id: null, code: "", name: "", pouch_role: "traveler",
  expected_items: [{ label: "Clé de la porte d'entrée", quantity: 1 }], label_address: "", arrival_instructions: "",
};
const formatAddress = (property?: { address?: string | null; postcode?: string | null; city?: string | null }) =>
  [property?.address, property?.postcode, property?.city].filter(Boolean).join(", ");

function makeCode(propertyName: string, existingCount: number) {
  const initials = propertyName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(Boolean).slice(0, 3).map((word) => word[0]).join("").toUpperCase() || "LOG";
  return `AK-${initials}-${String(existingCount + 1).padStart(2, "0")}`;
}

export default function SmartKeysPage() {
  const { keySets, isLoading, createKeySet, transferKeySet, removeKeySet, isSaving } = useKeySets();
  const { properties } = useProperties();
  const { booklets } = usePropertyBooklets();
  const { bookings } = useBookings();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<KeySetInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [selected, setSelected] = useState<KeySet | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelSize, setLabelSize] = useState({ width: 70, height: 50 });
  const [transfer, setTransfer] = useState({ status: "stored" as KeySetStatus, holder_type: "storage" as KeyHolderType, holder_label: "", booking_id: "", due_back_at: "", note: "" });

  const filteredKeySets = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return keySets;
    return keySets.filter((item) => [item.code, item.name, item.property?.name, item.current_holder_label].filter(Boolean).some((value) => value!.toLowerCase().includes(term)));
  }, [keySets, deferredSearch]);
  const metrics = useMemo(() => ({
    total: keySets.length,
    outside: keySets.filter((item) => item.status !== "stored").length,
    alerts: keySets.filter((item) => item.status === "missing" || item.status === "incomplete").length,
    checked: keySets.filter((item) => item.last_checked_at).length,
  }), [keySets]);

  const selectProperty = (propertyId: string) => {
    const property = properties.find((item) => item.id === propertyId);
    const booklet = booklets.find((item) => item.property_id === propertyId);
    const propertyKeySets = keySets.filter((item) => item.property_id === propertyId).length;
    setForm((current) => ({ ...current, property_id: propertyId, booklet_id: booklet?.id ?? null,
      code: current.code || makeCode(property?.name || "Logement", propertyKeySets),
      name: current.name || `Pochette ${property?.name || "logement"}`,
      label_address: formatAddress(property) || booklet?.property_address || "",
      arrival_instructions: current.arrival_instructions || booklet?.checkin_procedure || "",
    }));
  };
  const updateItem = (index: number, patch: Partial<KeySetItem>) => setForm((current) => ({ ...current, expected_items: current.expected_items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault(); setFormError(null);
    if (!form.property_id || !form.code.trim() || !form.name.trim()) { setFormError("Le logement, le code et le nom de la pochette sont obligatoires."); return; }
    const cleanItems = form.expected_items.map((item) => ({ label: item.label.trim(), quantity: Math.max(1, Number(item.quantity) || 1) })).filter((item) => item.label);
    if (!cleanItems.length) { setFormError("Ajoutez au moins un élément attendu dans la pochette."); return; }
    await createKeySet({ ...form, expected_items: cleanItems }); setCreateOpen(false); setForm(emptyForm);
  };
  const openTransfer = (keySet: KeySet) => {
    setSelected(keySet); setTransfer({ status: keySet.status, holder_type: keySet.current_holder_type, holder_label: keySet.current_holder_label || "", booking_id: keySet.current_booking_id || "", due_back_at: keySet.due_back_at ? keySet.due_back_at.slice(0, 16) : "", note: "" }); setTransferOpen(true);
  };
  const submitTransfer = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    await transferKeySet({ id: selected.id, status: transfer.status, holder_type: transfer.holder_type, holder_label: transfer.holder_label || null, booking_id: transfer.booking_id || null, due_back_at: transfer.due_back_at ? new Date(transfer.due_back_at).toISOString() : null, note: transfer.note || null });
    setTransferOpen(false);
  };
  const nfcUrl = (keySet: KeySet) => `${window.location.origin}/cles/${keySet.public_token}`;
  const copyNfcUrl = async (keySet: KeySet) => { await navigator.clipboard.writeText(nfcUrl(keySet)); toast.success("Lien NFC copié"); };
  const openLabel = (keySet: KeySet) => { setSelected(keySet); setLabelOpen(true); };
  const downloadLabel = async () => {
    if (!selected) return;
    await generateKeyLabelPdf(selected, { widthMm: labelSize.width, heightMm: labelSize.height, nfcUrl: nfcUrl(selected), brandName: "AZURE KEYS PROPERTIES" });
    setLabelOpen(false); toast.success("Étiquette PDF générée");
  };

  return <div className="space-y-6 p-4 sm:p-6 max-w-[1500px] mx-auto">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-3"><div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm"><KeyRound className="h-6 w-6" aria-hidden="true" /></div><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Exploitation</p><h1 className="text-2xl sm:text-3xl font-display font-bold">Pochettes de clés</h1></div></div>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Sachez à tout moment où se trouve chaque pochette, ce qu'elle contient et qui doit la restituer.</p>
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild><Button className="min-h-11 w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Nouvelle pochette</Button></DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <form onSubmit={submitCreate}><DialogHeader><DialogTitle>Créer une pochette physique</DialogTitle></DialogHeader>
            <div className="space-y-6 py-5">
              <section className="space-y-4" aria-labelledby="identity-section"><h2 id="identity-section" className="font-semibold">1. Identification</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="property">Logement *</Label><Select value={form.property_id} onValueChange={selectProperty}><SelectTrigger id="property" className="min-h-11"><SelectValue placeholder="Choisir un logement" /></SelectTrigger><SelectContent>{properties.map((property) => <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="key-code">Code unique *</Label><Input id="key-code" className="min-h-11 font-mono uppercase" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="AK-VB-01" /></div>
                  <div className="space-y-2"><Label htmlFor="key-role">Usage principal</Label><Select value={form.pouch_role} onValueChange={(value: KeySetRole) => setForm({ ...form, pouch_role: value })}><SelectTrigger id="key-role" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(roleLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="key-name">Nom de la pochette *</Label><Input id="key-name" className="min-h-11" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Pochette voyageurs - Villa Bianca" /></div>
                </div>
              </section>
              <section className="space-y-3 border-t pt-5" aria-labelledby="contents-section">
                <div className="flex items-center justify-between gap-3"><h2 id="contents-section" className="font-semibold">2. Contenu attendu</h2><Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, expected_items: [...form.expected_items, { label: "", quantity: 1 }] })}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button></div>
                {form.expected_items.map((item, index) => <div key={index} className="grid grid-cols-[1fr_88px_44px] gap-2 items-end">
                  <div className="space-y-2"><Label htmlFor={`item-${index}`}>Élément {index + 1}</Label><Input id={`item-${index}`} className="min-h-11" value={item.label} onChange={(event) => updateItem(index, { label: event.target.value })} placeholder="Clé portail, badge, télécommande…" /></div>
                  <div className="space-y-2"><Label htmlFor={`quantity-${index}`}>Qté</Label><Input id={`quantity-${index}`} className="min-h-11" type="number" min={1} max={20} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /></div>
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={`Retirer l'élément ${index + 1}`} disabled={form.expected_items.length === 1} onClick={() => setForm({ ...form, expected_items: form.expected_items.filter((_, itemIndex) => itemIndex !== index) })}><Minus className="h-4 w-4" /></Button>
                </div>)}
              </section>
              <section className="space-y-4 border-t pt-5" aria-labelledby="label-section"><h2 id="label-section" className="font-semibold">3. Étiquette et NFC</h2>
                <div className="space-y-2"><Label htmlFor="label-address">Adresse imprimée sur l'étiquette</Label><Input id="label-address" className="min-h-11" value={form.label_address || ""} onChange={(event) => setForm({ ...form, label_address: event.target.value })} /><p className="text-xs text-muted-foreground">Cette adresse sera physiquement visible sur la pochette.</p></div>
                <div className="space-y-2"><Label htmlFor="arrival-instructions">Procédure courte d'arrivée</Label><Textarea id="arrival-instructions" value={form.arrival_instructions || ""} onChange={(event) => setForm({ ...form, arrival_instructions: event.target.value })} rows={3} maxLength={320} placeholder="Bâtiment B, entrée côté piscine, 1er étage…" /><p className="text-xs text-muted-foreground">Le livret associé sera ouvert automatiquement lorsqu'un voyageur scannera la puce.</p></div>
                <div className="space-y-2"><Label htmlFor="booklet">Livret d'accueil lié</Label><Select value={form.booklet_id || "none"} onValueChange={(value) => setForm({ ...form, booklet_id: value === "none" ? null : value })}><SelectTrigger id="booklet" className="min-h-11"><SelectValue placeholder="Aucun livret" /></SelectTrigger><SelectContent><SelectItem value="none">Aucun livret</SelectItem>{booklets.filter((booklet) => !form.property_id || booklet.property_id === form.property_id).map((booklet) => <SelectItem key={booklet.id} value={booklet.id}>{booklet.property_name || "Livret sans nom"} {booklet.status !== "published" ? "(brouillon)" : ""}</SelectItem>)}</SelectContent></Select></div>
              </section>
              {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{formError}</p>}
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Créer la pochette</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Résumé des pochettes"><MetricCard label="Pochettes" value={metrics.total} icon={Archive} /><MetricCard label="En circulation" value={metrics.outside} icon={UserRoundCheck} /><MetricCard label="Alertes" value={metrics.alerts} icon={AlertTriangle} alert={metrics.alerts > 0} /><MetricCard label="Déjà contrôlées" value={metrics.checked} icon={CheckCircle2} /></section>
    <Card><CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><CardTitle>Registre</CardTitle><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une pochette…" className="min-h-11 pl-9" aria-label="Rechercher une pochette" /></div></CardHeader>
      <CardContent>{isLoading ? <div className="py-14 text-center text-muted-foreground" aria-live="polite"><Loader2 className="h-7 w-7 mx-auto mb-3 animate-spin" />Chargement du registre…</div> : filteredKeySets.length === 0 ? <div className="py-14 text-center max-w-md mx-auto"><KeyRound className="h-12 w-12 text-primary/35 mx-auto mb-4" aria-hidden="true" /><h2 className="font-semibold">{keySets.length ? "Aucun résultat" : "Aucune pochette enregistrée"}</h2><p className="mt-2 text-sm text-muted-foreground">{keySets.length ? "Modifiez votre recherche." : "Créez la première pochette pour obtenir son étiquette PDF et son lien NFC."}</p>{!keySets.length && <Button className="mt-5" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Créer une pochette</Button>}</div> :
        <div className="grid gap-3 xl:grid-cols-2">{filteredKeySets.map((keySet) => <article key={keySet.id} className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono font-bold">{keySet.code}</span><Badge variant="outline" className={statusClass[keySet.status]}>{statusLabels[keySet.status]}</Badge><Badge variant="secondary">{roleLabels[keySet.pouch_role]}</Badge></div><h2 className="mt-2 font-semibold truncate">{keySet.name}</h2><p className="mt-1 text-sm text-muted-foreground flex items-start gap-1.5"><MapPin className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" /><span>{keySet.property?.name || "Logement inconnu"} — {keySet.label_address || formatAddress(keySet.property || undefined)}</span></p></div>
            <div className="flex items-center gap-2 shrink-0"><Button variant="outline" size="sm" onClick={() => openTransfer(keySet)}>Mouvement</Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Supprimer ${keySet.code}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer cette pochette ?</AlertDialogTitle><AlertDialogDescription>L'historique de la pochette {keySet.code} sera également supprimé. Cette action est irréversible après synchronisation.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => void removeKeySet(keySet.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Détenteur actuel</p><p className="mt-1 font-medium">{keySet.current_holder_label || holderLabels[keySet.current_holder_type]}</p></div><div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Contenu attendu</p><p className="mt-1 font-medium truncate">{keySet.expected_items?.map((item) => `${item.quantity}× ${item.label}`).join(" • ") || "Non renseigné"}</p></div></div>
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4"><Button variant="outline" size="sm" onClick={() => openLabel(keySet)}><Download className="h-4 w-4 mr-1.5" /> Étiquette PDF</Button><Button variant="outline" size="sm" onClick={() => void copyNfcUrl(keySet)}><Nfc className="h-4 w-4 mr-1.5" /> Copier lien NFC</Button><Button variant="ghost" size="sm" onClick={() => { setSelected(keySet); setHistoryOpen(true); }}><History className="h-4 w-4 mr-1.5" /> Historique</Button></div>
        </article>)}</div>}
      </CardContent></Card>

    <Dialog open={transferOpen} onOpenChange={setTransferOpen}><DialogContent className="max-w-lg"><form onSubmit={submitTransfer}><DialogHeader><DialogTitle>Enregistrer un mouvement — {selected?.code}</DialogTitle></DialogHeader><div className="space-y-4 py-5">
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="movement-status">Nouvel état</Label><Select value={transfer.status} onValueChange={(value: KeySetStatus) => setTransfer({ ...transfer, status: value })}><SelectTrigger id="movement-status" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="holder-type">Type de détenteur</Label><Select value={transfer.holder_type} onValueChange={(value: KeyHolderType) => setTransfer({ ...transfer, holder_type: value })}><SelectTrigger id="holder-type" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(holderLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></div>
      <div className="space-y-2"><Label htmlFor="holder-name">Nom du détenteur ou emplacement</Label><Input id="holder-name" className="min-h-11" value={transfer.holder_label} onChange={(event) => setTransfer({ ...transfer, holder_label: event.target.value })} placeholder="Mme Martin, équipe ménage, boîte portail…" /></div>
      <div className="space-y-2"><Label htmlFor="booking">Réservation liée</Label><Select value={transfer.booking_id || "none"} onValueChange={(value) => setTransfer({ ...transfer, booking_id: value === "none" ? "" : value })}><SelectTrigger id="booking" className="min-h-11"><SelectValue placeholder="Aucune réservation" /></SelectTrigger><SelectContent><SelectItem value="none">Aucune réservation</SelectItem>{bookings.filter((booking) => booking.property_id === selected?.property_id).slice(0, 30).map((booking) => <SelectItem key={booking.id} value={booking.id}>{booking.guest_name || "Voyageur"} — {new Date(booking.check_in).toLocaleDateString("fr-FR")} au {new Date(booking.check_out).toLocaleDateString("fr-FR")}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="due-back">Retour prévu</Label><Input id="due-back" className="min-h-11" type="datetime-local" value={transfer.due_back_at} onChange={(event) => setTransfer({ ...transfer, due_back_at: event.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="movement-note">Note</Label><Textarea id="movement-note" value={transfer.note} onChange={(event) => setTransfer({ ...transfer, note: event.target.value })} rows={3} placeholder="Contexte de la remise ou du contrôle…" /></div>
    </div><DialogFooter><Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>Annuler</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Enregistrer</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={labelOpen} onOpenChange={setLabelOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Générer l'étiquette — {selected?.code}</DialogTitle></DialogHeader><div className="space-y-5 py-4"><div className="rounded-xl border bg-muted/40 p-4 text-sm"><div className="flex items-center gap-2 font-semibold"><PackageCheck className="h-4 w-4" /> Étiquette logement</div><p className="mt-2 text-muted-foreground">Une seule étiquette est générée : logo centré en haut, informations du logement au centre et code logement centré en bas. L'étiquette NFC « Approchez votre téléphone » reste séparée et réutilisable.</p></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="label-width">Largeur (mm)</Label><Input id="label-width" className="min-h-11" type="number" min={35} max={210} value={labelSize.width} onChange={(event) => setLabelSize({ ...labelSize, width: Number(event.target.value) })} /></div><div className="space-y-2"><Label htmlFor="label-height">Hauteur (mm)</Label><Input id="label-height" className="min-h-11" type="number" min={25} max={297} value={labelSize.height} onChange={(event) => setLabelSize({ ...labelSize, height: Number(event.target.value) })} /></div></div><p className="text-xs text-muted-foreground">Valeur provisoire : 70 × 50 mm. Vous pourrez saisir les dimensions exactes dès réception des autocollants.</p></div><DialogFooter><Button variant="outline" onClick={() => setLabelOpen(false)}>Annuler</Button><Button onClick={() => void downloadLabel()}><Download className="h-4 w-4 mr-2" /> Télécharger le PDF</Button></DialogFooter></DialogContent></Dialog>
    <HistoryDialog keySet={selected} open={historyOpen} onOpenChange={setHistoryOpen} />
  </div>;
}

function MetricCard({ label, value, icon: Icon, alert = false }: { label: string; value: number; icon: typeof KeyRound; alert?: boolean }) {
  return <Card><CardContent className="p-4 sm:p-5 flex items-center gap-3"><div className={`h-10 w-10 rounded-lg flex items-center justify-center ${alert ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" aria-hidden="true" /></div><div><p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>;
}

function HistoryDialog({ keySet, open, onOpenChange }: { keySet: KeySet | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { movements, isLoading } = useKeyMovements(open ? keySet?.id : undefined);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Historique — {keySet?.code}</DialogTitle></DialogHeader><div className="py-4">{isLoading ? <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Chargement…</div> : movements.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Aucun mouvement enregistré.</p> : <ol className="space-y-0">{movements.map((movement, index) => <li key={movement.id} className="relative pl-8 pb-6 last:pb-0">{index < movements.length - 1 && <span className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />}<span className="absolute left-0 top-0 h-6 w-6 rounded-full border bg-background flex items-center justify-center"><Clock3 className="h-3 w-3" /></span><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-medium">{movement.action.replaceAll("_", " ")}</p><time className="text-xs text-muted-foreground">{new Date(movement.occurred_at).toLocaleString("fr-FR")}</time></div><p className="mt-1 text-sm text-muted-foreground">{movement.holder_label || movement.holder_type || "Sans détenteur renseigné"}{movement.to_status ? ` — ${statusLabels[movement.to_status as KeySetStatus] || movement.to_status}` : ""}</p>{movement.note && <p className="mt-2 rounded-lg bg-muted p-2.5 text-sm">{movement.note}</p>}</li>)}</ol>}</div></DialogContent></Dialog>;
}
