import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Step5CleaningProps {
  data: any;
  onUpdate: (updates: any) => void;
}

export default function Step5Cleaning({ data, onUpdate }: Step5CleaningProps) {
  const [wasteLocation, setWasteLocation] = useState(data?.waste_location || "");
  const [sortingInstructions, setSortingInstructions] = useState(data?.sorting_instructions || "");
  const [cleaningRules, setCleaningRules] = useState(data?.cleaning_rules || "");
  const [cleaningTips, setCleaningTips] = useState(data?.cleaning_tips || "");
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate({
        waste_location: wasteLocation,
        sorting_instructions: sortingInstructions,
        cleaning_rules: cleaningRules,
        cleaning_tips: cleaningTips,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [wasteLocation, sortingInstructions, cleaningRules, cleaningTips]);

  const handleGenerate = async (contentType: string, setter: (value: string) => void) => {
    const propertyName = (data as any)?.property_name || "votre logement";
    const propertyAddress = (data as any)?.property_address || "l'adresse";

    setGenerating(contentType);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-description', {
        body: { 
          propertyName,
          propertyAddress,
          contentType
        }
      });

      if (error) throw error;
      setter(result.generatedText);
      toast.success("Contenu généré avec succès");
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Ménage et tri</h2>
        <p className="text-muted-foreground">
          Instructions pour le tri des déchets et le ménage de départ
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label>
              Emplacement des poubelles <Badge variant="destructive">Requis</Badge>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerate('waste_location', setWasteLocation)}
              disabled={generating === 'waste_location'}
            >
              {generating === 'waste_location' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Générer avec IA
            </Button>
          </div>
          <Textarea
            value={wasteLocation}
            onChange={(e) => setWasteLocation(e.target.value)}
            placeholder="Les poubelles se trouvent dans le local à poubelles au rez-de-chaussée..."
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label>
              Instructions de tri <Badge variant="destructive">Requis</Badge>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerate('sorting_instructions', setSortingInstructions)}
              disabled={generating === 'sorting_instructions'}
            >
              {generating === 'sorting_instructions' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Générer avec IA
            </Button>
          </div>
          <Textarea
            value={sortingInstructions}
            onChange={(e) => setSortingInstructions(e.target.value)}
            placeholder="Poubelle verte : recyclable&#10;Poubelle noire : ordures ménagères&#10;Poubelle jaune : verre"
            rows={5}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label>
              Règles de nettoyage avant départ <Badge variant="destructive">Requis</Badge>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerate('cleaning_rules', setCleaningRules)}
              disabled={generating === 'cleaning_rules'}
            >
              {generating === 'cleaning_rules' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Générer avec IA
            </Button>
          </div>
          <Textarea
            value={cleaningRules}
            onChange={(e) => setCleaningRules(e.target.value)}
            placeholder="- Faire la vaisselle&#10;- Sortir les poubelles&#10;- Retirer les draps..."
            rows={6}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Conseils d'entretien <Badge variant="secondary">Optionnel</Badge>
          </Label>
          <Textarea
            value={cleaningTips}
            onChange={(e) => setCleaningTips(e.target.value)}
            placeholder="Les produits d'entretien se trouvent sous l'évier..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
