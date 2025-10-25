import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  distance?: string;
  mapsUrl?: string;
  photoUrl?: string;
  note?: string;
}

interface Step6NearbyProps {
  data: any;
  onUpdate: (updates: any) => void;
}

const CATEGORIES = [
  "Restaurant", "Bar", "Plage", "Commerce", "Loisir", "Transport",
  "Supermarché", "Pharmacie", "Boulangerie", "Activité", "Urgence"
];

export default function Step6Nearby({ data, onUpdate }: Step6NearbyProps) {
  const { toast } = useToast();
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPlace, setDraftPlace] = useState<Partial<NearbyPlace>>({
    name: "",
    category: "Restaurant",
    distance: "",
    mapsUrl: "",
    photoUrl: "",
    note: ""
  });

  useEffect(() => {
    // Load nearby from booklet data
    if (data?.nearby) {
      try {
        const parsed = typeof data.nearby === 'string' ? JSON.parse(data.nearby) : data.nearby;
        setPlaces(Array.isArray(parsed) ? parsed : []);
      } catch {
        setPlaces([]);
      }
    }
  }, [data?.nearby]);

  const saveToDatabase = async (updatedPlaces: NearbyPlace[]) => {
    if (!data?.id) return;
    
    try {
      const { error } = await supabase
        .from("booklets")
        .update({ nearby: updatedPlaces as any })
        .eq("id", data.id);

      if (error) throw error;
      onUpdate({ nearby: updatedPlaces });
    } catch (error) {
      console.error("Error saving nearby:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les lieux",
        variant: "destructive"
      });
    }
  };

  const handleAdd = () => {
    if (!draftPlace.name || draftPlace.name.trim().length < 2) {
      toast({
        title: "Nom trop court",
        description: "Le nom doit contenir au moins 2 caractères",
        variant: "destructive"
      });
      return;
    }

    if (!draftPlace.category) {
      toast({
        title: "Catégorie requise",
        description: "Veuillez sélectionner une catégorie",
        variant: "destructive"
      });
      return;
    }

    const newPlace: NearbyPlace = {
      id: crypto.randomUUID(),
      name: draftPlace.name.trim(),
      category: draftPlace.category,
      distance: draftPlace.distance?.trim(),
      mapsUrl: draftPlace.mapsUrl?.trim(),
      photoUrl: draftPlace.photoUrl?.trim(),
      note: draftPlace.note?.trim()
    };

    const updatedPlaces = [...places, newPlace];
    setPlaces(updatedPlaces);
    saveToDatabase(updatedPlaces);

    // Reset draft
    setDraftPlace({
      name: "",
      category: "Restaurant",
      distance: "",
      mapsUrl: "",
      photoUrl: "",
      note: ""
    });

    toast({
      title: "Lieu ajouté",
      description: "Le lieu a été ajouté avec succès"
    });
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleSave = (id: string, updates: Partial<NearbyPlace>) => {
    if (updates.name && updates.name.trim().length < 2) {
      toast({
        title: "Nom trop court",
        description: "Le nom doit contenir au moins 2 caractères",
        variant: "destructive"
      });
      return;
    }

    const updatedPlaces = places.map(p => 
      p.id === id ? { ...p, ...updates } : p
    );
    setPlaces(updatedPlaces);
    saveToDatabase(updatedPlaces);
    setEditingId(null);

    toast({
      title: "À proximité mis à jour",
      description: "Les modifications ont été enregistrées"
    });
  };

  const handleDelete = (id: string) => {
    const updatedPlaces = places.filter(p => p.id !== id);
    setPlaces(updatedPlaces);
    saveToDatabase(updatedPlaces);

    toast({
      title: "Lieu supprimé",
      description: "Le lieu a été retiré de la liste"
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">À proximité</h2>
        <p className="text-muted-foreground">
          Commerces, restaurants, activités et lieux d'intérêt
        </p>
      </div>

      {/* Draft Form */}
      <Card className="p-4 bg-muted/50">
        <h3 className="font-semibold mb-4">Ajouter un nouveau lieu</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={draftPlace.name}
                onChange={(e) => setDraftPlace({ ...draftPlace, name: e.target.value })}
                placeholder="Ex: Le Baia"
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={draftPlace.category}
                onValueChange={(value) => setDraftPlace({ ...draftPlace, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Distance (optionnel)</Label>
              <Input
                value={draftPlace.distance}
                onChange={(e) => setDraftPlace({ ...draftPlace, distance: e.target.value })}
                placeholder="500 m / 5 min à pied"
              />
            </div>
            <div className="space-y-2">
              <Label>Lien Google Maps (optionnel)</Label>
              <Input
                value={draftPlace.mapsUrl}
                onChange={(e) => setDraftPlace({ ...draftPlace, mapsUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
                type="url"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setDraftPlace({ name: "", category: "Restaurant", distance: "", mapsUrl: "", photoUrl: "", note: "" })}
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          </div>
        </div>
      </Card>

      {/* Existing Places List */}
      <div className="space-y-4">
        {places.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Aucun lieu ajouté. Remplissez le formulaire ci-dessus pour ajouter un lieu.
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{place.name}</h3>
                      <Badge variant="secondary">{place.category}</Badge>
                    </div>
                    {place.distance && (
                      <p className="text-sm text-muted-foreground">• {place.distance}</p>
                    )}
                    {place.mapsUrl && (
                      <a 
                        href={place.mapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Itinéraire
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select
            value={editData.category}
            onValueChange={(value) => setEditData({ ...editData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Distance</Label>
          <Input
            value={editData.distance || ""}
            onChange={(e) => setEditData({ ...editData, distance: e.target.value })}
            placeholder="500 m / 5 min à pied"
          />
        </div>
        <div className="space-y-2">
          <Label>Lien Google Maps</Label>
          <Input
            value={editData.mapsUrl || ""}
            onChange={(e) => setEditData({ ...editData, mapsUrl: e.target.value })}
            placeholder="https://maps.google.com/..."
            type="url"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => onSave(editData)}>
          <Save className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
