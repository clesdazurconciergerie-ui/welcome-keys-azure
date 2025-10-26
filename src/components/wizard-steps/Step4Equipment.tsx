import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

// Génération d'ID stable
const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

// Normalisation des steps depuis DB (idempotente)
const normalizeSteps = (raw: unknown): Step[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((s: any) => ({ 
        id: s.id || uid(), 
        text: String(s.text || '').trim() 
      }))
      .filter(s => s.text);
  }
  
  const str = String(raw ?? '');
  if (!str) return [];
  
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed
        .map((s: any) => ({ 
          id: s.id || uid(), 
          text: String(s.text || s || '').trim() 
        }))
        .filter(s => s.text);
    }
  } catch {
    // Si pas du JSON, traiter comme texte
  }
  
  return str
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(text => ({ id: uid(), text }));
};

interface Step {
  id: string;
  text: string;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  steps: Step[];
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
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState("Cuisine");
  const [draftSteps, setDraftSteps] = useState("");
  const [draftManualUrl, setDraftManualUrl] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const bookletId = data?.id;

  // ✅ Hydratation idempotente : charge une seule fois, conserve les IDs
  useEffect(() => {
    let mounted = true;
    
    const fetchEquipment = async () => {
      if (!bookletId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("equipment")
          .select("*")
          .eq("booklet_id", bookletId);

        if (error) throw error;
        
        if (!mounted) return;

        // Normaliser sans créer de nouveaux items
        const equipmentList = (data || []).map(e => ({
          id: e.id || uid(),
          name: e.name || '',
          category: e.category || 'Général',
          steps: normalizeSteps(e.instructions),
          manual_url: e.manual_url || ''
        }));

        setEquipment(equipmentList);
      } catch (error) {
        console.error("Error fetching equipment:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEquipment();
    return () => { mounted = false; };
  }, [bookletId]);

  const addEquipment = async () => {
    const name = draftName.trim();
    const category = draftCategory.trim();
    const manual_url = draftManualUrl.trim();
    
    if (!name) {
      toast.error("Le nom de l'équipement est requis");
      return;
    }

    // Anti-doublon : vérifier titre + catégorie
    const exists = equipment.some(
      e => e.name.trim().toLowerCase() === name.toLowerCase() &&
           (e.category || "").toLowerCase() === category.toLowerCase()
    );
    
    if (exists) {
      toast.error("Cet équipement existe déjà");
      return;
    }

    // Parser les steps depuis le textarea (séparation par \n uniquement)
    const steps: Step[] = draftSteps
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(text => ({ id: uid(), text }));

    const newEquipment: Equipment = {
      id: uid(),
      name,
      category: category || "Général",
      steps,
      manual_url,
    };

    setEquipment(prev => [...prev, newEquipment]);
    
    // Sauvegarder en base (stocker steps comme JSON)
    try {
      await supabase
        .from("equipment")
        .insert({
          id: newEquipment.id,
          booklet_id: bookletId,
          name: newEquipment.name,
          category: newEquipment.category,
          instructions: JSON.stringify(newEquipment.steps),
          manual_url: newEquipment.manual_url,
        });
      toast.success("Équipement ajouté");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erreur lors de l'ajout");
    }

    // Réinitialiser le draft
    setDraftName("");
    setDraftCategory("Cuisine");
    setDraftSteps("");
    setDraftManualUrl("");
  };

  const removeEquipment = async (id: string) => {
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

  // ✅ Édition : mise à jour in-place uniquement
  const updateEquipment = (id: string, patch: Partial<Equipment>) => {
    setEquipment(prev =>
      prev.map(item => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const updateStep = (equipId: string, stepId: string, text: string) => {
    setEquipment(prev =>
      prev.map(e =>
        e.id !== equipId
          ? e
          : { ...e, steps: e.steps.map(s => (s.id === stepId ? { ...s, text } : s)) }
      )
    );
  };

  const addStep = (equipId: string) => {
    setEquipment(prev =>
      prev.map(e =>
        e.id !== equipId ? e : { ...e, steps: [...e.steps, { id: uid(), text: "" }] }
      )
    );
  };

  const removeStep = (equipId: string, stepId: string) => {
    setEquipment(prev =>
      prev.map(e =>
        e.id !== equipId ? e : { ...e, steps: e.steps.filter(s => s.id !== stepId) }
      )
    );
  };

  // ✅ Autosave PATCH debouncé (upsert par ID uniquement)
  const debouncedSave = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (items: Equipment[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        for (const item of items) {
          try {
            await supabase
              .from("equipment")
              .upsert({
                id: item.id,
                booklet_id: bookletId,
                name: item.name,
                category: item.category,
                instructions: JSON.stringify(item.steps),
                manual_url: item.manual_url,
              }, { onConflict: 'id' });
          } catch (error) {
            console.error("Error auto-saving equipment:", error);
          }
        }
      }, 800);
    };
  }, [bookletId]);

  // Déclencher l'autosave quand equipment change
  useEffect(() => {
    if (equipment.length > 0) {
      debouncedSave(equipment);
    }
  }, [equipment, debouncedSave]);

  const handleDraftKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isComposing) return;
    // Ctrl/Cmd + Enter pour ajouter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
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
          Listez tous les équipements avec leurs instructions (une étape par ligne)
        </p>
      </div>

      {/* Liste des équipements existants */}
      <div className="space-y-3">
        {equipment.map((item) => (
          <details key={item.id} className="rounded-xl border border-[#E6EDF2] p-4 bg-white group">
            <summary className="cursor-pointer flex items-center justify-between list-none">
              <div className="flex items-center gap-3 flex-1">
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
                <div className="flex-1 flex items-center gap-3">
                  <Input
                    value={item.name}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateEquipment(item.id, { name: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    className="font-semibold max-w-[200px]"
                    placeholder="Nom"
                  />
                  <span className="text-sm text-muted-foreground">
                    ({item.category || "Général"})
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEquipment(item.id);
                }}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </summary>

            <div className="mt-4 space-y-4 pl-7">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Catégorie</Label>
                <Select
                  value={item.category}
                  onValueChange={(value) => updateEquipment(item.id, { category: value })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Étapes du mode d'emploi</Label>
                <div className="space-y-2">
                  {item.steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[20px]">
                        {idx + 1}.
                      </span>
                      <Input
                        value={step.text}
                        onChange={(e) => updateStep(item.id, step.id, e.target.value)}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={() => setIsComposing(false)}
                        placeholder="Étape..."
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(item.id, step.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addStep(item.id)}
                    className="w-full"
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Ajouter une étape
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Notice PDF (URL)</Label>
                <Input
                  value={item.manual_url || ""}
                  onChange={(e) => updateEquipment(item.id, { manual_url: e.target.value })}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
            </div>
          </details>
        ))}
      </div>

      {/* Formulaire d'ajout d'un nouvel équipement */}
      <Card className="p-6 border-2 border-dashed bg-muted/20">
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un équipement
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de l'équipement</Label>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={handleDraftKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="Ex: Four"
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={draftCategory}
                onValueChange={setDraftCategory}
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
            <Label>
              Étapes du mode d'emploi <span className="text-xs text-muted-foreground">(une par ligne)</span>
            </Label>
            <Textarea
              value={draftSteps}
              onChange={(e) => setDraftSteps(e.target.value)}
              onKeyDown={handleDraftKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="Ex:&#10;Allumer le four&#10;Régler le thermostat sur 180°C&#10;Préchauffer 10 minutes&#10;Éteindre après utilisation"
              rows={5}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Pressez Ctrl+Entrée ou Cmd+Entrée pour ajouter l'équipement
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notice PDF (URL)</Label>
            <Input
              value={draftManualUrl}
              onChange={(e) => setDraftManualUrl(e.target.value)}
              onKeyDown={handleDraftKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="https://..."
              type="url"
            />
          </div>

          <Button onClick={addEquipment} className="w-full" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter cet équipement
          </Button>
        </div>
      </Card>
    </div>
  );
}
