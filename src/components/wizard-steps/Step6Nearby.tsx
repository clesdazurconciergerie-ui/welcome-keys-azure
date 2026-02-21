import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Save, X, Upload, ExternalLink, Image as ImageIcon, Loader2, Library, Check, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  description?: string;
  distance?: string;
  maps_link?: string;
  image_url?: string;
  website_url?: string;
}

interface SavedPlace {
  id: string;
  name: string;
  type: string;
  description?: string;
  distance?: string;
  maps_link?: string;
  image_url?: string;
  website_url?: string;
}

interface Step6NearbyProps {
  data: any;
  onUpdate: (updates: any) => void;
}

const CATEGORIES = [
  "Restaurant", "Bar", "Café", "Plage", "Commerce", "Supermarché",
  "Pharmacie", "Boulangerie", "Activité", "Loisir", "Transport",
  "Parc", "Musée", "Monument", "Sport", "Santé", "Urgence", "Autre"
];

export default function Step6Nearby({ data, onUpdate }: Step6NearbyProps) {
  const { toast } = useToast();
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [draftPlace, setDraftPlace] = useState<Partial<NearbyPlace>>({
    name: "",
    type: "Restaurant",
    description: "",
    distance: "",
    maps_link: "",
    image_url: "",
    website_url: ""
  });

  useEffect(() => {
    loadPlaces();
    loadSavedPlaces();
  }, [data?.id]);

  const loadPlaces = async () => {
    if (!data?.id) return;
    try {
      const { data: nearbyData, error } = await supabase
        .from("nearby_places")
        .select("*")
        .eq("booklet_id", data.id)
        .order("created_at");
      if (error) throw error;
      setPlaces(nearbyData || []);
    } catch (error) {
      console.error("Error loading nearby places:", error);
    }
  };

  const loadSavedPlaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: saved, error } = await supabase
        .from("saved_places")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (error) throw error;
      setSavedPlaces(saved || []);
    } catch (error) {
      console.error("Error loading saved places:", error);
    }
  };

  const saveToSavedPlaces = async (place: Partial<NearbyPlace>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already saved (same name + type)
      const exists = savedPlaces.some(
        s => s.name.toLowerCase() === place.name?.toLowerCase() && s.type === place.type
      );
      if (exists) return;

      const { data: saved, error } = await supabase
        .from("saved_places")
        .insert({
          user_id: user.id,
          name: place.name!.trim(),
          type: place.type!,
          description: place.description?.trim() || null,
          distance: place.distance?.trim() || null,
          maps_link: place.maps_link?.trim() || null,
          image_url: place.image_url || null,
          website_url: place.website_url?.trim() || null
        })
        .select()
        .single();

      if (error) throw error;
      if (saved) setSavedPlaces(prev => [...prev, saved]);
    } catch (error) {
      console.error("Error saving to library:", error);
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (!data?.id) return null;
    try {
      setUploading(true);
      if (!file.type.startsWith('image/')) {
        toast({ title: "Fichier invalide", description: "Veuillez sélectionner une image (JPG, PNG, etc.)", variant: "destructive" });
        return null;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Fichier trop volumineux", description: "L'image ne doit pas dépasser 5 Mo", variant: "destructive" });
        return null;
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${data.id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('booklet-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('booklet-images').getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({ title: "Erreur d'upload", description: "Impossible d'envoyer l'image", variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAdd = async () => {
    if (!data?.id) return;
    if (!draftPlace.name || draftPlace.name.trim().length < 2) {
      toast({ title: "Nom requis", description: "Le nom doit contenir au moins 2 caractères", variant: "destructive" });
      return;
    }
    if (!draftPlace.type) {
      toast({ title: "Type requis", description: "Veuillez sélectionner un type", variant: "destructive" });
      return;
    }
    if (draftPlace.description && draftPlace.description.length > 150) {
      toast({ title: "Description trop longue", description: "La description ne doit pas dépasser 150 caractères", variant: "destructive" });
      return;
    }
    if (draftPlace.website_url && !validateUrl(draftPlace.website_url)) {
      toast({ title: "URL invalide", description: "L'URL doit commencer par http:// ou https://", variant: "destructive" });
      return;
    }

    try {
      const { data: newPlace, error } = await supabase
        .from("nearby_places")
        .insert({
          booklet_id: data.id,
          name: draftPlace.name.trim(),
          type: draftPlace.type,
          description: draftPlace.description?.trim() || null,
          distance: draftPlace.distance?.trim() || null,
          maps_link: draftPlace.maps_link?.trim() || null,
          image_url: draftPlace.image_url || null,
          website_url: draftPlace.website_url?.trim() || null
        })
        .select()
        .single();

      if (error) throw error;
      setPlaces([...places, newPlace]);

      // Auto-save to library
      if (saveToLibrary) {
        await saveToSavedPlaces(draftPlace);
      }

      setDraftPlace({
        name: "", type: "Restaurant", description: "", distance: "",
        maps_link: "", image_url: "", website_url: ""
      });

      toast({ title: "Lieu ajouté", description: saveToLibrary ? "Le lieu a été ajouté et sauvegardé dans votre bibliothèque" : "Le lieu a été ajouté avec succès" });
    } catch (error) {
      console.error("Error adding place:", error);
      toast({ title: "Erreur", description: "Impossible d'ajouter le lieu", variant: "destructive" });
    }
  };

  const handleImportFromLibrary = async (saved: SavedPlace) => {
    if (!data?.id) return;

    // Check if already added to this booklet
    const alreadyAdded = places.some(
      p => p.name.toLowerCase() === saved.name.toLowerCase() && p.type === saved.type
    );
    if (alreadyAdded) {
      toast({ title: "Déjà ajouté", description: "Ce lieu est déjà dans ce livret", variant: "destructive" });
      return;
    }

    setImportingIds(prev => new Set(prev).add(saved.id));
    try {
      const { data: newPlace, error } = await supabase
        .from("nearby_places")
        .insert({
          booklet_id: data.id,
          name: saved.name,
          type: saved.type,
          description: saved.description || null,
          distance: saved.distance || null,
          maps_link: saved.maps_link || null,
          image_url: saved.image_url || null,
          website_url: saved.website_url || null
        })
        .select()
        .single();

      if (error) throw error;
      setPlaces(prev => [...prev, newPlace]);
      toast({ title: "Lieu importé", description: `"${saved.name}" a été ajouté au livret` });
    } catch (error) {
      console.error("Error importing place:", error);
      toast({ title: "Erreur", description: "Impossible d'importer le lieu", variant: "destructive" });
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(saved.id);
        return next;
      });
    }
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      const { error } = await supabase.from("saved_places").delete().eq("id", id);
      if (error) throw error;
      setSavedPlaces(prev => prev.filter(s => s.id !== id));
      toast({ title: "Lieu retiré", description: "Le lieu a été retiré de votre bibliothèque" });
    } catch (error) {
      console.error("Error deleting saved place:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const handleEdit = (id: string) => { setEditingId(id); };

  const handleSave = async (id: string, updates: Partial<NearbyPlace>) => {
    if (updates.name && updates.name.trim().length < 2) {
      toast({ title: "Nom trop court", description: "Le nom doit contenir au moins 2 caractères", variant: "destructive" });
      return;
    }
    if (updates.description && updates.description.length > 150) {
      toast({ title: "Description trop longue", description: "La description ne doit pas dépasser 150 caractères", variant: "destructive" });
      return;
    }
    if (updates.website_url && !validateUrl(updates.website_url)) {
      toast({ title: "URL invalide", description: "L'URL doit commencer par http:// ou https://", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("nearby_places").update(updates).eq("id", id);
      if (error) throw error;
      setPlaces(places.map(p => p.id === id ? { ...p, ...updates } : p));
      setEditingId(null);
      toast({ title: "Lieu mis à jour", description: "Les modifications ont été enregistrées" });
    } catch (error) {
      console.error("Error updating place:", error);
      toast({ title: "Erreur", description: "Impossible de mettre à jour le lieu", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("nearby_places").delete().eq("id", id);
      if (error) throw error;
      setPlaces(places.filter(p => p.id !== id));
      toast({ title: "Lieu supprimé", description: "Le lieu a été retiré de la liste" });
    } catch (error) {
      console.error("Error deleting place:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer le lieu", variant: "destructive" });
    }
  };

  // Determine which saved places are already in this booklet
  const alreadyAddedNames = new Set(places.map(p => `${p.name.toLowerCase()}|${p.type}`));

  return (
    <div className="space-y-8 md:space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">À proximité</h2>
        <p className="text-muted-foreground">
          Commerces, restaurants, activités et lieux d'intérêt
        </p>
      </div>

      {/* Saved Places Library */}
      {savedPlaces.length > 0 && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <button
            type="button"
            className="w-full flex items-center justify-between cursor-pointer"
            onClick={() => setShowLibrary(!showLibrary)}
          >
            <h3 className="font-semibold flex items-center gap-2">
              <Library className="w-5 h-5 text-primary" />
              Ma bibliothèque de lieux
              <Badge variant="secondary" className="ml-1">{savedPlaces.length}</Badge>
            </h3>
            <span className="text-sm text-muted-foreground">
              {showLibrary ? "Masquer" : "Afficher"}
            </span>
          </button>

          {showLibrary && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Cliquez sur un lieu pour l'ajouter à ce livret. Vos lieux sauvegardés sont réutilisables sur tous vos livrets.
              </p>
              <div className="grid gap-2">
                {savedPlaces.map((saved) => {
                  const isAdded = alreadyAddedNames.has(`${saved.name.toLowerCase()}|${saved.type}`);
                  const isImporting = importingIds.has(saved.id);

                  return (
                    <div
                      key={saved.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isAdded
                          ? "bg-muted/50 border-muted opacity-60"
                          : "bg-background border-border hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      {saved.image_url ? (
                        <img src={saved.image_url} alt={saved.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{saved.name}</span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">{saved.type}</Badge>
                        </div>
                        {saved.description && (
                          <p className="text-xs text-muted-foreground truncate">{saved.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isAdded ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check className="w-3 h-3" /> Ajouté
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImportFromLibrary(saved)}
                            disabled={isImporting}
                            className="h-7 text-xs"
                          >
                            {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                            Ajouter
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSaved(saved.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Draft Form */}
      <Card className="p-4 bg-muted/50">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Ajouter un nouveau lieu
        </h3>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du lieu *</Label>
              <Input
                id="name"
                value={draftPlace.name}
                onChange={(e) => setDraftPlace({ ...draftPlace, name: e.target.value })}
                placeholder="Ex: Restaurant Le Baia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draftPlace.type}
                onChange={(e) => setDraftPlace({ ...draftPlace, type: e.target.value })}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description courte (optionnelle)</Label>
            <Textarea
              id="description"
              value={draftPlace.description}
              onChange={(e) => setDraftPlace({ ...draftPlace, description: e.target.value })}
              placeholder="Brève description du lieu..."
              maxLength={150}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              {draftPlace.description?.length || 0}/150 caractères
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distance">Distance (optionnelle)</Label>
              <Input
                id="distance"
                value={draftPlace.distance}
                onChange={(e) => setDraftPlace({ ...draftPlace, distance: e.target.value })}
                placeholder="500 m / 5 min à pied"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maps_link">Lien Google Maps (optionnel)</Label>
              <Input
                id="maps_link"
                value={draftPlace.maps_link}
                onChange={(e) => setDraftPlace({ ...draftPlace, maps_link: e.target.value })}
                placeholder="https://maps.google.com/..."
                type="url"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url">Lien du site web (optionnel)</Label>
            <div className="flex gap-2">
              <Input
                id="website_url"
                value={draftPlace.website_url}
                onChange={(e) => setDraftPlace({ ...draftPlace, website_url: e.target.value })}
                placeholder="https://www.exemple.com"
                type="url"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Importer une image</Label>
            {draftPlace.image_url ? (
              <div className="relative">
                <img
                  src={draftPlace.image_url}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-md"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setDraftPlace({ ...draftPlace, image_url: "" })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await handleImageUpload(file);
                      if (url) {
                        setDraftPlace({ ...draftPlace, image_url: url });
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? "Upload en cours..." : "Choisir une image"}
                </Button>
              </div>
            )}
          </div>

          {places.length >= 10 && (
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
              💡 Pensez à sélectionner uniquement les lieux les plus pertinents pour vos invités.
            </p>
          )}

          {/* Save to library toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
            <Star className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Sauvegarder dans ma bibliothèque</p>
              <p className="text-xs text-muted-foreground">Réutilisez ce lieu dans vos autres livrets</p>
            </div>
            <Switch checked={saveToLibrary} onCheckedChange={setSaveToLibrary} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={uploading}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
            <Button
              variant="outline"
              onClick={() => setDraftPlace({
                name: "", type: "Restaurant", description: "", distance: "",
                maps_link: "", image_url: "", website_url: ""
              })}
            >
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>
      </Card>

      {/* Existing Places List */}
      <div className="space-y-4">
        {places.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Aucun lieu ajouté. {savedPlaces.length > 0 ? "Importez depuis votre bibliothèque ou remplissez le formulaire ci-dessus." : "Remplissez le formulaire ci-dessus pour ajouter un lieu."}
            </p>
          </Card>
        ) : (
          places.map((place) => (
            <Card key={place.id} className="p-4">
              {editingId === place.id ? (
                <EditPlaceForm 
                  place={place} 
                  onSave={(updates) => handleSave(place.id, updates)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex gap-4">
                  {place.image_url ? (
                    <img
                      src={place.image_url}
                      alt={place.name}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{place.name}</h3>
                      <Badge variant="secondary" className="flex-shrink-0">{place.type}</Badge>
                    </div>
                    {place.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {place.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 text-sm">
                      {place.distance && (
                        <span className="text-muted-foreground">📍 {place.distance}</span>
                      )}
                      {place.website_url && (
                        <a
                          href={place.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Site web
                        </a>
                      )}
                      {place.maps_link && (
                        <a
                          href={place.maps_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Itinéraire
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(place.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(place.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function EditPlaceForm({
  place,
  onSave,
  onCancel
}: {
  place: NearbyPlace;
  onSave: (updates: Partial<NearbyPlace>) => void;
  onCancel: () => void;
}) {
  const [editData, setEditData] = useState<NearbyPlace>(place);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const CATEGORIES = [
    "Restaurant", "Bar", "Café", "Plage", "Commerce", "Supermarché",
    "Pharmacie", "Boulangerie", "Activité", "Loisir", "Transport",
    "Parc", "Musée", "Monument", "Sport", "Santé", "Urgence", "Autre"
  ];

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      if (!file.type.startsWith('image/')) {
        toast({ title: "Fichier invalide", description: "Veuillez sélectionner une image", variant: "destructive" });
        return null;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Fichier trop volumineux", description: "L'image ne doit pas dépasser 5 Mo", variant: "destructive" });
        return null;
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('booklet-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('booklet-images').getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error("Error uploading:", error);
      toast({ title: "Erreur d'upload", description: "Impossible d'envoyer l'image", variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={editData.type}
            onChange={(e) => setEditData({ ...editData, type: e.target.value })}
          >
            {CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description courte</Label>
        <Textarea value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })} maxLength={150} rows={2} />
        <p className="text-xs text-muted-foreground">{editData.description?.length || 0}/150 caractères</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Distance</Label>
          <Input value={editData.distance || ""} onChange={(e) => setEditData({ ...editData, distance: e.target.value })} placeholder="500 m / 5 min à pied" />
        </div>
        <div className="space-y-2">
          <Label>Lien Google Maps</Label>
          <Input value={editData.maps_link || ""} onChange={(e) => setEditData({ ...editData, maps_link: e.target.value })} placeholder="https://maps.google.com/..." type="url" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Lien du site web</Label>
        <Input value={editData.website_url || ""} onChange={(e) => setEditData({ ...editData, website_url: e.target.value })} placeholder="https://www.exemple.com" type="url" />
      </div>
      <div className="space-y-2">
        <Label>Image</Label>
        {editData.image_url ? (
          <div className="relative">
            <img src={editData.image_url} alt="Preview" className="w-full h-32 object-cover rounded-md" />
            <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setEditData({ ...editData, image_url: undefined })}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div>
            <input type="file" id="edit-image-upload" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = await handleImageUpload(file);
                if (url) setEditData({ ...editData, image_url: url });
              }
            }} />
            <Button type="button" variant="outline" disabled={uploading} onClick={() => document.getElementById('edit-image-upload')?.click()}>
              {uploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Upload...</>) : (<><Upload className="w-4 h-4 mr-2" />Choisir une image</>)}
            </Button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(editData)} disabled={uploading}>
          <Save className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
      </div>
    </div>
  );
}
