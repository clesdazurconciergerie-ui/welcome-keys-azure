import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignaturePad } from '@/components/inspection/SignaturePad';
import { ClipboardCheck, Camera, X, Loader2, CheckCircle } from 'lucide-react';

interface CreateInspectionDialogProps {
  open: boolean;
  onClose: () => void;
  properties: { id: string; name: string; address: string }[];
  onSave: (values: {
    property_id: string;
    inspection_date: string;
    general_comment: string | null;
    photos: { url: string; file: File; uploaded_at: string }[];
    concierge_signature: string | null;
  }) => Promise<void>;
}

export function CreateInspectionDialog({ open, onClose, properties, onSave }: CreateInspectionDialogProps) {
  const [propertyId, setPropertyId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<{ url: string; file: File; uploaded_at: string }[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { url, file, uploaded_at: new Date().toISOString() }]);
    }
  };

  const handleSubmit = async () => {
    if (!propertyId) return;
    setSaving(true);
    await onSave({
      property_id: propertyId,
      inspection_date: date,
      general_comment: comment || null,
      photos,
      concierge_signature: signature,
    });
    setSaving(false);
    // Reset
    setPropertyId('');
    setComment('');
    setPhotos([]);
    setSignature(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Créer un état des lieux initial
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Property */}
          <div className="space-y-1.5">
            <Label className="text-sm">Logement</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un logement" />
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-sm">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <Label className="text-sm">Commentaire / Observation</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="État général du logement..." rows={3} />
          </div>

          {/* Photos */}
          <div className="space-y-1.5">
            <Label className="text-sm">Photos</Label>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border group">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-primary/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors relative">
                <Camera className="w-5 h-5 text-muted-foreground mb-0.5" />
                <span className="text-[10px] text-muted-foreground">Ajouter</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
            </div>
          </div>

          {/* Signature */}
          <div className="pt-3 border-t">
            <SignaturePad label="Signature concierge" onSignatureChange={setSignature} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving || !propertyId}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              <CheckCircle className="w-4 h-4 mr-1" />
              Créer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
