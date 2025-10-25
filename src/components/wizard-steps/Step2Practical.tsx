import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Step2PracticalProps {
  data: any;
  onUpdate: (updates: any) => void;
}

export default function Step2Practical({ data, onUpdate }: Step2PracticalProps) {
  const [address, setAddress] = useState(data?.property_address || "");
  const [mapsLink, setMapsLink] = useState(data?.google_maps_link || "");
  const [accessCode, setAccessCode] = useState(data?.access_code || "");
  const [checkInTime, setCheckInTime] = useState(data?.check_in_time || "");
  const [checkOutTime, setCheckOutTime] = useState(data?.check_out_time || "");
  const [checkinProcedure, setCheckinProcedure] = useState(data?.checkin_procedure || "");
  const [checkoutProcedure, setCheckoutProcedure] = useState(data?.checkout_procedure || "");
  const [parking, setParking] = useState(data?.parking_info || "");
  const [houseRules, setHouseRules] = useState(data?.house_rules || "");
  const [manualPdf, setManualPdf] = useState(data?.manual_pdf_url || "");
  const [safetyTips, setSafetyTips] = useState(data?.safety_tips || "");
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate({
        property_address: address,
        google_maps_link: mapsLink,
        access_code: accessCode,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        checkin_procedure: checkinProcedure,
        checkout_procedure: checkoutProcedure,
        parking_info: parking,
        house_rules: houseRules,
        manual_pdf_url: manualPdf,
        safety_tips: safetyTips,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [address, mapsLink, accessCode, checkInTime, checkOutTime, checkinProcedure, checkoutProcedure, parking, houseRules, manualPdf, safetyTips]);

  const handleGenerate = async (contentType: string, setter: (value: string) => void) => {
    const propertyName = (data as any)?.property_name || "votre logement";
    const propertyAddress = address || "l'adresse";

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
        <h2 className="text-2xl font-bold mb-2">Informations pratiques</h2>
        <p className="text-muted-foreground">
          Toutes les informations essentielles pour l'arrivée et le séjour
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>
            Adresse complète <Badge variant="destructive">Requis</Badge>
          </Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Avenue de la Croisette, 06400 Cannes"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Lien Google Maps <Badge variant="destructive">Requis</Badge>
          </Label>
          <Input
            value={mapsLink}
            onChange={(e) => setMapsLink(e.target.value)}
            placeholder="https://maps.google.com/..."
            type="url"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Code d'accès / Instructions d'entrée <Badge variant="destructive">Requis</Badge>
          </Label>
          <Textarea
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Code porte : 1234A, Boîte à clés n°5"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Heure d'arrivée <Badge variant="destructive">Requis</Badge>
            </Label>
            <Input
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              placeholder="16h00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>
              Heure de départ <Badge variant="destructive">Requis</Badge>
            </Label>
            <Input
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              placeholder="10h00"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label>
              Procédure de check-in <Badge variant="destructive">Requis</Badge>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerate('checkin_procedure', setCheckinProcedure)}
              disabled={generating === 'checkin_procedure'}
            >
              {generating === 'checkin_procedure' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Générer avec IA
            </Button>
          </div>
          <Textarea
            value={checkinProcedure}
            onChange={(e) => setCheckinProcedure(e.target.value)}
            placeholder="1. Récupérez les clés dans la boîte à clés...&#10;2. Entrez le code..."
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label>
              Procédure de check-out <Badge variant="destructive">Requis</Badge>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerate('checkout_procedure', setCheckoutProcedure)}
              disabled={generating === 'checkout_procedure'}
            >
              {generating === 'checkout_procedure' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Générer avec IA
            </Button>
          </div>
          <Textarea
            value={checkoutProcedure}
            onChange={(e) => setCheckoutProcedure(e.target.value)}
            placeholder="1. Fermez les fenêtres...&#10;2. Déposez les clés..."
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label>
              Stationnement <Badge variant="destructive">Requis</Badge>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerate('parking_info', setParking)}
              disabled={generating === 'parking_info'}
            >
              {generating === 'parking_info' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Générer avec IA
            </Button>
          </div>
          <Textarea
            value={parking}
            onChange={(e) => setParking(e.target.value)}
            placeholder="Place de parking n°12 au sous-sol..."
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label>
              Règlement intérieur <Badge variant="destructive">Requis</Badge>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerate('house_rules', setHouseRules)}
              disabled={generating === 'house_rules'}
            >
              {generating === 'house_rules' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Générer avec IA
            </Button>
          </div>
          <Textarea
            value={houseRules}
            onChange={(e) => setHouseRules(e.target.value)}
            placeholder="- Non fumeur&#10;- Pas de fêtes&#10;- Respectez le voisinage..."
            rows={6}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Manuel PDF (URL) <Badge variant="secondary">Optionnel</Badge>
          </Label>
          <Input
            value={manualPdf}
            onChange={(e) => setManualPdf(e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>

        <div className="space-y-2">
          <Label>
            Conseils sécurité <Badge variant="secondary">Optionnel</Badge>
          </Label>
          <Textarea
            value={safetyTips}
            onChange={(e) => setSafetyTips(e.target.value)}
            placeholder="Extincteur dans le placard de l'entrée..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
