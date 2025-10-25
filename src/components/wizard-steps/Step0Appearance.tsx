import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Type, Layout, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppearanceConfig {
  theme: string;
  colors: {
    background: string;
    surface: string;
    accent: string;
    text: string;
    muted: string;
  };
  typography: {
    font_family: string;
    base_size: number;
    heading_weight: number;
    body_weight: number;
  };
  layout: {
    content_width: number;
    radius: number;
    shadow: string;
    spacing: string;
  };
  header: {
    hero_overlay: number;
    title_align: string;
    show_location: boolean;
  };
  branding: {
    concierge_name: string;
    logo_url: string;
    show_footer_brand: boolean;
  };
}

const THEME_PRESETS: Record<string, AppearanceConfig['colors']> = {
  clair: {
    background: '#ffffff',
    surface: '#ffffff',
    accent: '#18c0df',
    text: '#1a1a1a',
    muted: '#6b7280'
  },
  sable: {
    background: '#faf8f3',
    surface: '#ffffff',
    accent: '#d4a574',
    text: '#2c2416',
    muted: '#7a6f5d'
  },
  marine: {
    background: '#f0f4f8',
    surface: '#ffffff',
    accent: '#2563eb',
    text: '#0f172a',
    muted: '#64748b'
  },
  nuit: {
    background: '#0f172a',
    surface: '#1e293b',
    accent: '#38bdf8',
    text: '#f1f5f9',
    muted: '#94a3b8'
  },
  forêt: {
    background: '#f0f5f0',
    surface: '#ffffff',
    accent: '#059669',
    text: '#064e3b',
    muted: '#6b7280'
  },
  charcoal: {
    background: '#18181b',
    surface: '#27272a',
    accent: '#fbbf24',
    text: '#fafafa',
    muted: '#a1a1aa'
  }
};

interface Step0AppearanceProps {
  bookletId: string;
  onNext: () => void;
}

export default function Step0Appearance({ bookletId, onNext }: Step0AppearanceProps) {
  const [appearance, setAppearance] = useState<AppearanceConfig>({
    theme: 'clair',
    colors: THEME_PRESETS.clair,
    typography: {
      font_family: 'Inter',
      base_size: 16,
      heading_weight: 700,
      body_weight: 400
    },
    layout: {
      content_width: 1100,
      radius: 16,
      shadow: 'soft',
      spacing: 'comfortable'
    },
    header: {
      hero_overlay: 0.65,
      title_align: 'left',
      show_location: true
    },
    branding: {
      concierge_name: '',
      logo_url: '',
      show_footer_brand: true
    }
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAppearance();
  }, [bookletId]);

  const loadAppearance = async () => {
    const { data, error } = await supabase
      .from('booklets')
      .select('appearance, concierge_name, logo_url')
      .eq('id', bookletId)
      .single();

    if (error) {
      console.error('Error loading appearance:', error);
      return;
    }

    if (data?.appearance) {
      const appearanceData = data.appearance as Record<string, any>;
      setAppearance(appearanceData as AppearanceConfig);
    }
    
    if (data?.concierge_name) {
      setAppearance(prev => ({
        ...prev,
        branding: { ...prev.branding, concierge_name: data.concierge_name }
      }));
    }
    
    if (data?.logo_url) {
      setLogoPreview(data.logo_url);
      setAppearance(prev => ({
        ...prev,
        branding: { ...prev.branding, logo_url: data.logo_url }
      }));
    }
  };

  const handleThemeChange = (theme: string) => {
    if (theme !== 'custom' && THEME_PRESETS[theme]) {
      setAppearance(prev => ({
        ...prev,
        theme,
        colors: THEME_PRESETS[theme]
      }));
    } else {
      setAppearance(prev => ({ ...prev, theme }));
    }
  };

  const handleColorChange = (key: keyof AppearanceConfig['colors'], value: string) => {
    setAppearance(prev => ({
      ...prev,
      theme: 'custom',
      colors: { ...prev.colors, [key]: value }
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le logo ne doit pas dépasser 2 Mo');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return appearance.branding.logo_url || null;

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${bookletId}-logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('booklet-assets')
      .upload(filePath, logoFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Erreur lors de l\'upload du logo');
      return null;
    }

    const { data } = supabase.storage
      .from('booklet-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = appearance.branding.logo_url;
      
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      const updatedAppearance = {
        ...appearance,
        branding: {
          ...appearance.branding,
          logo_url: logoUrl
        }
      };

      const { error } = await supabase
        .from('booklets')
        .update({
          appearance: updatedAppearance,
          concierge_name: appearance.branding.concierge_name || null,
          logo_url: logoUrl || null
        })
        .eq('id', bookletId);

      if (error) throw error;

      toast.success('Apparence enregistrée');
      onNext();
    } catch (error) {
      console.error('Error saving appearance:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">🎨 Apparence</h2>
        <p className="text-muted-foreground">
          Personnalisez le design de votre livret pour refléter votre identité visuelle
        </p>
      </div>

      {/* Theme Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Thème</h3>
        </div>
        <Select value={appearance.theme} onValueChange={handleThemeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="clair">Clair</SelectItem>
            <SelectItem value="sable">Sable</SelectItem>
            <SelectItem value="marine">Marine</SelectItem>
            <SelectItem value="nuit">Nuit</SelectItem>
            <SelectItem value="forêt">Forêt</SelectItem>
            <SelectItem value="charcoal">Charcoal</SelectItem>
            <SelectItem value="custom">Personnalisé</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Colors */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Couleurs</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(appearance.colors).map(([key, value]) => (
            <div key={key}>
              <Label className="capitalize mb-2 block">
                {key === 'background' ? 'Fond global' :
                 key === 'surface' ? 'Surface (cartes)' :
                 key === 'accent' ? 'Couleur d\'accent' :
                 key === 'text' ? 'Texte principal' :
                 'Texte secondaire'}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleColorChange(key as keyof AppearanceConfig['colors'], e.target.value)}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <Input
                  type="text"
                  value={value}
                  onChange={(e) => handleColorChange(key as keyof AppearanceConfig['colors'], e.target.value)}
                  pattern="^#([0-9A-Fa-f]{3,8})$"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Typography */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Type className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Typographie</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">Police</Label>
            <Select
              value={appearance.typography.font_family}
              onValueChange={(value) =>
                setAppearance(prev => ({
                  ...prev,
                  typography: { ...prev.typography, font_family: value }
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Montserrat">Montserrat</SelectItem>
                <SelectItem value="Poppins">Poppins</SelectItem>
                <SelectItem value="System">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Taille du texte: {appearance.typography.base_size}px</Label>
            <input
              type="range"
              min="14"
              max="18"
              value={appearance.typography.base_size}
              onChange={(e) =>
                setAppearance(prev => ({
                  ...prev,
                  typography: { ...prev.typography, base_size: parseInt(e.target.value) }
                }))
              }
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Branding */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Branding</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Nom de conciergerie</Label>
            <Input
              value={appearance.branding.concierge_name}
              onChange={(e) =>
                setAppearance(prev => ({
                  ...prev,
                  branding: { ...prev.branding, concierge_name: e.target.value }
                }))
              }
              placeholder="Ex: Clés d'Azur"
            />
          </div>
          <div>
            <Label className="mb-2 block">Logo (optionnel, max 2 Mo)</Label>
            <Input
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleLogoUpload}
              className="cursor-pointer"
            />
            {logoPreview && (
              <div className="mt-3">
                <img src={logoPreview} alt="Logo preview" className="h-16 object-contain" />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layout className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Aperçu</h3>
        </div>
        <div
          className="p-8 rounded-xl text-center transition-all duration-300"
          style={{
            background: appearance.colors.background,
            color: appearance.colors.text,
            fontFamily: appearance.typography.font_family === 'System' 
              ? 'system-ui, -apple-system, sans-serif' 
              : appearance.typography.font_family
          }}
        >
          <h1 className="text-3xl font-bold mb-2" style={{ color: appearance.colors.accent }}>
            Balcon d'Azur
          </h1>
          <p className="text-sm" style={{ color: appearance.colors.muted }}>
            {appearance.branding.concierge_name ? `by ${appearance.branding.concierge_name}` : 'Votre livret d\'accueil'}
          </p>
          <div 
            className="mt-4 p-4 rounded-lg"
            style={{ background: appearance.colors.surface }}
          >
            <p style={{ fontSize: `${appearance.typography.base_size}px` }}>
              Exemple de texte dans votre livret
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer et continuer'}
        </Button>
      </div>
    </div>
  );
}
