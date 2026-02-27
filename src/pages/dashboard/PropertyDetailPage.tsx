import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, MapPin, Bed, Bath, Users, Ruler, Euro, Upload, Trash2, FileText,
  Download, Image as ImageIcon, Calendar, Loader2, User,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useProperties, type Property, type PropertyPhoto, type PropertyDocument } from "@/hooks/useProperties";
import { EditPropertyDialog } from "@/components/dashboard/properties/EditPropertyDialog";

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

const PropertyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, isLoading, fetchPhotos, uploadPhoto, deletePhoto, fetchDocuments, uploadDocument, deleteDocument, fetchPropertyOwners, updateProperty } = useProperties();

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

  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

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
      fetchDocuments(id).then(setDocuments);
      fetchPropertyOwners(id).then(setOwners);
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

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    const name = docName.trim() || file.name.replace(/\.[^.]+$/, "");
    await uploadDocument(id, file, docCategory, name);
    setDocuments(await fetchDocuments(id));
    setUploading(false);
    setDocName("");
    if (docInputRef.current) docInputRef.current.value = "";
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
    setDocuments(await fetchDocuments(id));
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
        <TabsList className="w-full justify-start">
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
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
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            <Button onClick={() => photoInputRef.current?.click()} disabled={uploading}
              className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Ajouter des photos
            </Button>
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
            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="hidden" onChange={handleDocUpload} />
            <Button onClick={() => docInputRef.current?.click()} disabled={uploading}
              className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Ajouter
            </Button>
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

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-10 h-10 mx-auto text-[hsl(var(--gold))] mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Calendrier & Planning</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-1">
                Synchronisation iCal / Airbnb / Booking, statuts d'occupation et planning des check-in/check-out.
              </p>
              <p className="text-xs text-[hsl(var(--gold))] font-medium">🚧 Bientôt disponible</p>
            </CardContent>
          </Card>
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
    </div>
  );
};

export default PropertyDetailPage;
