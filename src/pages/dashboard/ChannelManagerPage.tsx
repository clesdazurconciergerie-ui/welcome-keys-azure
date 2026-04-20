// MODULE 7 — Channel Manager Lite : page de gestion des exports iCal
import { useState } from "react";
import { useICalExports, getICalUrl, type ICalExport } from "@/hooks/useICalExports";
import { useProperties } from "@/hooks/useProperties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Link2, Copy, RefreshCw, Trash2, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ChannelManagerPage() {
  const { exports, isLoading, createExport, update, remove, regenerateToken } = useICalExports();
  const { properties } = useProperties();
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState<string>("");

  const handleCreate = () => {
    if (!propertyId) return;
    createExport(propertyId);
    setOpen(false);
    setPropertyId("");
  };

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(getICalUrl(token));
    toast.success("Lien copié dans le presse-papier");
  };

  const propMap = new Map(properties?.map((p) => [p.id, p.name]) ?? []);
  const usedPropertyIds = new Set(exports.map((e) => e.property_id));
  const availableProperties = properties?.filter((p) => !usedPropertyIds.has(p.id)) ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Channel Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Génère un lien iCal sortant à coller dans Airbnb, Booking, VRBO. Synchronisation automatique des disponibilités.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableProperties.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau lien
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Générer un lien iCal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Bien</Label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger><SelectValue placeholder="Choisir un bien" /></SelectTrigger>
                  <SelectContent>
                    {availableProperties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
                <p className="font-semibold">Comment ça marche ?</p>
                <p className="text-muted-foreground">1. On génère un lien iCal unique pour ce bien</p>
                <p className="text-muted-foreground">2. Tu le copies dans Airbnb (Calendrier → Synchroniser)</p>
                <p className="text-muted-foreground">3. Airbnb bloque les dates réservées sur les autres plateformes</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={!propertyId}>Générer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Mes liens ({exports.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : exports.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="h-12 w-12 text-primary/40 mx-auto mb-3" />
              <p className="font-semibold">Aucun lien généré</p>
              <p className="text-sm text-muted-foreground mt-1">Crée ton premier lien iCal pour synchroniser tes plateformes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exports.map((e) => (
                <ExportRow
                  key={e.id}
                  exp={e}
                  propertyName={propMap.get(e.property_id) ?? "Bien inconnu"}
                  onCopy={handleCopy}
                  onUpdate={(patch) => update({ id: e.id, ...patch })}
                  onRegenerate={() => regenerateToken(e.id)}
                  onRemove={() => remove(e.id)}
                />
              ))}
            </div>
          )}
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

function ExportRow({
  exp,
  propertyName,
  onCopy,
  onUpdate,
  onRegenerate,
  onRemove,
}: {
  exp: ICalExport;
  propertyName: string;
  onCopy: (t: string) => void;
  onUpdate: (patch: Partial<ICalExport>) => void;
  onRegenerate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Switch checked={exp.is_active} onCheckedChange={(v) => onUpdate({ is_active: v })} />
          <span className="font-semibold">{propertyName}</span>
          {exp.is_active ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Actif</Badge>
          ) : (
            <Badge variant="outline">Inactif</Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onRegenerate} title="Regénérer le token">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="flex gap-2">
        <Input value={getICalUrl(exp.feed_token)} readOnly className="font-mono text-xs" />
        <Button variant="outline" size="icon" onClick={() => onCopy(exp.feed_token)}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" asChild>
          <a href={getICalUrl(exp.feed_token)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {exp.access_count} accès
        </span>
        {exp.last_accessed_at && (
          <span>Dernier accès : {new Date(exp.last_accessed_at).toLocaleString("fr-FR")}</span>
        )}
      </div>
    </div>
  );
}
