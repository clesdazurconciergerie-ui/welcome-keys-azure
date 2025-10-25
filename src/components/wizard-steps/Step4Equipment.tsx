import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Equipment {
  id?: string;
  name: string;
  category: string;
  instructions: string;
  manual_url?: string;
}

interface Step4EquipmentProps {
  data: any;
  onUpdate: (updates: any) => void;
}

const CATEGORIES = [
  "Cuisine", "Électroménager", "Chauffage/Climatisation",
  "Multimédia", "Salle de bain", "Autre"
];

export default function Step4Equipment({ data, onUpdate }: Step4EquipmentProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const bookletId = data?.id;

  useEffect(() => {
    if (bookletId) {
      fetchEquipment();
    } else {
      setLoading(false);
    }
  }, [bookletId]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("booklet_id", bookletId);

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error("Error fetching equipment:", error);
    } finally {
      setLoading(false);
    }
  };

  const addEquipment = () => {
    setEquipment([...equipment, {
      name: "",
      category: "Cuisine",
      instructions: "",
    }]);
  };

  const removeEquipment = async (index: number) => {
    const item = equipment[index];
    if (item.id) {
      try {
        await supabase
          .from("equipment")
          .delete()
          .eq("id", item.id);
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const updateEquipment = (index: number, updates: Partial<Equipment>) => {
    const newEquipment = [...equipment];
    newEquipment[index] = { ...newEquipment[index], ...updates };
    setEquipment(newEquipment);
    
    // Auto-save
    setTimeout(async () => {
      try {
        const item = newEquipment[index];
        if (item.name && item.category) {
          await supabase
            .from("equipment")
            .upsert({
              id: item.id,
              booklet_id: bookletId,
              ...item,
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
    <div className="space-y-8 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-4">Équipements et modes d'emploi</h2>
          <p className="text-muted-foreground">
            Listez tous les équipements avec leurs instructions
          </p>
        </div>
        <Button onClick={addEquipment}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <div className="space-y-4">
        {equipment.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Aucun équipement ajouté. Cliquez sur "Ajouter" pour commencer.
            </p>
          </Card>
        ) : (
          equipment.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Équipement #{index + 1}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEquipment(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateEquipment(index, { name: e.target.value })}
                      placeholder="Ex: Four"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={item.category}
                      onValueChange={(value) => updateEquipment(index, { category: value })}
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

                <div className="space-y-2">
                  <Label>Instructions</Label>
                  <Textarea
                    value={item.instructions}
                    onChange={(e) => updateEquipment(index, { instructions: e.target.value })}
                    placeholder="Mode d'emploi..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notice PDF (URL)</Label>
                  <Input
                    value={item.manual_url || ""}
                    onChange={(e) => updateEquipment(index, { manual_url: e.target.value })}
                    placeholder="https://..."
                    type="url"
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
