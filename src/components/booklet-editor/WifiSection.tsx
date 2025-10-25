import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { toast } from "sonner";

interface WifiSectionProps {
  data: {
    ssid: string;
    password: string;
    note?: string;
  };
  onChange: (updates: Partial<WifiSectionProps['data']>) => void;
}

const DEFAULT_WIFI = {
  ssid: '',
  password: '',
  note: ''
};

export default function WifiSection({ data = DEFAULT_WIFI, onChange }: WifiSectionProps) {
  const wifiData = { ...DEFAULT_WIFI, ...data };

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

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wifi-ssid">Nom du réseau (SSID)</Label>
          <Input
            id="wifi-ssid"
            value={wifiData.ssid}
            onChange={(e) => onChange({ ssid: e.target.value })}
            placeholder="MonWiFi"
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
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wifi-note">Note (optionnelle)</Label>
          <Input
            id="wifi-note"
            value={wifiData.note}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Ex: Le réseau 5GHz est aussi disponible"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGenerateQR}
          disabled={!wifiData.ssid || !wifiData.password}
        >
          <QrCode className="w-4 h-4 mr-2" />
          Générer QR Code WiFi
        </Button>
      </div>
    </section>
  );
}
