import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RotateCcw, Save, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import ThemePresetSelector from "./ThemePresetSelector";
import ThemeColorPicker from "./ThemeColorPicker";
import ThemeLivePreview from "./ThemeLivePreview";
import { THEME_PRESETS, ThemePreset, FontFamily, FontSize } from "@/types/theme";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { hasGoodContrast } from "@/lib/theme-utils";

interface AppearanceSectionV2Props {
  onSave?: () => void;
  showSaveButton?: boolean;
}

export default function AppearanceSectionV2({ onSave, showSaveButton = true }: AppearanceSectionV2Props) {
  const { theme, updateTheme, resetTheme, applyChanges, cancelChanges, hasUnsavedChanges } = useTheme();

  // Check contrast for accessibility
  const textContrast = hasGoodContrast(theme.textHex || '#0F172A', theme.bgHex || '#ffffff');
  const buttonContrast = hasGoodContrast('#ffffff', theme.primaryHex);

  const handlePresetChange = (preset: ThemePreset) => {
    if (preset === 'custom') {
      updateTheme({ preset });
    } else {
      const presetTheme = THEME_PRESETS[preset];
      updateTheme({ ...presetTheme, preset });
    }
  };

  const handleSave = () => {
    applyChanges();
    onSave?.();
  };

  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Apparence du livret</h2>
        <p className="text-sm text-[#64748B]">
          Personnalisez l'identité visuelle complète de votre livret
        </p>
      </div>

      {/* Unsaved changes alert */}
      {hasUnsavedChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous avez des modifications non enregistrées.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Theme Presets */}
        <ThemePresetSelector 
          selectedPreset={theme.preset || 'custom'}
          onSelectPreset={handlePresetChange}
        />

        {/* Custom Colors */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#0F172A]">Couleurs personnalisées</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ThemeColorPicker
              label="Couleur principale"
              value={theme.primaryHex}
              onChange={(value) => updateTheme({ primaryHex: value, preset: 'custom' })}
              id="color-primary"
            />

            <ThemeColorPicker
              label="Couleur d'accent"
              value={theme.accentHex || theme.primaryHex}
              onChange={(value) => updateTheme({ accentHex: value, preset: 'custom' })}
              id="color-accent"
            />

            <ThemeColorPicker
              label="Fond global"
              value={theme.bgHex || '#ffffff'}
              onChange={(value) => updateTheme({ bgHex: value, preset: 'custom' })}
              id="color-bg"
            />

            <ThemeColorPicker
              label="Texte principal"
              value={theme.textHex || '#0F172A'}
              onChange={(value) => updateTheme({ textHex: value, preset: 'custom' })}
              id="color-text"
            />

            <ThemeColorPicker
              label="Texte secondaire"
              value={theme.mutedHex || '#64748B'}
              onChange={(value) => updateTheme({ mutedHex: value, preset: 'custom' })}
              id="color-muted"
            />
          </div>

          {/* Contrast warnings */}
          {(!textContrast || !buttonContrast) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {!textContrast && "⚠️ Le contraste texte/fond est insuffisant (accessibilité). "}
                {!buttonContrast && "⚠️ Le contraste du bouton principal est insuffisant."}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Typography */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#0F172A]">Typographie</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="font-family">Police de caractères</Label>
              <Select
                value={theme.fontFamily}
                onValueChange={(value) => updateTheme({ fontFamily: value as FontFamily })}
              >
                <SelectTrigger id="font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter (Moderne)</SelectItem>
                  <SelectItem value="Poppins">Poppins (Arrondie)</SelectItem>
                  <SelectItem value="Montserrat">Montserrat (Élégante)</SelectItem>
                  <SelectItem value="System">System (Par défaut)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-size">Taille de texte</Label>
              <Select
                value={theme.baseFontSize}
                onValueChange={(value) => updateTheme({ baseFontSize: value as FontSize })}
              >
                <SelectTrigger id="font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Petit (14px)</SelectItem>
                  <SelectItem value="md">Moyen (16px)</SelectItem>
                  <SelectItem value="lg">Grand (18px)</SelectItem>
                  <SelectItem value="xl">Très grand (20px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <ThemeLivePreview theme={theme} />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-[#E6EDF2]">
          <Button
            variant="outline"
            onClick={resetTheme}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>

          {hasUnsavedChanges && (
            <Button
              variant="ghost"
              onClick={cancelChanges}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Annuler
            </Button>
          )}

          {showSaveButton && (
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="gap-2 ml-auto"
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
