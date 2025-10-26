import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Link as LinkIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AirbnbImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: (data: any) => void;
  bookletId?: string;
}

export default function AirbnbImportModal({ open, onClose, onImportSuccess, bookletId }: AirbnbImportModalProps) {
  const [url, setUrl] = useState("");
  const [fallbackText, setFallbackText] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'url' | 'text'>('url');

  const handleImport = async () => {
    if (mode === 'url' && !url) {
      toast.error("Veuillez saisir une URL Airbnb");
      return;
    }
    
    if (mode === 'text' && !fallbackText) {
      toast.error("Veuillez coller le texte de l'annonce");
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('import-airbnb', {
        body: { 
          url: mode === 'url' ? url : null,
          fallbackText: mode === 'text' ? fallbackText : null,
          mode: mode === 'text' ? 'fallback' : 'scrape',
          bookletId: bookletId
        }
      });

      if (error) throw error;

      if (!data.success) {
        if (data.error === 'blocked') {
          toast.error(data.message || "Airbnb bloque l'accès automatique");
          setMode('text');
          return;
        }
        throw new Error(data.error || 'Import failed');
      }

      toast.success("Données importées avec succès !");
      onImportSuccess(data.data);
      onClose();
      setUrl("");
      setFallbackText("");
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importer depuis Airbnb</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'url' | 'text')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Texte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL de l'annonce Airbnb</label>
              <Input
                placeholder="https://www.airbnb.fr/rooms/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Collez l'URL complète de votre annonce Airbnb
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Informations récupérées :</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Titre, description, photos</li>
                <li>• Équipements et capacité</li>
                <li>• Règles de la maison</li>
                <li>• Horaires check-in/out</li>
                <li>• Informations sur le quartier</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Texte de l'annonce</label>
              <Textarea
                placeholder="Collez ici le texte complet de votre annonce Airbnb (description, équipements, règles...)"
                value={fallbackText}
                onChange={(e) => setFallbackText(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Copiez tout le contenu visible de votre annonce Airbnb et collez-le ci-dessus
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                💡 <strong>Astuce :</strong> Pour copier le texte, ouvrez votre annonce Airbnb, 
                sélectionnez tout le contenu (Ctrl+A ou Cmd+A) et collez-le ici.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Import en cours...
              </>
            ) : (
              "Importer"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
