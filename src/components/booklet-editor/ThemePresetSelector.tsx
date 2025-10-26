import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { THEME_PRESETS, ThemePreset } from "@/types/theme";

interface ThemePresetSelectorProps {
  selectedPreset: ThemePreset;
  onSelectPreset: (preset: ThemePreset) => void;
}

const PRESET_LABELS: Record<ThemePreset, string> = {
  luxe_marine: "Luxe Marine",
  minimal_blanc: "Minimal Blanc",
  noir_elegant: "Noir Élégant",
  custom: "Personnalisé"
};

const PRESET_DESCRIPTIONS: Record<ThemePreset, string> = {
  luxe_marine: "Bleu marine élégant #071552",
  minimal_blanc: "Design épuré noir & blanc",
  noir_elegant: "Noir sophistiqué avec or",
  custom: "Créez votre propre thème"
};

export default function ThemePresetSelector({ selectedPreset, onSelectPreset }: ThemePresetSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-[#0F172A]">Thèmes prédéfinis</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((preset) => {
          const theme = THEME_PRESETS[preset];
          const isSelected = selectedPreset === preset;
          
          return (
            <Card
              key={preset}
              className={`p-4 cursor-pointer transition-all relative ${
                isSelected 
                  ? 'ring-2 ring-primary shadow-md' 
                  : 'hover:shadow-md hover:border-primary/50'
              }`}
              onClick={() => onSelectPreset(preset)}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded border-2 border-[#E6EDF2]"
                    style={{ backgroundColor: theme.primaryHex }}
                  />
                  <div>
                    <p className="font-medium text-sm">{PRESET_LABELS[preset]}</p>
                    <p className="text-xs text-[#64748B]">{PRESET_DESCRIPTIONS[preset]}</p>
                  </div>
                </div>
                
                {/* Color preview */}
                <div className="flex gap-1.5">
                  <div 
                    className="w-6 h-6 rounded border border-[#E6EDF2]"
                    style={{ backgroundColor: theme.primaryHex }}
                    title="Primary"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-[#E6EDF2]"
                    style={{ backgroundColor: theme.accentHex }}
                    title="Accent"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-[#E6EDF2]"
                    style={{ backgroundColor: theme.bgHex }}
                    title="Background"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-[#E6EDF2]"
                    style={{ backgroundColor: theme.textHex }}
                    title="Text"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
