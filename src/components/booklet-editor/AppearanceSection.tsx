import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AppearanceSectionProps {
  data: {
    colors: {
      background: string;
      accent: string;
      text: string;
      muted: string;
    };
    font: string;
    layout: string;
  };
  onChange: (updates: Partial<AppearanceSectionProps['data']>) => void;
}

const DEFAULT_APPEARANCE = {
  colors: {
    background: '#ffffff',
    accent: '#071552',
    text: '#0F172A',
    muted: '#64748B'
  },
  font: 'Inter',
  layout: 'comfortable'
};

export default function AppearanceSection({ data = DEFAULT_APPEARANCE, onChange }: AppearanceSectionProps) {
  const appearance = { ...DEFAULT_APPEARANCE, ...data };
  const colors = { ...DEFAULT_APPEARANCE.colors, ...data.colors };

  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Apparence du livret</h2>
        <p className="text-sm text-[#64748B]">
          Personnalisez les couleurs, typographie et mise en page
        </p>
      </div>

      <div className="space-y-6">
        {/* Couleurs */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#0F172A]">Couleurs (format HEX)</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color-background">Fond global</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors.background}
                  onChange={(e) => onChange({ colors: { ...colors, background: e.target.value } })}
                  className="w-12 h-12 rounded border border-[#E6EDF2] cursor-pointer"
                />
                <Input
                  id="color-background"
                  value={colors.background}
                  onChange={(e) => onChange({ colors: { ...colors, background: e.target.value } })}
                  placeholder="#ffffff"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color-accent">Couleur d'accent</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors.accent}
                  onChange={(e) => onChange({ colors: { ...colors, accent: e.target.value } })}
                  className="w-12 h-12 rounded border border-[#E6EDF2] cursor-pointer"
                />
                <Input
                  id="color-accent"
                  value={colors.accent}
                  onChange={(e) => onChange({ colors: { ...colors, accent: e.target.value } })}
                  placeholder="#071552"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color-text">Texte principal</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors.text}
                  onChange={(e) => onChange({ colors: { ...colors, text: e.target.value } })}
                  className="w-12 h-12 rounded border border-[#E6EDF2] cursor-pointer"
                />
                <Input
                  id="color-text"
                  value={colors.text}
                  onChange={(e) => onChange({ colors: { ...colors, text: e.target.value } })}
                  placeholder="#0F172A"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color-muted">Texte secondaire</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors.muted}
                  onChange={(e) => onChange({ colors: { ...colors, muted: e.target.value } })}
                  className="w-12 h-12 rounded border border-[#E6EDF2] cursor-pointer"
                />
                <Input
                  id="color-muted"
                  value={colors.muted}
                  onChange={(e) => onChange({ colors: { ...colors, muted: e.target.value } })}
                  placeholder="#64748B"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Typographie */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#0F172A]">Typographie</h3>
          
          <div className="space-y-2">
            <Label htmlFor="font-family">Police de caractères</Label>
            <Select
              value={appearance.font}
              onValueChange={(value) => onChange({ font: value })}
            >
              <SelectTrigger id="font-family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Poppins">Poppins</SelectItem>
                <SelectItem value="Montserrat">Montserrat</SelectItem>
                <SelectItem value="System">System (par défaut)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Layout */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#0F172A]">Mise en page</h3>
          
          <div className="space-y-2">
            <Label htmlFor="layout">Espacement</Label>
            <Select
              value={appearance.layout}
              onValueChange={(value) => onChange({ layout: value })}
            >
              <SelectTrigger id="layout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Confortable</SelectItem>
                <SelectItem value="spacious">Spacieux</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Aperçu live */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#0F172A]">Aperçu</h3>
          <div
            className="p-6 rounded-xl border border-[#E6EDF2] text-center transition-all"
            style={{
              background: colors.background,
              color: colors.text,
              fontFamily: appearance.font === 'System' ? 'system-ui, -apple-system, sans-serif' : appearance.font
            }}
          >
            <h1 className="text-2xl font-bold mb-2" style={{ color: colors.accent }}>
              Votre Livret
            </h1>
            <p className="text-sm" style={{ color: colors.muted }}>
              Aperçu du style visuel de votre livret d'accueil
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
