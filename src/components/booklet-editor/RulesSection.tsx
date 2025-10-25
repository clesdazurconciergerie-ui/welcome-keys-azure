import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";

interface RulesSectionProps {
  data: {
    houseRules: string;
    checkInProcedure: string;
    checkOutProcedure: string;
    parkingInfo: string;
  };
  onChange: (updates: Partial<RulesSectionProps['data']>) => void;
  onGenerate?: (field: string) => Promise<void>;
  generating?: Record<string, boolean>;
}

const DEFAULT_RULES = {
  houseRules: '',
  checkInProcedure: '',
  checkOutProcedure: '',
  parkingInfo: ''
};

export default function RulesSection({ data = DEFAULT_RULES, onChange, onGenerate, generating = {} }: RulesSectionProps) {
  const rulesData = { ...DEFAULT_RULES, ...data };

  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Règles de la maison</h2>
        <p className="text-sm text-[#64748B]">
          Règlement intérieur, procédures et informations pratiques
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="house-rules">Règlement intérieur</Label>
            {onGenerate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onGenerate('house_rules')}
                disabled={generating?.house_rules}
              >
                {generating?.house_rules ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Générer avec IA
              </Button>
            )}
          </div>
          <Textarea
            id="house-rules"
            value={rulesData.houseRules}
            onChange={(e) => onChange({ houseRules: e.target.value })}
            placeholder="Ex: Non fumeur, pas d'animaux, respecter le voisinage..."
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="checkin-procedure">Procédure de check-in</Label>
            {onGenerate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onGenerate('checkin_procedure')}
                disabled={generating?.checkin_procedure}
              >
                {generating?.checkin_procedure ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Générer avec IA
              </Button>
            )}
          </div>
          <Textarea
            id="checkin-procedure"
            value={rulesData.checkInProcedure}
            onChange={(e) => onChange({ checkInProcedure: e.target.value })}
            placeholder="1. Récupérez les clés dans la boîte à clés...&#10;2. Entrez le code..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="checkout-procedure">Procédure de check-out</Label>
            {onGenerate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onGenerate('checkout_procedure')}
                disabled={generating?.checkout_procedure}
              >
                {generating?.checkout_procedure ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Générer avec IA
              </Button>
            )}
          </div>
          <Textarea
            id="checkout-procedure"
            value={rulesData.checkOutProcedure}
            onChange={(e) => onChange({ checkOutProcedure: e.target.value })}
            placeholder="1. Fermez les fenêtres...&#10;2. Déposez les clés..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="parking-info">Stationnement</Label>
            {onGenerate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onGenerate('parking_info')}
                disabled={generating?.parking_info}
              >
                {generating?.parking_info ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Générer avec IA
              </Button>
            )}
          </div>
          <Textarea
            id="parking-info"
            value={rulesData.parkingInfo}
            onChange={(e) => onChange({ parkingInfo: e.target.value })}
            placeholder="Place de parking n°12 au sous-sol..."
            rows={3}
          />
        </div>
      </div>
    </section>
  );
}
