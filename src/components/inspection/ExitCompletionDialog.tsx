import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SignaturePad } from '@/components/inspection/SignaturePad';
import { Camera, X, Loader2, LogOut, CheckCircle } from 'lucide-react';
import type { Inspection } from '@/hooks/useInspections';

interface ExitCompletionDialogProps {
  inspection: Inspection | null;
  onClose: () => void;
  onSave: (id: string, values: {
    damage_notes: string | null;
    general_comment: string | null;
    exit_photos: { url: string; file?: File; uploaded_at: string }[];
    concierge_signature: string | null;
    guest_signature: string | null;
    finalize: boolean;
  }) => Promise<void>;
}

export function ExitCompletionDialog({ inspection, onClose, onSave }: ExitCompletionDialogProps) {
  const [damageNotes, setDamageNotes] = useState(inspection?.damage_notes || '');
  const [comment, setComment] = useState(inspection?.general_comment || '');
  const [exitPhotos, setExitPhotos] = useState<{ url: string; file?: File; uploaded_at: string }[]>(
    (inspection?.exit_photos_json || []) as any[]
  );
  const [conciergeSignature, setConciergeSignature] = useState<string | null>(null);
  const [guestSignature, setGuestSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!inspection) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      setExitPhotos(prev => [...prev, { url, file, uploaded_at: new Date().toISOString() }]);
    }
  };

  const handleSave = async (finalize: boolean) => {
    setSaving(true);
    await onSave(inspection.id, {
      damage_notes: damageNotes || null,
      general_comment: comment || null,
      exit_photos: exitPhotos,
      concierge_signature: conciergeSignature,
      guest_signature: guestSignature,
      finalize,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={!!inspection} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5" />
            Sortie — {inspection.property?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Entry summary */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <p><span className="font-medium">Voyageur:</span> {inspection.guest_name || '—'}</p>
            <p><span className="font-medium">Arrivée:</span> {new Date(inspection.inspection_date).toLocaleDateString('fr-FR')}</p>
            <p><span className="font-medium">Occupants:</span> {inspection.occupants_count || '—'}</p>
          </div>

          {/* Observations */}
          <div className="space-y-1.5">
            <Label className="text-sm">Observations de sortie</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="État général à la sortie..." rows={2} />
          </div>

          {/* Damage notes */}
          <div className="space-y-1.5">
            <Label className="text-sm text-destructive font-semibold">Anomalies / Dégâts constatés</Label>
            <Textarea value={damageNotes} onChange={e => setDamageNotes(e.target.value)} placeholder="Dégâts, problèmes..." rows={3} className="border-destructive/30" />
          </div>

          {/* Exit photos */}
          <div className="space-y-1.5">
            <Label className="text-sm">Photos de sortie</Label>
            <div className="grid grid-cols-4 gap-2">
              {exitPhotos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border group">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setExitPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-primary/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors relative">
                <Camera className="w-5 h-5 text-muted-foreground mb-0.5" />
                <span className="text-[10px] text-muted-foreground">Photo sortie</span>
                <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoUpload}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
            </div>
          </div>

          {/* Optional exit signatures */}
          <div className="space-y-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">Signatures optionnelles pour la sortie</p>
            <div className="grid grid-cols-2 gap-4">
              <SignaturePad label="Signature concierge" onSignatureChange={setConciergeSignature} existingSignature={inspection.concierge_signature_url} />
              <SignaturePad label="Signature voyageur" onSignatureChange={setGuestSignature} existingSignature={inspection.guest_signature_url} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Enregistrer
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              <CheckCircle className="w-4 h-4 mr-1" />
              Finaliser
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
