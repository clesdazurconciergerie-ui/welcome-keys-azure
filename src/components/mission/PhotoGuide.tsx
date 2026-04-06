import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePhotoRequirements, useMissionPhotoCompletions } from '@/hooks/usePhotoRequirements';
import { supabase } from '@/integrations/supabase/client';
import { Camera, CheckCircle2, ImageIcon, Loader2, Upload, Image } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface PhotoGuideProps {
  missionId: string;
  propertyId: string;
  userId: string;
  providerId: string;
  readOnly?: boolean;
  onProgressChange?: (allRequiredDone: boolean) => void;
}

export function PhotoGuide({ missionId, propertyId, userId, providerId, readOnly = false, onProgressChange }: PhotoGuideProps) {
  const { requirements, loading: loadingReqs } = usePhotoRequirements(propertyId);
  const { completions, addCompletion, getPhotosForRequirement, loading: loadingComp } = useMissionPhotoCompletions(missionId);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [previewPhotos, setPreviewPhotos] = useState<{ urls: string[]; label: string } | null>(null);
  const prevReady = useRef<boolean | null>(null);

  const loading = loadingReqs || loadingComp;

  const completedCount = requirements.filter(r => getPhotosForRequirement(r.id).length > 0).length;
  const totalCount = requirements.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const requiredReqs = requirements.filter(r => r.required);
  const allRequiredDone = requiredReqs.length === 0 || requiredReqs.every(r => getPhotosForRequirement(r.id).length > 0);
  const missingRequired = requiredReqs.filter(r => getPhotosForRequirement(r.id).length === 0);

  // Notify parent only on change
  useEffect(() => {
    if (onProgressChange && prevReady.current !== allRequiredDone) {
      prevReady.current = allRequiredDone;
      onProgressChange(allRequiredDone);
    }
  }, [allRequiredDone, onProgressChange]);

  const handleUpload = async (requirementId: string, file: File) => {
    setUploadingId(requirementId);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${missionId}/${providerId}/${Date.now()}_${requirementId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('mission-photos')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('mission-photos')
        .getPublicUrl(path);

      await addCompletion(requirementId, publicUrl);
      toast.success('Photo ajoutée ✓');
    } catch (err: any) {
      toast.error('Erreur upload: ' + (err.message || 'Erreur'));
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (requirements.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="w-5 h-5 text-primary" />
            Photos de preuve
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ajoutez les photos demandées pour valider la mission.
          </p>
          {/* Progress */}
          <div className="flex items-center gap-3 mt-3">
            <Progress value={progress} className="h-2.5 flex-1" />
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">
              {completedCount} / {totalCount}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          {requirements.map((req) => {
            const photos = getPhotosForRequirement(req.id);
            const isDone = photos.length > 0;
            const isUploading = uploadingId === req.id;

            return (
              <div
                key={req.id}
                className={`rounded-xl border transition-all ${
                  isDone
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-border'
                }`}
              >
                <div className="p-3 sm:p-4 flex items-center gap-3">
                  {/* Status icon — large tap target */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isDone ? 'bg-emerald-100' : 'bg-muted'
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Camera className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${isDone ? 'text-emerald-700' : 'text-foreground'}`}>
                        {req.label}
                      </p>
                      {req.required && !isDone && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1.5">Obligatoire</Badge>
                      )}
                    </div>
                    {req.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{req.description}</p>
                    )}

                    {/* Thumbnail row */}
                    {photos.length > 0 && (
                      <div
                        className="flex gap-1.5 mt-2 cursor-pointer"
                        onClick={() => setPreviewPhotos({ urls: photos.map(p => p.photo_url), label: req.label })}
                      >
                        {photos.slice(0, 3).map(p => (
                          <div key={p.id} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-border">
                            <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {photos.length > 3 && (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border border-border bg-muted flex items-center justify-center">
                            <span className="text-xs font-medium text-muted-foreground">+{photos.length - 3}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Upload action — right side */}
                  {!readOnly && (
                    <div className="shrink-0">
                      {isUploading ? (
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            style={{ position: 'absolute', inset: 0, opacity: 0 }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(req.id, file);
                              e.target.value = '';
                            }}
                            disabled={isUploading}
                          />
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                            isDone
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600'
                              : 'bg-primary/10 hover:bg-primary/20 text-primary'
                          }`}>
                            {isDone ? <Upload className="w-4 h-4" /> : <Camera className="w-5 h-5" />}
                          </div>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Missing items warning */}
          {!readOnly && missingRequired.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <p className="font-medium">⚠️ Photos manquantes :</p>
              <p className="text-xs mt-1">{missingRequired.map(r => r.label).join(', ')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo preview dialog */}
      <Dialog open={!!previewPhotos} onOpenChange={open => { if (!open) setPreviewPhotos(null); }}>
        <DialogContent className="max-w-lg p-4">
          {previewPhotos && (
            <div className="space-y-3">
              <p className="font-semibold text-sm">{previewPhotos.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {previewPhotos.urls.map((url, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
