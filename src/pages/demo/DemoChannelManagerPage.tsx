// MODULE 7 — Démo Channel Manager
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Link2, Copy, RefreshCw, Trash2, ExternalLink, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const MOCK_EXPORTS = [
  { id: "1", property_name: "Villa Azur — Cannes", token: "abc123def456789xyz", is_active: true, access_count: 142, last_accessed: "Il y a 2h" },
  { id: "2", property_name: "Appartement Promenade — Nice", token: "ghi789jkl012345mno", is_active: true, access_count: 87, last_accessed: "Il y a 5h" },
  { id: "3", property_name: "Loft Vieux Port — Marseille", token: "pqr345stu678901vwx", is_active: false, access_count: 23, last_accessed: "Il y a 3 jours" },
];

export default function DemoChannelManagerPage() {
  const handleCopy = () => toast.success("Lien copié (démo)");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Channel Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Synchronisation iCal avec Airbnb, Booking, VRBO. Anti-double-booking automatique.
          </p>
        </div>
        <Button onClick={() => toast.info("Démo : crée un compte pour générer tes liens")}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau lien
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Mes liens ({MOCK_EXPORTS.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_EXPORTS.map((e) => (
              <div key={e.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={e.is_active} disabled />
                    <span className="font-semibold">{e.property_name}</span>
                    {e.is_active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Actif</Badge>
                    ) : (
                      <Badge variant="outline">Inactif</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={`https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/ical-export?token=${e.token}`}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {e.access_count} accès</span>
                  <span>Dernier : {e.last_accessed}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 text-sm">
          <p className="font-semibold mb-1">📋 Tutoriel Airbnb</p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Connecte-toi à Airbnb → Calendrier → Disponibilités</li>
            <li>Section "Synchroniser les calendriers" → Importer un calendrier</li>
            <li>Colle le lien iCal généré ci-dessus</li>
            <li>Nomme la source "MyWelkom" et valide</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
