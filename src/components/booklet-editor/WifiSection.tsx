import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { QrCode, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WifiSectionProps {
  data: {
    hasWifi: boolean;
    ssid: string;
    password: string;
    note?: string;
  };
  onChange: (updates: Partial<WifiSectionProps['data']>) => void;
}

const DEFAULT_WIFI = {
  hasWifi: false,
  ssid: '',
  password: '',
  note: ''
};

export default function WifiSection({ data = DEFAULT_WIFI, onChange }: WifiSectionProps) {
  const wifiData = { ...DEFAULT_WIFI, ...data };
  const showWarning = wifiData.hasWifi && (!wifiData.ssid || !wifiData.password);

  const handleGenerateQR = () => {
    if (!wifiData.ssid || !wifiData.password) {
      toast.error("Veuillez remplir le SSID et le mot de passe");
      return;
    }

    const wifiString = `WIFI:T:WPA;S:${wifiData.ssid};P:${wifiData.password};;`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(wifiString)}`;
    window.open(qrUrl, '_blank');
    toast.success("QR code généré !");
  };

  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Connexion Wi-Fi</h2>
        <p className="text-sm text-[#64748B]">
          Partagez facilement les identifiants WiFi avec vos invités
        </p>
      </div>

      {/* Toggle "Pas de Wi-Fi" */}
      <div className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl border border-[#E6EDF2]">
        <div className="flex-1">
          <Label htmlFor="has-wifi" className="text-base font-semibold">
            Ce logement dispose du Wi-Fi
          </Label>
          <p className="text-sm text-[#64748B] mt-1">
            Si désactivé, la section Wi-Fi ne sera pas visible dans le livret
          </p>
        </div>
        <Switch
          id="has-wifi"
          checked={wifiData.hasWifi}
          onCheckedChange={(checked) => onChange({ hasWifi: checked })}
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
          <Label htmlFor="wifi-ssid">Nom du réseau (SSID)</Label>
          <Input
            id="wifi-ssid"
            value={wifiData.ssid}
            onChange={(e) => onChange({ ssid: e.target.value })}
            placeholder="MonWiFi"
            disabled={!wifiData.hasWifi}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wifi-password">Mot de passe</Label>
          <Input
            id="wifi-password"
            type="text"
            value={wifiData.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="••••••••"
            disabled={!wifiData.hasWifi}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wifi-note">Note (optionnelle)</Label>
          <Input
            id="wifi-note"
            value={wifiData.note}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Ex: Le réseau 5GHz est aussi disponible"
            disabled={!wifiData.hasWifi}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGenerateQR}
          disabled={!wifiData.hasWifi || !wifiData.ssid || !wifiData.password}
        >
          <QrCode className="w-4 h-4 mr-2" />
          Générer QR Code WiFi
        </Button>
      </div>
    </section>
  );
}
