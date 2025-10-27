import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Step3WifiProps {
  data: any;
  onUpdate: (updates: any) => void;
}

export default function Step3Wifi({ data, onUpdate }: Step3WifiProps) {
  const [hasWifi, setHasWifi] = useState(false);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const bookletId = data?.id;

  useEffect(() => {
    if (bookletId) {
      fetchWifiData();
    } else {
      setLoading(false);
    }
  }, [bookletId]);

  const fetchWifiData = async () => {
    try {
      const { data: wifiData } = await supabase
        .from("wifi_credentials")
        .select("*")
        .eq("booklet_id", bookletId)
        .maybeSingle();

      if (wifiData) {
        setHasWifi(wifiData.has_wifi || false);
        setSsid(wifiData.ssid || "");
        setPassword(wifiData.password || "");
      }
    } catch (error) {
      console.error("Error fetching wifi:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-save wifi data
  useEffect(() => {
    if (!loading && bookletId) {
      const timer = setTimeout(async () => {
        try {
          await supabase.from("wifi_credentials").upsert(
            {
              booklet_id: bookletId,
              has_wifi: hasWifi,
              ssid: ssid || "",
              password: password || "",
            },
            {
              onConflict: "booklet_id",
            }
          );
        } catch (error) {
          console.error("Error saving wifi:", error);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasWifi, ssid, password, loading, bookletId]);

  const generateQRCode = () => {
    if (!ssid || !password) {
      toast.error("Veuillez remplir le SSID et le mot de passe");
      return;
    }

    const wifiString = `WIFI:T:WPA;S:${ssid};P:${password};;`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(wifiString)}`;
    window.open(qrUrl, "_blank");
    toast.success("QR code généré !");
  };

  const showWarning = hasWifi && (!ssid || !password);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-8 md:space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Connexion Wi-Fi</h2>
        <p className="text-muted-foreground">
          Partagez les identifiants Wi-Fi avec vos voyageurs
        </p>
      </div>

      {/* Toggle "Ce logement dispose du Wi-Fi" */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
        <div className="flex-1">
          <Label htmlFor="has-wifi-wizard" className="text-base font-semibold cursor-pointer">
            Ce logement dispose du Wi-Fi
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Si désactivé, la section Wi-Fi ne sera pas visible dans le livret
          </p>
        </div>
        <Switch
          id="has-wifi-wizard"
          checked={hasWifi}
          onCheckedChange={setHasWifi}
        />
      </div>

      {/* Avertissement si has_wifi = true mais champs vides */}
      {showWarning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous avez indiqué qu'il y a du Wi-Fi mais les informations ne sont pas complètes.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nom du réseau (SSID)</Label>
          <Input
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            placeholder="MonWifi"
            disabled={!hasWifi}
          />
        </div>

        <div className="space-y-2">
          <Label>Mot de passe Wi-Fi</Label>
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={!hasWifi}
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
            disabled={!hasWifi || !ssid || !password}
          >
            <QrCode className="w-4 h-4 mr-2" />
            Générer QR Code
          </Button>
        </div>
      </div>
    </div>
  );
}
