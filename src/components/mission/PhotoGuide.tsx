import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePhotoRequirements, useMissionPhotoCompletions } from '@/hooks/usePhotoRequirements';
import { supabase } from '@/integrations/supabase/client';
import { Camera, CheckCircle2, ImageIcon, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

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

  const loading = loadingReqs || loadingComp;

  const completedCount = requirements.filter(r => getPhotosForRequirement(r.id).length > 0).length;
  const totalCount = requirements.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const requiredReqs = requirements.filter(r => r.required);
  const allRequiredDone = requiredReqs.every(r => getPhotosForRequirement(r.id).length > 0);
  const missingRequired = requiredReqs.filter(r => getPhotosForRequirement(r.id).length === 0);

  // Notify parent of progress changes
  if (onProgressChange) {
    onProgressChange(allRequiredDone);
  }

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
      toast.success('Photo ajoutée');
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="w-5 h-5 text-primary" />
            Photos de preuve
          </CardTitle>
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount} / {totalCount}
          </span>
        </div>
        <Progress value={progress} className="mt-2 h-2" />
      </CardHeader>
      <CardContent className="space-y-3">
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
              <div className="p-3 flex items-start gap-3">
                {/* Status icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isDone ? 'bg-emerald-100' : 'bg-muted'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Camera className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${isDone ? 'text-emerald-700' : 'text-foreground'}`}>
                      {req.label}
                    </p>
                    {req.required && !isDone && (
                      <Badge variant="destructive" className="text-[9px] h-4">Obligatoire</Badge>
                    )}
                  </div>
                  {req.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                  )}

                  {/* Photo thumbnails */}
                  {photos.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {photos.map(p => (
                        <div key={p.id} className="w-14 h-14 rounded-lg overflow-hidden border border-border">
                          <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload button */}
                  {!readOnly && (
                    <label className="cursor-pointer inline-block mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(req.id, file);
                          e.target.value = '';
                        }}
                        disabled={isUploading}
                      />
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDone
                          ? 'text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                          : 'text-primary hover:bg-primary/10 border border-primary/20'
                      }`}>
                        {isUploading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isDone ? (
                          <Upload className="w-3 h-3" />
                        ) : (
                          <Camera className="w-3 h-3" />
                        )}
                        {isUploading ? 'Upload…' : isDone ? 'Ajouter' : 'Prendre la photo'}
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Missing items warning */}
        {!readOnly && missingRequired.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <p className="font-medium">⚠️ Photos manquantes :</p>
            <p className="text-xs mt-1">{missingRequired.map(r => r.label).join(', ')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
