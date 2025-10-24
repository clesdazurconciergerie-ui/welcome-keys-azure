import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { toast } from "sonner";

interface Step3WifiProps {
  bookletId: string;
  data: any;
  onUpdate: (updates: any) => void;
}

export default function Step3Wifi({ bookletId, data, onUpdate }: Step3WifiProps) {
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWifiData();
  }, [bookletId]);

  const fetchWifiData = async () => {
    try {
      const { data: wifiData } = await supabase
        .from("wifi_credentials")
        .select("*")
        .eq("booklet_id", bookletId)
        .maybeSingle();

      if (wifiData) {
        setSsid(wifiData.ssid || "");
        setPassword(wifiData.password || "");
      }
    } catch (error) {
      console.error("Error fetching wifi:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(async () => {
        try {
          await supabase
            .from("wifi_credentials")
            .upsert({
              booklet_id: bookletId,
              ssid,
              password,
            }, { onConflict: 'booklet_id' });
        } catch (error) {
          console.error("Error saving wifi:", error);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [ssid, password, loading]);

  const generateQRCode = () => {
    if (!ssid || !password) {
      toast.error("Veuillez remplir le SSID et le mot de passe");
      return;
    }
    
    // Generate WiFi QR code format: WIFI:T:WPA;S:ssid;P:password;;
    const wifiString = `WIFI:T:WPA;S:${ssid};P:${password};;`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(wifiString)}`;
    
    window.open(qrUrl, '_blank');
    toast.success("QR code généré !");
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Connexion Wi-Fi</h2>
        <p className="text-muted-foreground">
          Partagez les identifiants Wi-Fi avec vos voyageurs
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>
            Nom du réseau (SSID) <Badge variant="destructive">Requis</Badge>
          </Label>
          <Input
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            placeholder="MonWifi"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Mot de passe Wi-Fi <Badge variant="destructive">Requis</Badge>
          </Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <p className="text-xs text-muted-foreground">
            Le mot de passe sera masqué par défaut et révélé sur demande
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={generateQRCode}
            disabled={!ssid || !password}
          >
            <QrCode className="w-4 h-4 mr-2" />
            Générer QR Code
          </Button>
        </div>

        <div className="space-y-2">
          <Label>
            Note complémentaire <Badge variant="secondary">Optionnel</Badge>
          </Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Le routeur se trouve dans le placard de l'entrée..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
