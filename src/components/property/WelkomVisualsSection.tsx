import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sparkles, Save, Images, Compass, Camera, Info, ExternalLink, Loader2,
} from "lucide-react";
import { useWelkomVisuals } from "@/hooks/useWelkomVisuals";

interface Props {
  propertyId: string;
}

export function WelkomVisualsSection({ propertyId }: Props) {
  const { galleryUrl, tourUrl, isLoading, isSaving, updateGalleryUrl, updateTourUrl } =
    useWelkomVisuals(propertyId);

  const [galleryDraft, setGalleryDraft] = useState("");
  const [tourDraft, setTourDraft] = useState("");

  useEffect(() => { setGalleryDraft(galleryUrl); }, [galleryUrl]);
  useEffect(() => { setTourDraft(tourUrl); }, [tourUrl]);

  const hasAny = Boolean(galleryUrl || tourUrl);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-semibold text-foreground">Welkom Visuals</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Photos HDR & visite virtuelle Nodalview — qualité professionnelle
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-accent/10 text-accent border-accent/30 rounded-full px-3 py-1 text-xs font-medium"
        >
          Powered by Nodalview
        </Badge>
      </div>

      {/* Smart Links */}
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Liens Nodalview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nv-gallery">Lien galerie photos Nodalview</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="nv-gallery"
                type="url"
                placeholder="https://app.nodalview.com/s/..."
                value={galleryDraft}
                onChange={(e) => setGalleryDraft(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => updateGalleryUrl(galleryDraft.trim())}
                disabled={isSaving || isLoading || galleryDraft === galleryUrl}
                className="gap-2 transition-all duration-200"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nv-tour">Lien visite virtuelle 360°</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="nv-tour"
                type="url"
                placeholder="https://app.nodalview.com/v/..."
                value={tourDraft}
                onChange={(e) => setTourDraft(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => updateTourUrl(tourDraft.trim())}
                disabled={isSaving || isLoading || tourDraft === tourUrl}
                className="gap-2 transition-all duration-200"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery preview */}
      {galleryUrl && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Images className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">Photos HDR</h3>
            </div>
            <Button
              onClick={() => window.open(galleryUrl, "_blank")}
              className="gap-2 transition-all duration-200"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir la galerie Nodalview
            </Button>
          </div>
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-border shadow-md bg-muted">
            <iframe
              src={galleryUrl}
              className="w-full h-full"
              allowFullScreen
              title="Galerie Nodalview HDR"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Photos traitées avec la technologie SmartFusion HDR — exposition automatique,
            correction de perspective, balance des blancs optimisée
          </p>
        </section>
      )}

      {/* Virtual tour preview */}
      {tourUrl && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">Visite virtuelle 360°</h3>
            </div>
            <Button
              onClick={() => window.open(tourUrl, "_blank")}
              className="gap-2 transition-all duration-200"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir la visite
            </Button>
          </div>
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-border shadow-md bg-muted">
            <iframe
              src={tourUrl}
              className="w-full h-full"
              allowFullScreen
              title="Visite virtuelle Nodalview 360°"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Panoramas 360° haute résolution — résolution 10K, compatible smartphone et gyroscope
          </p>
        </section>
      )}

      {/* Empty state */}
      {!hasAny && !isLoading && (
        <div className="text-center py-14 border border-dashed border-border rounded-xl">
          <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-foreground mb-1">
            Aucun contenu Nodalview configuré
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Ajoutez les liens de votre galerie HDR ou de votre visite virtuelle pour les afficher ici.
          </p>
          <Button
            variant="outline"
            onClick={() => window.open("https://nodalview.com", "_blank")}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Découvrir Nodalview
          </Button>
        </div>
      )}

      {/* Info */}
      <Alert className="rounded-xl border-border">
        <Info className="h-4 w-4" />
        <AlertTitle>Comment obtenir vos liens Nodalview ?</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
            <li>Photographiez votre bien avec l'app Nodalview (HDR automatique, grand-angle, synchronisation cloud)</li>
            <li>Vos photos sont traitées par SmartFusion : fusion multi-exposition, correction perspective, balance des blancs perceptuelle</li>
            <li>Copiez le Smart Link depuis votre compte Nodalview et collez-le ci-dessus</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}
