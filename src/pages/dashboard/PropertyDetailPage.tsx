import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, MapPin, Bed, Bath, Users, Ruler, Euro, Upload, Trash2, FileText,
  Download, Image as ImageIcon, Calendar, Loader2, User, Wrench, CheckCircle, Clock, AlertTriangle, XCircle, CalendarIcon, X, BookOpen, Link2, Unlink,
} from "lucide-react";
import { useCleaningInterventions } from "@/hooks/useCleaningInterventions";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProperties, type Property, type PropertyPhoto, type PropertyDocument } from "@/hooks/useProperties";
import { EditPropertyDialog } from "@/components/dashboard/properties/EditPropertyDialog";
import { PropertyCalendar } from "@/components/dashboard/properties/PropertyCalendar";

const typeLabels: Record<string, string> = {
  apartment: "Appartement", house: "Maison", villa: "Villa",
  studio: "Studio", loft: "Loft", chalet: "Chalet", other: "Autre",
};

const photoCategories = [
  { value: "general", label: "Général" },
  { value: "bedroom", label: "Chambre" },
  { value: "living", label: "Salon" },
  { value: "kitchen", label: "Cuisine" },
  { value: "bathroom", label: "Salle de bain" },
  { value: "exterior", label: "Extérieur" },
  { value: "other", label: "Autre" },
];

const docCategories = [
  { value: "mandat", label: "Mandat" },
  { value: "assurance", label: "Assurance" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "contrat", label: "Contrat" },
  { value: "facture", label: "Facture" },
  { value: "other", label: "Autre" },
];

const contractDocCategories = [
  { value: "carte_identite", label: "Carte d'identité" },
  { value: "passeport", label: "Passeport" },
  { value: "rib", label: "RIB" },
  { value: "kbis", label: "KBIS" },
  { value: "attestation_assurance", label: "Attestation assurance" },
  { value: "contrat_gestion", label: "Contrat de gestion" },
  { value: "bail", label: "Bail" },
  { value: "etat_des_lieux", label: "État des lieux" },
  { value: "autre_contrat", label: "Autre" },
];

const PropertyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, isLoading, fetchPhotos, uploadPhoto, deletePhoto, fetchDocuments, uploadDocument, deleteDocument, fetchPropertyOwners, updateProperty } = useProperties();
  const { interventions, deleteIntervention } = useCleaningInterventions('concierge');
  const [linkedBooklets, setLinkedBooklets] = useState<any[]>([]);
  const [allBooklets, setAllBooklets] = useState<any[]>([]);
  const [linkingBooklet, setLinkingBooklet] = useState(false);

  const [property, setProperty] = useState<Property | null>(null);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoCategory, setPhotoCategory] = useState("general");
  const [docCategory, setDocCategory] = useState("mandat");
  const [docName, setDocName] = useState("");
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleteInterventionId, setDeleteInterventionId] = useState<string | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);
  const [contractDocs, setContractDocs] = useState<PropertyDocument[]>([]);
  const [contractDocCategory, setContractDocCategory] = useState("carte_identite");
  const [contractDocName, setContractDocName] = useState("");
  const contractDocInputRef = useRef<HTMLInputElement>(null);

  const filteredInterventions = useMemo(() => {
    return interventions
      .filter(i => i.property_id === id)
      .filter(i => {
        const d = new Date(i.scheduled_date);
        if (filterDateFrom && d < filterDateFrom) return false;
        if (filterDateTo) {
          const end = new Date(filterDateTo);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  }, [interventions, id, filterDateFrom, filterDateTo]);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const docInputId = "doc-file-upload-" + (id || "x");
  const contractInputId = "contract-file-upload-" + (id || "x");
  const photoInputId = "photo-file-upload-" + (id || "x");

  useEffect(() => {
    if (!isLoading && id) {
      const found = properties.find(p => p.id === id);
      if (found) {
        setProperty(found);
      } else {
        navigate("/dashboard/logements");
      }
    }
  }, [isLoading, properties, id, navigate]);

  useEffect(() => {
    if (id) {
      fetchPhotos(id).then(setPhotos);
      fetchDocuments(id).then(docs => {
        const contractCats = contractDocCategories.map(c => c.value);
        setDocuments(docs.filter(d => !contractCats.includes(d.category)));
        setContractDocs(docs.filter(d => contractCats.includes(d.category)));
      });
      fetchPropertyOwners(id).then(setOwners);
      // Fetch linked booklets
      supabase.from("booklets").select("id, property_name, status, property_address, created_at").eq("property_id", id).then(({ data }) => setLinkedBooklets(data || []));
      // Fetch all user booklets for linking
      supabase.from("booklets").select("id, property_name, property_id").then(({ data }) => setAllBooklets(data || []));
    }
  }, [id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !id) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await uploadPhoto(id, file, photoCategory);
    }
    setPhotos(await fetchPhotos(id));
    setUploading(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const refreshDocs = async () => {
    if (!id) return;
    const docs = await fetchDocuments(id);
    const contractCats = contractDocCategories.map(c => c.value);
    setDocuments(docs.filter(d => !contractCats.includes(d.category)));
    setContractDocs(docs.filter(d => contractCats.includes(d.category)));
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    const name = docName.trim() || file.name.replace(/\.[^.]+$/, "");
    await uploadDocument(id, file, docCategory, name);
    await refreshDocs();
    setUploading(false);
    setDocName("");
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const handleContractDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    const name = contractDocName.trim() || file.name.replace(/\.[^.]+$/, "");
    await uploadDocument(id, file, contractDocCategory, name);
    await refreshDocs();
    setUploading(false);
    setContractDocName("");
    if (contractDocInputRef.current) contractDocInputRef.current.value = "";
  };

  const handleDeletePhoto = async () => {
    if (!deletePhotoId || !id) return;
    await deletePhoto(deletePhotoId);
    setPhotos(await fetchPhotos(id));
    setDeletePhotoId(null);
  };

  const handleDeleteDoc = async () => {
    if (!deleteDocId || !id) return;
    await deleteDocument(deleteDocId);
    await refreshDocs();
    setDeleteDocId(null);
  };

  if (isLoading || !property) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/logements")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{property.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{property.address}{property.city ? `, ${property.city}` : ""}</span>
              <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                {typeLabels[property.property_type || "apartment"]}
              </Badge>
            </div>
          </div>
          <Button onClick={() => setEditOpen(true)} variant="outline">Modifier</Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { icon: Users, label: "Capacité", value: property.capacity ? `${property.capacity} pers.` : "—" },
            { icon: Bed, label: "Chambres", value: property.bedrooms ?? "—" },
            { icon: Bath, label: "SdB", value: property.bathrooms ?? "—" },
            { icon: Ruler, label: "Surface", value: property.surface_m2 ? `${property.surface_m2} m²` : "—" },
            { icon: Euro, label: "Tarif / nuit", value: property.avg_nightly_rate ? `${property.avg_nightly_rate}€` : "—" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 flex items-center gap-2">
                <s.icon className="h-4 w-4 text-[hsl(var(--gold))]" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm font-semibold text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      <Tabs defaultValue="photos" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="contrat">Contrat</TabsTrigger>
          <TabsTrigger value="livrets">Livrets</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          <TabsTrigger value="owners">Propriétaires</TabsTrigger>
        </TabsList>

        {/* PHOTOS TAB */}
        <TabsContent value="photos" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={photoCategory} onValueChange={setPhotoCategory}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {photoCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <label
              className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-10 px-4 py-2 cursor-pointer bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))]", uploading && "pointer-events-none opacity-50")}>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="absolute w-0 h-0 opacity-0 overflow-hidden" onChange={handlePhotoUpload} />
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Ajouter des photos
            </label>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aucune photo. Ajoutez des photos de ce bien.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map(photo => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border aspect-square">
                  <img src={photo.url} alt={photo.caption || ""} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                    <Badge variant="secondary" className="text-[9px]">
                      {photoCategories.find(c => c.value === photo.category)?.label || photo.category}
                    </Badge>
                    <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => setDeletePhotoId(photo.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={docCategory} onValueChange={setDocCategory}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {docCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Nom du document" className="w-52" maxLength={200} />
            <label
              className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-10 px-4 py-2 cursor-pointer bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))]", uploading && "pointer-events-none opacity-50")}>
              <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="absolute w-0 h-0 opacity-0 overflow-hidden" onChange={handleDocUpload} />
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Ajouter
            </label>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aucun document. Ajoutez mandats, assurances, diagnostics…</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <Card key={doc.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-[hsl(var(--gold))] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="text-[9px]">
                            {docCategories.find(c => c.value === doc.category)?.label || doc.category}
                          </Badge>
                          {doc.file_size && <span>{(doc.file_size / 1024).toFixed(0)} Ko</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" asChild className="h-8 w-8">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteDocId(doc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CONTRAT TAB */}
        <TabsContent value="contrat" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={contractDocCategory} onValueChange={setContractDocCategory}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {contractDocCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={contractDocName} onChange={e => setContractDocName(e.target.value)} placeholder="Nom du document" className="w-52" maxLength={200} />
            <label
              className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold h-10 px-4 py-2 cursor-pointer bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))]", uploading && "pointer-events-none opacity-50")}>
              <input ref={contractDocInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="absolute w-0 h-0 opacity-0 overflow-hidden" onChange={handleContractDocUpload} />
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Ajouter
            </label>
          </div>

          {contractDocs.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aucun document contractuel. Ajoutez carte d'identité, RIB, contrat de gestion…</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contractDocs.map(doc => (
                <Card key={doc.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-[hsl(var(--gold))] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="text-[9px]">
                            {contractDocCategories.find(c => c.value === doc.category)?.label || doc.category}
                          </Badge>
                          {doc.file_size && <span>{(doc.file_size / 1024).toFixed(0)} Ko</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" asChild className="h-8 w-8">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteDocId(doc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* LIVRETS TAB */}
        <TabsContent value="livrets" className="mt-4 space-y-4">
          {/* Linked booklets */}
          {linkedBooklets.length > 0 ? (
            <div className="space-y-3">
              {linkedBooklets.map(b => (
                <Card key={b.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{b.property_name}</p>
                        <p className="text-xs text-muted-foreground">{b.property_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.status === 'published' ? 'default' : 'outline'} className="text-[10px]">
                        {b.status === 'published' ? 'Publié' : b.status === 'draft' ? 'Brouillon' : b.status}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/booklets/${b.id}/edit`)}>
                        Modifier
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => {
                        await supabase.from("booklets").update({ property_id: null }).eq("id", b.id);
                        setLinkedBooklets(prev => prev.filter(x => x.id !== b.id));
                        setAllBooklets(prev => prev.map(x => x.id === b.id ? { ...x, property_id: null } : x));
                        toast.success("Livret dissocié");
                      }}>
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold text-foreground mb-1">Aucun livret associé</h3>
                <p className="text-sm text-muted-foreground mb-4">Associez un livret existant ou créez-en un nouveau.</p>
              </CardContent>
            </Card>
          )}

          {/* Link existing booklet */}
          {(() => {
            const unlinked = allBooklets.filter(b => !b.property_id && !linkedBooklets.some(lb => lb.id === b.id));
            if (unlinked.length === 0) return null;
            return (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Associer un livret existant</Label>
                <div className="flex gap-2">
                  <Select onValueChange={async (bookletId) => {
                    setLinkingBooklet(true);
                    await supabase.from("booklets").update({ property_id: id }).eq("id", bookletId);
                    const linked = allBooklets.find(b => b.id === bookletId);
                    if (linked) setLinkedBooklets(prev => [...prev, { ...linked, property_id: id }]);
                    setAllBooklets(prev => prev.map(b => b.id === bookletId ? { ...b, property_id: id } : b));
                    toast.success("Livret associé au logement");
                    setLinkingBooklet(false);
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choisir un livret…" />
                    </SelectTrigger>
                    <SelectContent>
                      {unlinked.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5" />
                            {b.property_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })()}

          <Button variant="outline" onClick={() => navigate("/booklets/new")} className="w-full">
            <BookOpen className="w-4 h-4 mr-2" />
            Créer un nouveau livret
          </Button>
        </TabsContent>

        {/* INTERVENTIONS TAB */}
        <TabsContent value="interventions" className="mt-4 space-y-4">
          {/* Date filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !filterDateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDateFrom ? format(filterDateFrom, "dd MMM yyyy", { locale: fr }) : "Date début"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={filterDateFrom} onSelect={setFilterDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !filterDateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDateTo ? format(filterDateTo, "dd MMM yyyy", { locale: fr }) : "Date fin"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={filterDateTo} onSelect={setFilterDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {(filterDateFrom || filterDateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(undefined); setFilterDateTo(undefined); }}>
                <X className="w-4 h-4 mr-1" /> Réinitialiser
              </Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{filteredInterventions.length} intervention{filteredInterventions.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredInterventions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Wrench className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold text-foreground mb-1">Aucune intervention</h3>
                <p className="text-sm text-muted-foreground">
                  {(filterDateFrom || filterDateTo) ? "Aucune intervention pour cette période." : "Les missions planifiées pour ce bien apparaîtront ici."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredInterventions.map(intervention => {
                const statusCfg: Record<string, { label: string; icon: any; color: string; bg: string }> = {
                  scheduled: { label: "Planifiée", icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
                  in_progress: { label: "En cours", icon: Clock, color: "text-blue-600", bg: "bg-blue-100" },
                  completed: { label: "À valider", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
                  validated: { label: "Validée", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
                  refused: { label: "Refusée", icon: XCircle, color: "text-destructive", bg: "bg-red-100" },
                };
                const missionTypeLabels: Record<string, string> = {
                  cleaning: "Ménage", checkin: "Check-in", checkout: "Check-out", intervention: "Intervention",
                };
                const sc = statusCfg[intervention.status] || statusCfg.scheduled;
                const StatusIcon = sc.icon;
                return (
                  <Card key={intervention.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sc.bg}`}>
                            <StatusIcon className={`w-4 h-4 ${sc.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{missionTypeLabels[intervention.mission_type] || intervention.mission_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              {intervention.service_provider && ` — ${intervention.service_provider.first_name} ${intervention.service_provider.last_name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {intervention.mission_amount > 0 && (
                            <span className="text-sm font-medium text-foreground">{intervention.mission_amount}€</span>
                          )}
                          <Badge variant={intervention.status === 'validated' ? 'default' : 'outline'} className="text-[10px]">
                            {sc.label}
                          </Badge>
                          {intervention.payment_done && (
                            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Payé</Badge>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteInterventionId(intervention.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {(intervention.photos?.length ?? 0) > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto">
                          {intervention.photos!.slice(0, 4).map(p => (
                            <img key={p.id} src={p.url} className="w-16 h-16 rounded-md object-cover border" />
                          ))}
                          {(intervention.photos!.length > 4) && (
                            <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">+{intervention.photos!.length - 4}</div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="mt-4">
          <PropertyCalendar propertyId={id!} />
        </TabsContent>

        {/* OWNERS TAB */}
        <TabsContent value="owners" className="mt-4 space-y-3">
          {owners.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <User className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold text-foreground mb-1">Aucun propriétaire associé</h3>
                <p className="text-sm text-muted-foreground">
                  Associez un propriétaire depuis la section Propriétaires du dashboard.
                </p>
              </CardContent>
            </Card>
          ) : (
            owners.map((owner: any) => (
              <Card key={owner.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                    {owner.first_name?.[0]}{owner.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{owner.first_name} {owner.last_name}</p>
                    <p className="text-xs text-muted-foreground">{owner.email}</p>
                  </div>
                  <Badge variant={owner.status === 'active' ? 'default' : 'outline'} className="text-[10px] ml-auto">
                    {owner.status === 'active' ? 'Actif' : owner.status === 'disabled' ? 'Désactivé' : 'En attente'}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <EditPropertyDialog property={property} open={editOpen} onOpenChange={setEditOpen} onSubmit={updateProperty} />

      {/* Delete photo confirmation */}
      <AlertDialog open={!!deletePhotoId} onOpenChange={() => setDeletePhotoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette photo ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeletePhoto}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete doc confirmation */}
      <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteDoc}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete intervention confirmation */}
      <AlertDialog open={!!deleteInterventionId} onOpenChange={() => setDeleteInterventionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette intervention ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. L'intervention et ses photos seront supprimées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => {
              if (deleteInterventionId) {
                await deleteIntervention(deleteInterventionId);
                setDeleteInterventionId(null);
              }
            }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PropertyDetailPage;
