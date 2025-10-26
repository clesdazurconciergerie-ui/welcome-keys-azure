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

// Génération d'ID stable
const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

interface Equipment {
  id: string;
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
  const [draft, setDraft] = useState<Partial<Equipment>>({
    name: "",
    category: "Cuisine",
    instructions: "",
    manual_url: "",
  });
  const [isComposing, setIsComposing] = useState(false);
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
      // Assurer que chaque équipement a un ID stable
      setEquipment((data || []).map(e => ({ ...e, id: e.id || uid() })));
    } catch (error) {
      console.error("Error fetching equipment:", error);
    } finally {
      setLoading(false);
    }
  };

  const addEquipment = async () => {
    const name = (draft.name || "").trim();
    const category = draft.category || "Cuisine";
    const instructions = (draft.instructions || "").trim();
    const manual_url = (draft.manual_url || "").trim();
    
    if (!name) {
      toast.error("Le nom de l'équipement est requis");
      return;
    }

    const newEquipment: Equipment = {
      id: uid(),
      name,
      category,
      instructions,
      manual_url,
    };

    setEquipment(prev => [...prev, newEquipment]);
    
    // Sauvegarder en base
    try {
      await supabase
        .from("equipment")
        .insert({
          id: newEquipment.id,
          booklet_id: bookletId,
          ...newEquipment,
        });
      toast.success("Équipement ajouté");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erreur lors de l'ajout");
    }

    // Réinitialiser le draft
    setDraft({
      name: "",
      category: "Cuisine",
      instructions: "",
      manual_url: "",
    });
  };

  const removeEquipment = async (id: string) => {
    const item = equipment.find(e => e.id === id);
    if (!item) return;

    try {
      await supabase
        .from("equipment")
        .delete()
        .eq("id", id);
      
      setEquipment(prev => prev.filter(e => e.id !== id));
      toast.success("Équipement supprimé");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const updateEquipment = async (id: string, field: keyof Equipment, value: string) => {
    setEquipment(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );

    // Auto-save avec debounce
    const timeoutId = setTimeout(async () => {
      try {
        const item = equipment.find(e => e.id === id);
        if (item) {
          await supabase
            .from("equipment")
            .update({ [field]: value })
            .eq("id", id);
        }
      } catch (error) {
        console.error("Error updating:", error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  };

  const handleDraftKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      addEquipment();
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-8 md:space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Équipements et modes d'emploi</h2>
        <p className="text-muted-foreground mb-6">
          Listez tous les équipements avec leurs instructions
        </p>
      </div>

      {/* Liste des équipements existants */}
      <div className="space-y-4">
        {equipment.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{item.name || "Nouvel équipement"}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEquipment(item.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateEquipment(item.id, "name", e.target.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    placeholder="Ex: Four"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select
                    value={item.category}
                    onValueChange={(value) => updateEquipment(item.id, "category", value)}
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
                  onChange={(e) => updateEquipment(item.id, "instructions", e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="Mode d'emploi..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Notice PDF (URL)</Label>
                <Input
                  value={item.manual_url || ""}
                  onChange={(e) => updateEquipment(item.id, "manual_url", e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Formulaire d'ajout d'un nouvel équipement */}
      <Card className="p-4 border-2 border-dashed">
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un équipement
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={draft.name || ""}
                onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
                onKeyDown={handleDraftKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="Ex: Four"
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={draft.category || "Cuisine"}
                onValueChange={(value) => setDraft(d => ({ ...d, category: value }))}
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
              value={draft.instructions || ""}
              onChange={(e) => setDraft(d => ({ ...d, instructions: e.target.value }))}
              onKeyDown={(e) => {
                if (!isComposing && e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addEquipment();
                }
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="Mode d'emploi..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Notice PDF (URL)</Label>
            <Input
              value={draft.manual_url || ""}
              onChange={(e) => setDraft(d => ({ ...d, manual_url: e.target.value }))}
              onKeyDown={handleDraftKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="https://..."
              type="url"
            />
          </div>

          <Button onClick={addEquipment} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter cet équipement
          </Button>
        </div>
      </Card>
    </div>
  );
}
