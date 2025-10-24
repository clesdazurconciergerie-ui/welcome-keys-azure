import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Gift, Star, QrCode, ThumbsUp } from "lucide-react";

interface Step10BonusProps {
  data: any;
  onUpdate: (updates: any) => void;
}

export default function Step10Bonus({ data, onUpdate }: Step10BonusProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Bonus (optionnel)</h2>
        <p className="text-muted-foreground">
          Fonctionnalités supplémentaires pour enrichir l'expérience
        </p>
      </div>

      <div className="grid gap-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-primary mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Recommandations personnalisées</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Partagez vos coups de cœur locaux
              </p>
              <Textarea
                placeholder="Mes restaurants préférés, activités secrètes..."
                rows={4}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <QrCode className="w-5 h-5 text-primary mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">QR codes utiles</h3>
              <p className="text-sm text-muted-foreground">
                Générés automatiquement pour WiFi, contacts, etc.
              </p>
              <Badge variant="secondary" className="mt-2">Fonctionnalité automatique</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <ThumbsUp className="w-5 h-5 text-primary mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Bouton avis</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Encouragez vos voyageurs à laisser un avis
              </p>
              <Label className="text-sm">Lien vers votre page d'avis (Airbnb, Booking...)</Label>
              <Textarea
                placeholder="https://..."
                rows={2}
                className="mt-2"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Gift className="w-5 h-5 text-primary mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Suggestion d'autres logements</h3>
              <p className="text-sm text-muted-foreground">
                Proposez vos autres propriétés
              </p>
              <Badge variant="secondary" className="mt-2">À développer</Badge>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">✨ Livret presque terminé !</h3>
        <p className="text-sm text-muted-foreground">
          Vous avez complété toutes les étapes. Cliquez sur "Suivant" puis "Publier" pour générer votre code PIN unique et rendre votre livret accessible aux voyageurs.
        </p>
      </div>
    </div>
  );
}
