import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SignaturePad } from '@/components/inspection/SignaturePad';
import { Loader2, CheckCircle, Home, Calendar, User, Key, Camera } from 'lucide-react';
import type { Inspection } from '@/hooks/useInspections';

interface EntryValidationDialogProps {
  inspection: Inspection | null;
  onClose: () => void;
  onValidate: (id: string, conciergeSignature: string | null, guestSignature: string | null) => Promise<void>;
}

export function EntryValidationDialog({ inspection, onClose, onValidate }: EntryValidationDialogProps) {
  const [conciergeSignature, setConciergeSignature] = useState<string | null>(null);
  const [guestSignature, setGuestSignature] = useState<string | null>(null);
  const [guestAcknowledged, setGuestAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!inspection) return null;

  const handleValidate = async () => {
    if (!guestSignature) return;
    setSaving(true);
    try {
      await onValidate(inspection.id, conciergeSignature, guestSignature);
      onClose();
    } catch (err) {
      // Don't close on error — let user retry
      console.error('Validation failed, keeping dialog open');
    } finally {
      setSaving(false);
    }
  };

  const photoCount = (inspection.cleaning_photos_json?.length || 0) + ((inspection as any).meter_photos_json?.length || 0);

  return (
    <Dialog open={!!inspection} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Valider l'entrée
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
            <div className="flex items-center gap-2"><Home className="w-3.5 h-3.5 text-muted-foreground" /><span className="font-medium">{inspection.property?.name}</span></div>
            <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /><span>{new Date(inspection.inspection_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
            {inspection.guest_name && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" /><span>{inspection.guest_name}</span></div>}
            <div className="flex items-center gap-4">
              {inspection.occupants_count && <span>👥 {inspection.occupants_count} occupants</span>}
              {(inspection as any).keys_handed_over && <span className="flex items-center gap-1"><Key className="w-3 h-3" />{(inspection as any).keys_handed_over} clés</span>}
              {photoCount > 0 && <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{photoCount} photos</span>}
            </div>
            {inspection.general_comment && <p className="text-muted-foreground italic">"{inspection.general_comment}"</p>}
          </div>

          {/* Photos preview */}
          {inspection.cleaning_photos_json?.length > 0 && (
            <div>
              <Label className="text-sm mb-2 block">Photos de référence</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {inspection.cleaning_photos_json.slice(0, 5).map((p: any, i: number) => (
                  <img key={i} src={p.url} alt="" className="w-full aspect-square object-cover rounded border" />
                ))}
              </div>
            </div>
          )}

          {/* Guest acknowledgement */}
          <div className="flex items-start gap-3 p-3 border rounded-lg bg-primary/5">
            <Checkbox id="guest-ack" checked={guestAcknowledged} onCheckedChange={(v) => setGuestAcknowledged(!!v)} className="mt-0.5" />
            <label htmlFor="guest-ack" className="text-sm cursor-pointer leading-tight">
              Le voyageur reconnaît l'état du logement tel que présenté et confirme la remise des clés.
            </label>
          </div>

          {/* Signatures */}
          <div className="space-y-4 pt-2 border-t">
            <SignaturePad label="Signature concierge" onSignatureChange={setConciergeSignature} existingSignature={inspection.concierge_signature_url} />
            <SignaturePad label="Signature voyageur" onSignatureChange={setGuestSignature} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
            <Button onClick={handleValidate} disabled={saving || !guestSignature || !guestAcknowledged}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              <CheckCircle className="w-4 h-4 mr-1" />
              Valider l'entrée
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
