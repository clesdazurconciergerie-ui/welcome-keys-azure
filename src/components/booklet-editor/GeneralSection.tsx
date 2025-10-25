import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";

interface GeneralSectionProps {
  data: {
    propertyName: string;
    propertyAddress: string;
    welcomeMessage: string;
    checkInTime: string;
    checkOutTime: string;
    contactPhone: string;
    contactEmail: string;
    emergencyContacts: string;
  };
  onChange: (updates: Partial<GeneralSectionProps['data']>) => void;
  onGenerate?: (field: string) => Promise<void>;
  generating?: Record<string, boolean>;
}

export default function GeneralSection({ data, onChange, onGenerate, generating = {} }: GeneralSectionProps) {
  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Informations générales</h2>
        <p className="text-sm text-[#64748B]">
          Les informations principales de votre propriété
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="property-name">Nom de la propriété *</Label>
          <Input
            id="property-name"
            value={data.propertyName}
            onChange={(e) => onChange({ propertyName: e.target.value })}
            placeholder="Villa Les Oliviers"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="property-address">Adresse</Label>
          <Input
            id="property-address"
            value={data.propertyAddress}
            onChange={(e) => onChange({ propertyAddress: e.target.value })}
            placeholder="123 Avenue de la Côte d'Azur, Nice"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="welcome-message">Message de bienvenue</Label>
            {onGenerate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onGenerate('welcome_message')}
                disabled={generating?.welcome_message}
              >
                {generating?.welcome_message ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Générer avec IA
              </Button>
            )}
          </div>
          <Textarea
            id="welcome-message"
            value={data.welcomeMessage}
            onChange={(e) => onChange({ welcomeMessage: e.target.value })}
            placeholder="Bienvenue dans notre magnifique villa..."
            rows={4}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="checkin">Heure d'arrivée</Label>
            <Input
              id="checkin"
              value={data.checkInTime}
              onChange={(e) => onChange({ checkInTime: e.target.value })}
              placeholder="Ex: 16h00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkout">Heure de départ</Label>
            <Input
              id="checkout"
              value={data.checkOutTime}
              onChange={(e) => onChange({ checkOutTime: e.target.value })}
              placeholder="Ex: 10h00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-phone">Téléphone conciergerie</Label>
          <Input
            id="contact-phone"
            type="tel"
            value={data.contactPhone}
            onChange={(e) => onChange({ contactPhone: e.target.value })}
            placeholder="+33 6 12 34 56 78"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={data.contactEmail}
            onChange={(e) => onChange({ contactEmail: e.target.value })}
            placeholder="contact@clesdazur.com"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="emergency">Contacts d'urgence</Label>
            {onGenerate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onGenerate('emergency_contacts')}
                disabled={generating?.emergency_contacts}
              >
                {generating?.emergency_contacts ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Générer avec IA
              </Button>
            )}
          </div>
          <Textarea
            id="emergency"
            value={data.emergencyContacts}
            onChange={(e) => onChange({ emergencyContacts: e.target.value })}
            placeholder="Police: 17&#10;Pompiers: 18&#10;SAMU: 15"
            rows={4}
          />
        </div>
      </div>
    </section>
  );
}
