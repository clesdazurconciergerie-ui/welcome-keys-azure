import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Step1IdentityProps {
  data: any;
  onUpdate: (updates: any) => void;
}

export default function Step1Identity({ data, onUpdate }: Step1IdentityProps) {
  const [propertyName, setPropertyName] = useState(data?.property_name || "");
  const [tagline, setTagline] = useState(data?.tagline || "");
  const [coverImage, setCoverImage] = useState(data?.cover_image_url || "");
  const [welcomeMessage, setWelcomeMessage] = useState(data?.welcome_message || "");
  const [language, setLanguage] = useState(data?.language || "fr");
  const [showLogo, setShowLogo] = useState(data?.show_logo ?? true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate({
        property_name: propertyName,
        tagline,
        cover_image_url: coverImage,
        welcome_message: welcomeMessage,
        language,
        show_logo: showLogo,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [propertyName, tagline, coverImage, welcomeMessage, language, showLogo]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image valide");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${data?.id || 'temp'}-${Math.random()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('booklet-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('booklet-images')
        .getPublicUrl(filePath);

      setCoverImage(publicUrl);
      toast.success("Image téléchargée avec succès !");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setCoverImage("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Identité du logement</h2>
        <p className="text-muted-foreground">
          Commencez par les informations de base de votre propriété
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="propertyName">
            Nom du logement <Badge variant="destructive" className="ml-2">Requis</Badge>
          </Label>
          <Input
            id="propertyName"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
            placeholder="Ex: Villa Azure, Appartement du Port"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tagline">
            Phrase d'accroche <Badge variant="secondary" className="ml-2">Optionnel</Badge>
          </Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Ex: Votre havre de paix face à la mer"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="coverImage">
            Photo principale <Badge variant="destructive" className="ml-2">Requis</Badge>
          </Label>
          
          {coverImage ? (
            <div className="relative">
              <img
                src={coverImage}
                alt="Aperçu"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Input
                id="coverImage"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <Label
                htmlFor="coverImage"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Téléchargement...
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Cliquez pour télécharger une image
                    </span>
                    <span className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP (max 5 MB)
                    </span>
                  </>
                )}
              </Label>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcomeMessage">
            Message de bienvenue <Badge variant="destructive" className="ml-2">Requis</Badge>
          </Label>
          <Textarea
            id="welcomeMessage"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="Bienvenue dans notre magnifique..."
            rows={6}
            required
          />
          <p className="text-xs text-muted-foreground">
            Ce message sera affiché en premier à vos voyageurs
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">
            Langue du livret <Badge variant="destructive" className="ml-2">Requis</Badge>
          </Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="it">Italiano</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="showLogo">Afficher le logo Clés d'Azur</Label>
            <p className="text-sm text-muted-foreground">
              Affichez votre marque de conciergerie
            </p>
          </div>
          <Switch
            id="showLogo"
            checked={showLogo}
            onCheckedChange={setShowLogo}
          />
        </div>
      </div>
    </div>
  );
}
