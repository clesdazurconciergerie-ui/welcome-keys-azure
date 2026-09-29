import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Archive, Download, History, KeyRound, Nfc, Plus, UserRoundCheck } from "lucide-react";

const demoPouches = [
  { code: "AK-VB-01", name: "Pochette voyageurs", property: "Villa Bianca", status: "Attribuée", holder: "Famille Martin", contents: "2× clés • 1× badge" },
  { code: "AK-VB-02", name: "Pochette ménage", property: "Villa Bianca", status: "Avec le ménage", holder: "Équipe Sofia", contents: "2× clés • 1× télécommande" },
  { code: "AK-VR-01", name: "Pochette de secours", property: "Villa du Rastel", status: "Au stock", holder: "Stock Azure Keys", contents: "3× clés" },
];

export default function DemoSmartKeysPage() {
  return <div className="space-y-6 p-4 sm:p-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="flex items-center gap-3"><div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><KeyRound className="h-6 w-6" /></div><div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Exploitation</p><h1 className="text-2xl font-bold">Pochettes de clés</h1></div></div><p className="mt-3 text-sm text-muted-foreground">Registre NFC, détenteurs, contenu attendu et étiquettes PDF.</p></div>
      <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle pochette</Button>
    </header>
    <section className="grid grid-cols-3 gap-3"><Metric label="Pochettes" value="3" icon={Archive} /><Metric label="En circulation" value="2" icon={UserRoundCheck} /><Metric label="Alertes" value="0" icon={AlertTriangle} /></section>
    <Card><CardHeader><CardTitle>Registre</CardTitle></CardHeader><CardContent className="grid gap-3 xl:grid-cols-2">{demoPouches.map((pouch) => <article key={pouch.code} className="rounded-xl border p-4"><div className="flex flex-wrap items-center gap-2"><span className="font-mono font-bold">{pouch.code}</span><Badge variant="secondary">{pouch.status}</Badge></div><h2 className="mt-2 font-semibold">{pouch.name}</h2><p className="text-sm text-muted-foreground">{pouch.property}</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-lg bg-muted p-3 text-sm"><p className="text-xs text-muted-foreground">Détenteur</p><p className="font-medium">{pouch.holder}</p></div><div className="rounded-lg bg-muted p-3 text-sm"><p className="text-xs text-muted-foreground">Contenu</p><p className="font-medium">{pouch.contents}</p></div></div><div className="mt-4 flex flex-wrap gap-2 border-t pt-4"><Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> PDF</Button><Button size="sm" variant="outline"><Nfc className="h-4 w-4 mr-1" /> NFC</Button><Button size="sm" variant="ghost"><History className="h-4 w-4 mr-1" /> Historique</Button></div></article>)}</CardContent></Card>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Archive }) {
  return <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>;
}
