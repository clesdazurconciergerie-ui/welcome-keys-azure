import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAutomationSettings } from "@/hooks/useAutomationSettings";
import { Zap, Bell, Camera, Clock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const AutomationPage = () => {
  const { settings, loading, saving, updateSettings } = useAutomationSettings();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Automatisation</h1>
        <p className="text-muted-foreground mt-1">
          Configurez les automatisations pour gagner du temps
        </p>
      </motion.div>

      {/* Mission Automation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-primary" />
            Missions de ménage
          </CardTitle>
          <CardDescription>
            Création automatique des missions à partir des réservations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">Missions automatiques</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Créer automatiquement des missions de ménage lors des check-outs
              </p>
            </div>
            <Switch
              checked={settings.auto_cleaning_missions}
              onCheckedChange={(v) => updateSettings({ auto_cleaning_missions: v })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>
            Restez informé des événements importants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">Notifications activées</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Recevoir des notifications pour les missions, inspections, etc.
              </p>
            </div>
            <Switch
              checked={settings.notifications_enabled}
              onCheckedChange={(v) => updateSettings({ notifications_enabled: v })}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">Rappels prestataires</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Envoyer des rappels automatiques aux prestataires
              </p>
            </div>
            <Switch
              checked={settings.provider_reminders}
              onCheckedChange={(v) => updateSettings({ provider_reminders: v })}
              disabled={saving || !settings.notifications_enabled}
            />
          </div>

          {settings.provider_reminders && (
            <div className="pl-4 border-l-2 border-primary/20">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Heures avant la mission
              </Label>
              <Input
                type="number"
                min="1"
                max="72"
                value={settings.reminder_hours_before}
                onChange={(e) =>
                  updateSettings({ reminder_hours_before: parseInt(e.target.value) || 24 })
                }
                disabled={saving}
                className="mt-2 max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Envoyer un rappel {settings.reminder_hours_before}h avant chaque mission
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Linking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="w-5 h-5 text-primary" />
            Photos de ménage
          </CardTitle>
          <CardDescription>
            Liaison automatique avec les états des lieux
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">Liaison automatique</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Associer automatiquement les photos aux états des lieux correspondants
              </p>
            </div>
            <Switch
              checked={settings.auto_link_cleaning_photos}
              onCheckedChange={(v) => updateSettings({ auto_link_cleaning_photos: v })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Astuce :</strong> Les automatisations fonctionnent en arrière-plan et
          respectent toujours vos paramètres de logements et prestataires.
        </p>
      </div>
    </div>
  );
};

export default AutomationPage;
