import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Camera, Sparkles } from "lucide-react";
import { useWelkomStudio, type PropertyPhotoStudio } from "@/hooks/useWelkomStudio";
import { WelkomStudioUploader } from "./WelkomStudioUploader";
import { WelkomStudioProgress } from "./WelkomStudioProgress";
import { WelkomStudioGallery } from "./WelkomStudioGallery";
import { WelkomStudioEditor } from "./WelkomStudioEditor";

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
    uploadSingle,
    deletePhoto,
    updateFilters,
  } = useWelkomStudio(propertyId);

  const [editing, setEditing] = useState<PropertyPhotoStudio | null>(null);

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
            Photos HDR & retouche premium — pipeline réalisé entièrement dans votre navigateur.
          </p>
        </div>
        <Badge className="bg-accent/10 text-accent border border-accent/30 self-start gap-1.5">
          <Sparkles className="w-3 h-3" />
          SmartFusion HDR
        </Badge>
      </div>

      {/* Uploader */}
      <WelkomStudioUploader
        onProcessHDR={(files) => processBatch(files)}
        onUploadSingle={(f) => uploadSingle(f)}
        disabled={isProcessing}
      />

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

      {/* Editor sheet */}
      <WelkomStudioEditor
        photo={editing}
        onClose={() => setEditing(null)}
        onSave={(id, src, filters) => updateFilters(id, src, filters)}
      />
    </section>
  );
}
