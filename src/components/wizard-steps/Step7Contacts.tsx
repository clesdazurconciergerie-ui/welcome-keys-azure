import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

interface Step7ContactsProps {
  bookletId: string;
}

export default function Step7Contacts({ bookletId }: Step7ContactsProps) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContactData();
  }, [bookletId]);

  const fetchContactData = async () => {
    try {
      const { data } = await supabase
        .from("booklet_contacts")
        .select("*")
        .eq("booklet_id", bookletId)
        .maybeSingle();

      if (data) {
        setPhone(data.contact_phone || "");
        setEmail(data.contact_email || "");
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(async () => {
        try {
          await supabase
            .from("booklet_contacts")
            .upsert({
              booklet_id: bookletId,
              contact_phone: phone,
              contact_email: email,
            }, { onConflict: 'booklet_id' });
        } catch (error) {
          console.error("Error saving contacts:", error);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [phone, email, loading]);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Contacts et assistance</h2>
        <p className="text-muted-foreground">
          Informations de contact pour la conciergerie
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Ces informations sont protégées et ne seront jamais exposées publiquement.
          Seuls les voyageurs authentifiés avec un code PIN valide peuvent y accéder.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>
            Nom de la conciergerie
          </Label>
          <Input
            value="Clés d'Azur"
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Prérempli avec le nom de votre conciergerie
          </p>
        </div>

        <div className="space-y-2">
          <Label>
            Téléphone conciergerie <Badge variant="destructive">Requis</Badge>
          </Label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Email professionnel <Badge variant="destructive">Requis</Badge>
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@clesdazur.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Lien WhatsApp direct <Badge variant="destructive">Requis</Badge>
          </Label>
          <Input
            type="url"
            value={phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : ""}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Généré automatiquement à partir du téléphone
          </p>
        </div>

        <div className="space-y-2">
          <Label>
            Numéro d'urgence <Badge variant="destructive">Requis</Badge>
          </Label>
          <Input
            type="tel"
            value={emergencyNumber}
            onChange={(e) => setEmergencyNumber(e.target.value)}
            placeholder="+33 6 98 76 54 32"
            required
          />
          <p className="text-xs text-muted-foreground">
            Numéro disponible 24/7 en cas d'urgence
          </p>
        </div>
      </div>
    </div>
  );
}
