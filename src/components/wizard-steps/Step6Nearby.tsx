import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface Place {
  id?: string;
  name: string;
  type: string;
  distance: string;
  maps_link: string;
  description?: string;
}

interface Step6NearbyProps {
  bookletId: string;
}

const TYPES = [
  "Supermarché", "Restaurant", "Pharmacie", "Boulangerie",
  "Activité", "Lieu touristique", "Transport", "Urgence"
];

export default function Step6Nearby({ bookletId }: Step6NearbyProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaces();
  }, [bookletId]);

  const fetchPlaces = async () => {
    try {
      const { data, error } = await supabase
        .from("nearby_places")
        .select("*")
        .eq("booklet_id", bookletId);

      if (error) throw error;
      setPlaces(data || []);
    } catch (error) {
      console.error("Error fetching places:", error);
    } finally {
      setLoading(false);
    }
  };

  const addPlace = () => {
    setPlaces([...places, {
      name: "",
      type: "Supermarché",
      distance: "",
      maps_link: "",
    }]);
  };

  const removePlace = async (index: number) => {
    const place = places[index];
    if (place.id) {
      try {
        await supabase
          .from("nearby_places")
          .delete()
          .eq("id", place.id);
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
    setPlaces(places.filter((_, i) => i !== index));
  };

  const updatePlace = (index: number, updates: Partial<Place>) => {
    const newPlaces = [...places];
    newPlaces[index] = { ...newPlaces[index], ...updates };
    setPlaces(newPlaces);
    
    // Auto-save
    setTimeout(async () => {
      try {
        const place = newPlaces[index];
        if (place.name) {
          await supabase
            .from("nearby_places")
            .upsert({
              id: place.id,
              booklet_id: bookletId,
              ...place,
            });
        }
      } catch (error) {
        console.error("Error saving:", error);
      }
    }, 1000);
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">À proximité</h2>
          <p className="text-muted-foreground">
            Commerces, restaurants, activités et lieux d'intérêt
          </p>
        </div>
        <Button onClick={addPlace}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <div className="space-y-4">
        {places.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Aucun lieu ajouté. Cliquez sur "Ajouter" pour commencer.
            </p>
          </Card>
        ) : (
          places.map((place, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Lieu #{index + 1}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePlace(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input
                      value={place.name}
                      onChange={(e) => updatePlace(index, { name: e.target.value })}
                      placeholder="Ex: Carrefour"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={place.type}
                      onValueChange={(value) => updatePlace(index, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Distance</Label>
                    <Input
                      value={place.distance}
                      onChange={(e) => updatePlace(index, { distance: e.target.value })}
                      placeholder="5 min à pied"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lien Google Maps</Label>
                    <Input
                      value={place.maps_link}
                      onChange={(e) => updatePlace(index, { maps_link: e.target.value })}
                      placeholder="https://maps.google.com/..."
                      type="url"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (optionnel)</Label>
                  <Textarea
                    value={place.description || ""}
                    onChange={(e) => updatePlace(index, { description: e.target.value })}
                    placeholder="Recommandations..."
                    rows={2}
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
