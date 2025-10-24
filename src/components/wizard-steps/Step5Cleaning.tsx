import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Step5CleaningProps {
  data: any;
  onUpdate: (updates: any) => void;
}

export default function Step5Cleaning({ data, onUpdate }: Step5CleaningProps) {
  const [wasteLocation, setWasteLocation] = useState(data?.waste_location || "");
  const [sortingInstructions, setSortingInstructions] = useState(data?.sorting_instructions || "");
  const [cleaningRules, setCleaningRules] = useState(data?.cleaning_rules || "");
  const [cleaningTips, setCleaningTips] = useState(data?.cleaning_tips || "");

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
          <Label>
            Emplacement des poubelles <Badge variant="destructive">Requis</Badge>
          </Label>
          <Textarea
            value={wasteLocation}
            onChange={(e) => setWasteLocation(e.target.value)}
            placeholder="Les poubelles se trouvent dans le local à poubelles au rez-de-chaussée..."
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Instructions de tri <Badge variant="destructive">Requis</Badge>
          </Label>
          <Textarea
            value={sortingInstructions}
            onChange={(e) => setSortingInstructions(e.target.value)}
            placeholder="Poubelle verte : recyclable&#10;Poubelle noire : ordures ménagères&#10;Poubelle jaune : verre"
            rows={5}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Règles de nettoyage avant départ <Badge variant="destructive">Requis</Badge>
          </Label>
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
