import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Sparkles, Upload, Info } from "lucide-react";
import { useWelkomStudio, type PropertyPhotoStudio } from "@/hooks/useWelkomStudio";
import { WelkomStudioUploader } from "./WelkomStudioUploader";
import { WelkomStudioProgress } from "./WelkomStudioProgress";
import { WelkomStudioGallery } from "./WelkomStudioGallery";
import { WelkomStudioEditor } from "./WelkomStudioEditor";
import { WelkomStudioCamera } from "./WelkomStudioCamera";

interface Props {
  propertyId: string;
}

export function WelkomStudioSection({ propertyId }: Props) {
  const {
    photos,
    isProcessing,
    processingProgress,
    processingLabel,
    processBatch,
    processBatchLaplacian,
    uploadSingle,
    deletePhoto,
    updateFilters,
  } = useWelkomStudio(propertyId);

  const [editing, setEditing] = useState<PropertyPhotoStudio | null>(null);

  const handleHDRFiles = (files: File[]) => {
    if (files.length >= 2) {
      // Multi-exposure → pipeline Laplacien complet
      processBatchLaplacian(files);
    } else {
      processBatch(files);
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-accent" />
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Welkom Studio
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Pipeline HDR professionnel — 100% navigateur, qualité Nodalview SmartFusion.
          </p>
        </div>
        <Badge className="bg-accent/10 text-accent border border-accent/30 self-start gap-1.5">
          <Sparkles className="w-3 h-3" />
          SmartFusion HDR
        </Badge>
      </div>

      {/* Tabs Caméra / Importer */}
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="camera" className="gap-1.5">
            <Camera className="w-4 h-4" />
            Caméra Live
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-1.5">
            <Upload className="w-4 h-4" />
            Importer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera" className="mt-4">
          <WelkomStudioCamera
            disabled={isProcessing}
            onCaptured={(blobs) => processBatchLaplacian(blobs)}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <WelkomStudioUploader
            onProcessHDR={handleHDRFiles}
            onUploadSingle={(f) => uploadSingle(f)}
            disabled={isProcessing}
          />
        </TabsContent>
      </Tabs>

      {/* Progress */}
      {isProcessing && (
        <WelkomStudioProgress progress={processingProgress} label={processingLabel} />
      )}

      {/* Gallery */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Galerie ({photos.length})
        </h3>
        <WelkomStudioGallery
          photos={photos}
          onDelete={deletePhoto}
          onEdit={setEditing}
        />
      </div>

      {/* Encart pédagogique */}
      <Alert className="border-accent/30 bg-accent/5">
        <Info className="h-4 w-4 text-accent" />
        <AlertTitle className="text-foreground">Comment fonctionne Welkom Studio ?</AlertTitle>
        <AlertDescription className="text-muted-foreground space-y-1 text-xs leading-relaxed mt-2">
          <p>1. <strong>AEB</strong> — 3 expositions capturées automatiquement (EV-2, EV0, EV+2)</p>
          <p>2. <strong>Fusion Laplacienne 6 niveaux</strong> — sélection pixel par pixel des meilleures zones</p>
          <p>3. <strong>Tone Mapping Reinhard</strong> — rendu naturel sans zones brûlées</p>
          <p>4. <strong>Correction perspective</strong> — lignes verticales redressées</p>
          <p>5. <strong>Débruitage bilatéral</strong> — netteté préservée, bruit éliminé</p>
          <p>6. <strong>Balance des blancs perceptuelle</strong> — couleurs naturelles</p>
          <p>7. <strong>Dehaze</strong> — clarté et profondeur maximales</p>
        </AlertDescription>
      </Alert>

      {/* Editor sheet */}
      <WelkomStudioEditor
        photo={editing}
        onClose={() => setEditing(null)}
        onSave={(id, src, filters) => updateFilters(id, src, filters)}
      />
    </section>
  );
}
