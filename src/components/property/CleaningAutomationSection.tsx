import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Sparkles, Clock, Euro, FileText } from "lucide-react";
import { useCleaningAutomation, type CleaningAutomationSettings } from "@/hooks/useCleaningAutomation";

interface Props {
  propertyId: string;
}

export function CleaningAutomationSection({ propertyId }: Props) {
  const { settings, loading, saving, save, setSettings } = useCleaningAutomation(propertyId);
  const [form, setForm] = useState<CleaningAutomationSettings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = () => {
    save(form);
  };

  const update = (key: keyof CleaningAutomationSettings, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[hsl(var(--gold))]" />
              <CardTitle className="text-base">Ménage automatique</CardTitle>
            </div>
            <Switch
              checked={form.cleaning_enabled}
              onCheckedChange={v => update("cleaning_enabled", v)}
            />
          </div>
          {form.cleaning_enabled && (
            <p className="text-xs text-muted-foreground mt-1">
              Après chaque checkout, une mission ménage ouverte sera créée automatiquement.
            </p>
          )}
        </CardHeader>

        {form.cleaning_enabled && (
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1.5 mb-1">
                  <Euro className="h-3.5 w-3.5" /> Montant prestation (€)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.cleaning_payout_amount}
                  onChange={e => update("cleaning_payout_amount", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5" /> Heure de début
                </Label>
                <Input
                  type="time"
                  value={form.cleaning_default_start_time}
                  onChange={e => update("cleaning_default_start_time", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1">Durée (minutes)</Label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={form.cleaning_duration_minutes}
                  onChange={e => update("cleaning_duration_minutes", parseInt(e.target.value) || 120)}
                />
              </div>
              <div>
                <Label className="mb-1">Délai après checkout (heures)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.cleaning_lead_time_hours}
                  onChange={e => update("cleaning_lead_time_hours", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Mission ouverte par défaut</p>
                <p className="text-xs text-muted-foreground">Les prestataires peuvent postuler librement</p>
              </div>
              <Switch
                checked={form.cleaning_open_mode}
                onCheckedChange={v => update("cleaning_open_mode", v)}
              />
            </div>

            <div>
              <Label className="flex items-center gap-1.5 mb-1">
                <FileText className="h-3.5 w-3.5" /> Instructions par défaut
              </Label>
              <Textarea
                placeholder="Instructions envoyées automatiquement au prestataire..."
                value={form.cleaning_instructions_template || ""}
                onChange={e => update("cleaning_instructions_template", e.target.value || null)}
                rows={3}
              />
            </div>

            {form.cleaning_enabled && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-[10px] shrink-0">
                    Actif
                  </Badge>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Utilisez le bouton "Sync ménage" sur la page Missions pour générer les missions ménage des 30 prochains jours.
                    Chaque checkout créera une mission à{" "}
                    <strong>{form.cleaning_default_start_time}</strong>
                    {form.cleaning_lead_time_hours > 0 && ` (+${form.cleaning_lead_time_hours}h)`}
                    {" "}pour <strong>{form.cleaning_payout_amount}€</strong>.
                  </p>
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </CardContent>
        )}

        {!form.cleaning_enabled && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Activez pour créer automatiquement des missions ménage après chaque checkout.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
