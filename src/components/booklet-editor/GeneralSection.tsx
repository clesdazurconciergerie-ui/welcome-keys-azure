import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2, Home, Link2, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  bookletId?: string;
  propertyId?: string | null;
  onPropertyChange?: (propertyId: string | null) => void;
}

export default function GeneralSection({ data, onChange, onGenerate, generating = {}, bookletId, propertyId, onPropertyChange }: GeneralSectionProps) {
  const [properties, setProperties] = useState<{ id: string; name: string; address: string }[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  useEffect(() => {
    const loadProperties = async () => {
      setLoadingProperties(true);
      const { data: props } = await supabase
        .from("properties")
        .select("id, name, address")
        .eq("status", "active")
        .order("name");
      setProperties(props || []);
      setLoadingProperties(false);
    };
    loadProperties();
  }, []);

  const handleLinkProperty = async (propId: string) => {
    if (!bookletId) return;
    const { error } = await supabase.from("booklets").update({ property_id: propId }).eq("id", bookletId);
    if (error) { toast.error("Erreur lors de l'association"); return; }
    onPropertyChange?.(propId);
    toast.success("Logement associé au livret");
  };

  const handleUnlinkProperty = async () => {
    if (!bookletId) return;
    const { error } = await supabase.from("booklets").update({ property_id: null }).eq("id", bookletId);
    if (error) { toast.error("Erreur"); return; }
    onPropertyChange?.(null);
    toast.success("Logement dissocié");
  };

  const linkedProperty = properties.find(p => p.id === propertyId);

  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Informations générales</h2>
        <p className="text-sm text-[#64748B]">
          Les informations principales de votre propriété
        </p>
      </div>

      <div className="space-y-4">
        {/* Property linking */}
        <div className="space-y-2">
          <Label>Logement associé</Label>
          {linkedProperty ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Home className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{linkedProperty.name}</p>
                <p className="text-xs text-muted-foreground truncate">{linkedProperty.address}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={handleUnlinkProperty}>
                <Unlink className="w-4 h-4 mr-1" /> Dissocier
              </Button>
            </div>
          ) : (
            <Select onValueChange={handleLinkProperty} disabled={loadingProperties}>
              <SelectTrigger>
                <SelectValue placeholder={loadingProperties ? "Chargement…" : "Associer un logement…"} />
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <Home className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">— {p.address}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

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