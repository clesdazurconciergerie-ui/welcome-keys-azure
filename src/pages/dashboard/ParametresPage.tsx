import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const ParametresPage = () => {
  const { flags, loading, update } = useFeatureFlags();

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de votre compte</p>
      </motion.div>

      {/* AI Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Fonctionnalités IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "ai_enabled" as const, label: "IA activée", desc: "Active/désactive toutes les fonctionnalités IA" },
            { key: "ai_analysis_enabled" as const, label: "Analyse de performance", desc: "Résumé et insights IA sur vos KPIs" },
            { key: "ai_tasks_enabled" as const, label: "Tâches intelligentes", desc: "Suggestions de tâches par IA et règles automatiques" },
            { key: "ai_listing_enabled" as const, label: "Optimiseur d'annonces", desc: "Amélioration IA de vos annonces immobilières" },
            { key: "ai_forecast_enabled" as const, label: "Prévisionnel", desc: "Projections financières basées sur l'historique" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={flags[key]}
                onCheckedChange={(v) => update({ [key]: v })}
                disabled={loading || (key !== "ai_enabled" && !flags.ai_enabled)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="text-center py-12 border-border">
        <CardContent className="pt-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <Settings className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Autres paramètres</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Profil, notifications, intégrations et préférences de compte.
          </p>
          <p className="text-sm text-muted-foreground font-medium mt-2">🚧 Bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParametresPage;
