import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { SignaturePad } from '@/components/inspection/SignaturePad';
import { Loader2, CheckCircle, Home, Calendar, User, Key, Camera, Mail, Phone, MapPin, Shield } from 'lucide-react';
import type { Inspection } from '@/hooks/useInspections';
import { useGuests } from '@/hooks/useGuests';
import { z } from 'zod';

interface EntryValidationDialogProps {
  inspection: Inspection | null;
  onClose: () => void;
  onValidate: (id: string, conciergeSignature: string | null, guestSignature: string | null) => Promise<void>;
}

const guestSchema = z.object({
  email: z.string().trim().email('Email invalide').max(255).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  country: z.string().trim().max(100).optional().or(z.literal('')),
});

export function EntryValidationDialog({ inspection, onClose, onValidate }: EntryValidationDialogProps) {
  const { upsertGuest } = useGuests();
  const [conciergeSignature, setConciergeSignature] = useState<string | null>(null);
  const [guestSignature, setGuestSignature] = useState<string | null>(null);
  const [guestAcknowledged, setGuestAcknowledged] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('France');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!inspection) return null;

  const handleValidate = async () => {
    if (!guestSignature) return;

    // Validate guest data
    const result = guestSchema.safeParse({ email, phone, city, country });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(e => { if (e.path[0]) fieldErrors[String(e.path[0])] = e.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      // Save guest data first (non-blocking failure)
      const fullName = inspection.guest_name || '';
      const [first, ...rest] = fullName.split(' ');
      await upsertGuest({
        booking_id: inspection.booking_id,
        property_id: inspection.property_id,
        inspection_id: inspection.id,
        first_name: first || null,
        last_name: rest.join(' ') || null,
        full_name: fullName || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        marketing_consent: marketingConsent,
        source: 'inspection',
      });

      await onValidate(inspection.id, conciergeSignature, guestSignature);
      onClose();
    } catch (err) {
      console.error('Validation failed, keeping dialog open');
    } finally {
      setSaving(false);
    }
  };

  const photoCount = (inspection.cleaning_photos_json?.length || 0) + ((inspection as any).meter_photos_json?.length || 0);

  return (
    <Dialog open={!!inspection} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-1rem)] max-h-[95vh] overflow-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            Valider l'entrée
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
            <div className="flex items-center gap-2"><Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="font-medium truncate">{inspection.property?.name}</span></div>
            <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span>{new Date(inspection.inspection_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
            {inspection.guest_name && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="truncate">{inspection.guest_name}</span></div>}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs">
              {inspection.occupants_count && <span>👥 {inspection.occupants_count} occupants</span>}
              {(inspection as any).keys_handed_over && <span className="flex items-center gap-1"><Key className="w-3 h-3" />{(inspection as any).keys_handed_over} clés</span>}
              {photoCount > 0 && <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{photoCount} photos</span>}
            </div>
          </div>

          {/* Guest data collection */}
          <div className="space-y-3 p-3 border border-primary/20 rounded-lg bg-primary/5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Coordonnées du voyageur</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label htmlFor="g-email" className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" />Email</Label>
                <Input id="g-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemple@mail.com" className="h-9" />
                {errors.email && <p className="text-xs text-destructive mt-0.5">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="g-phone" className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" />Téléphone</Label>
                <Input id="g-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className="h-9" />
              </div>
              <div>
                <Label htmlFor="g-city" className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />Ville</Label>
                <Input id="g-city" autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" className="h-9" />
              </div>
              <div>
                <Label htmlFor="g-country" className="text-xs">Pays</Label>
                <Input id="g-country" autoComplete="country-name" value={country} onChange={e => setCountry(e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2 border-t border-primary/10">
              <Checkbox id="marketing" checked={marketingConsent} onCheckedChange={v => setMarketingConsent(!!v)} className="mt-0.5" />
              <label htmlFor="marketing" className="text-xs cursor-pointer leading-snug flex-1">
                <span className="font-medium flex items-center gap-1"><Shield className="w-3 h-3" />Consentement marketing (RGPD)</span>
                <span className="text-muted-foreground block mt-0.5">J'accepte de recevoir des communications commerciales (offres, recommandations, newsletter).</span>
              </label>
            </div>
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

          {/* Acknowledgement */}
          <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
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

          {/* Actions — sticky on mobile */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 sticky bottom-0 bg-background pb-1">
            <Button variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleValidate} disabled={saving || !guestSignature || !guestAcknowledged} className="w-full sm:w-auto">
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
