import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Step9LegalProps {
  data: any;
  onUpdate: (updates: any) => void;
}

const DEFAULT_GDPR = `Vos données personnelles sont collectées uniquement pour gérer votre séjour et assurer votre confort. Elles ne seront jamais partagées avec des tiers sans votre consentement. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.`;

const DEFAULT_DISCLAIMER = `Le propriétaire décline toute responsabilité en cas d'accident, de perte ou de vol survenus dans les lieux ou à proximité. Les voyageurs sont responsables de leurs effets personnels et doivent signaler immédiatement tout dommage constaté.`;

export default function Step9Legal({ data, onUpdate }: Step9LegalProps) {
  const [airbnbLicense, setAirbnbLicense] = useState(data?.airbnb_license || "");
  const [safetyInstructions, setSafetyInstructions] = useState(data?.safety_instructions || "");
  const [gdprNotice, setGdprNotice] = useState(data?.gdpr_notice || DEFAULT_GDPR);
  const [disclaimer, setDisclaimer] = useState(data?.disclaimer || DEFAULT_DISCLAIMER);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate({
        airbnb_license: airbnbLicense,
        safety_instructions: safetyInstructions,
        gdpr_notice: gdprNotice,
        disclaimer: disclaimer,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [airbnbLicense, safetyInstructions, gdprNotice, disclaimer]);

  const handleGenerateSafety = async () => {
    const propertyName = (data as any)?.property_name || "votre logement";
    const propertyAddress = (data as any)?.property_address || "l'adresse";

    setGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-description', {
        body: { 
          propertyName,
          propertyAddress,
          contentType: 'safety_instructions'
        }
      });

      if (error) throw error;
      setSafetyInstructions(result.generatedText);
      toast.success("Consignes générées avec succès");
    } catch (error) {
      console.error('Error generating safety instructions:', error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Informations légales et sécurité</h2>
        <p className="text-muted-foreground">
          Mentions obligatoires et consignes de sécurité
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>
            Numéro de licence Airbnb <Badge variant="secondary">Optionnel</Badge>
          </Label>
          <Input
            value={airbnbLicense}
            onChange={(e) => setAirbnbLicense(e.target.value)}
            placeholder="Ex: 06012345678ABCD"
          />
          <p className="text-xs text-muted-foreground">
            Si applicable dans votre commune
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label>
              Consignes de sécurité <Badge variant="destructive">Requis</Badge>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateSafety}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Générer avec IA
            </Button>
          </div>
          <Textarea
            value={safetyInstructions}
            onChange={(e) => setSafetyInstructions(e.target.value)}
            placeholder="- Extincteur dans le placard de l'entrée&#10;- Alarme incendie au plafond&#10;- Sortie de secours..."
            rows={6}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Mentions RGPD <Badge variant="destructive">Requis</Badge>
          </Label>
          <Textarea
            value={gdprNotice}
            onChange={(e) => setGdprNotice(e.target.value)}
            rows={5}
            required
          />
          <p className="text-xs text-muted-foreground">
            Protection des données personnelles selon le RGPD
          </p>
        </div>

        <div className="space-y-2">
          <Label>
            Clause de non-responsabilité <Badge variant="destructive">Requis</Badge>
          </Label>
          <Textarea
            value={disclaimer}
            onChange={(e) => setDisclaimer(e.target.value)}
            rows={4}
            required
          />
        </div>
      </div>
    </div>
  );
}
