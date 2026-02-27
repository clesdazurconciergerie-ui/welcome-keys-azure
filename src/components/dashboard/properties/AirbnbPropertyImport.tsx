import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Link2, FileText, ArrowRight, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PropertyFormData } from "@/hooks/useProperties";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: PropertyFormData) => Promise<any>;
}

export function AirbnbPropertyImport({ open, onOpenChange, onImport }: Props) {
  const [url, setUrl] = useState("");
  const [fallbackText, setFallbackText] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<string>("url");

  const handleImport = async () => {
    if (tab === "url" && !url.includes("airbnb.")) {
      toast.error("Veuillez entrer une URL Airbnb valide");
      return;
    }
    if (tab === "text" && fallbackText.trim().length < 50) {
      toast.error("Veuillez coller au moins 50 caractères de l'annonce");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Import data from Airbnb (without photos yet)
      const body = tab === "url"
        ? { url, mode: "scrape" }
        : { fallbackText, mode: "fallback" };

      const { data, error } = await supabase.functions.invoke("import-airbnb", { body });

      if (error) throw error;
      if (!data?.success && data?.error === "blocked") {
        toast.info("Airbnb bloque l'accès automatique. Utilisez le mode Texte.");
        setTab("text");
        setLoading(false);
        return;
      }
      if (!data?.success) throw new Error(data?.error || "Échec de l'import");

      const d = data.data;
      const photoUrls: string[] = d.photos || [];

      // Step 2: Create the property
      const formData: PropertyFormData = {
        name: d.title || "Import Airbnb",
        address: d.addressApprox || d.city || "",
        city: d.city || "",
        capacity: d.maxGuests || null,
        bedrooms: d.beds || null,
        bathrooms: d.bathrooms || null,
        property_type: "apartment",
        notes: d.description?.slice(0, 1000) || "",
      };

      const result = await onImport(formData);
      if (!result) {
        setLoading(false);
        return;
      }

      // Step 3: Download & store photos for the new property
      if (photoUrls.length > 0 && result.id) {
        toast.info(`Import des ${photoUrls.length} photos Airbnb...`);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.functions.invoke("import-airbnb", {
            body: {
              mode: "photos-only",
              propertyId: result.id,
              userId: user.id,
              photoUrls,
            },
          });
          toast.success(`${photoUrls.length} photos importées !`);
        }
      }

      toast.success("Bien importé depuis Airbnb !");
      setUrl("");
      setFallbackText("");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Airbnb import error:", err);
      toast.error(err.message || "Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">Importer depuis Airbnb</span>
          </DialogTitle>
          <DialogDescription>
            Importez automatiquement les informations et photos d'une annonce Airbnb.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> URL
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Texte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label>URL de l'annonce Airbnb</Label>
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.airbnb.fr/rooms/123456"
                type="url"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              Les photos de l'annonce seront automatiquement importées.
            </div>
            <p className="text-xs text-muted-foreground">
              Si l'import automatique échoue, passez en mode "Texte".
            </p>
          </TabsContent>

          <TabsContent value="text" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label>Texte de l'annonce</Label>
              <Textarea
                value={fallbackText}
                onChange={e => setFallbackText(e.target.value)}
                placeholder="Copiez-collez le texte complet de l'annonce Airbnb ici..."
                rows={8}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Allez sur l'annonce Airbnb, sélectionnez tout le texte (Ctrl+A) et collez-le ici.
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={handleImport}
            disabled={loading}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
            Importer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
