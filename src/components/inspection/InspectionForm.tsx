import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SignaturePad } from './SignaturePad';
import { useProperties, type Property } from '@/hooks/useProperties';
import { useBookings, type Booking } from '@/hooks/useBookings';
import { useInspections, type Inspection } from '@/hooks/useInspections';
import { Camera, ClipboardCheck, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface InspectionFormProps {
  type: 'entry' | 'exit';
  existingInspection?: Inspection | null;
  linkedEntryId?: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function InspectionForm({ type, existingInspection, linkedEntryId, onComplete, onCancel }: InspectionFormProps) {
  const { properties } = useProperties();
  const { createInspection, updateInspection, fetchLatestCleaningPhotos, uploadSignature, uploadExitPhoto } = useInspections();
  
  const [propertyId, setPropertyId] = useState(existingInspection?.property_id || '');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingId, setBookingId] = useState(existingInspection?.booking_id || '');
  const [guestName, setGuestName] = useState(existingInspection?.guest_name || '');
  const [inspectionDate, setInspectionDate] = useState(existingInspection?.inspection_date || new Date().toISOString().split('T')[0]);
  const [occupantsCount, setOccupantsCount] = useState(existingInspection?.occupants_count?.toString() || '');
  const [meterElectricity, setMeterElectricity] = useState(existingInspection?.meter_electricity || '');
  const [meterWater, setMeterWater] = useState(existingInspection?.meter_water || '');
  const [meterGas, setMeterGas] = useState(existingInspection?.meter_gas || '');
  const [generalComment, setGeneralComment] = useState(existingInspection?.general_comment || '');
  const [damageNotes, setDamageNotes] = useState(existingInspection?.damage_notes || '');
  const [cleaningPhotos, setCleaningPhotos] = useState<any[]>(existingInspection?.cleaning_photos_json || []);
  const [exitPhotos, setExitPhotos] = useState<any[]>(existingInspection?.exit_photos_json || []);
  const [conciergeSignature, setConciergeSignature] = useState<string | null>(existingInspection?.concierge_signature_url || null);
  const [guestSignature, setGuestSignature] = useState<string | null>(existingInspection?.guest_signature_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [useManualBooking, setUseManualBooking] = useState(false);

  // Fetch bookings when property changes
  const { bookings: propertyBookings, loading: loadingBookings } = useBookings(propertyId || undefined);

  useEffect(() => {
    if (propertyBookings.length > 0) {
      setBookings(propertyBookings);
      // Auto-select next upcoming booking
      if (!existingInspection && !bookingId) {
        const today = new Date().toISOString().split('T')[0];
        const nextBooking = propertyBookings.find(b => b.check_in >= today);
        if (nextBooking) {
          setBookingId(nextBooking.id);
          setGuestName(nextBooking.guest_name || '');
        }
      }
    }
  }, [propertyBookings, existingInspection, bookingId]);

  // Auto-fetch cleaning photos for entry inspection
  useEffect(() => {
    if (type === 'entry' && propertyId && !existingInspection) {
      setLoadingPhotos(true);
      fetchLatestCleaningPhotos(propertyId).then(photos => {
        setCleaningPhotos(photos);
        setLoadingPhotos(false);
      });
    }
  }, [propertyId, type, existingInspection]);

  // Sync guest name from booking selection
  useEffect(() => {
    if (bookingId && !useManualBooking) {
      const b = bookings.find(bk => bk.id === bookingId);
      if (b?.guest_name) setGuestName(b.guest_name);
    }
  }, [bookingId, bookings, useManualBooking]);

  const handleExitPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      if (existingInspection?.id) {
        const url = await uploadExitPhoto(existingInspection.id, file);
        if (url) {
          setExitPhotos(prev => [...prev, { url, uploaded_at: new Date().toISOString() }]);
        }
      } else {
        // For new inspections, create object URL temporarily
        const url = URL.createObjectURL(file);
        setExitPhotos(prev => [...prev, { url, file, uploaded_at: new Date().toISOString() }]);
      }
    }
  };

  const removeExitPhoto = (index: number) => {
    setExitPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (complete: boolean = false) => {
    if (!propertyId) { toast.error('Sélectionnez un bien'); return; }
    
    setIsSaving(true);
    try {
      let conciergeSignUrl = conciergeSignature;
      let guestSignUrl = guestSignature;

      const inspectionData: any = {
        property_id: propertyId,
        booking_id: bookingId || null,
        linked_inspection_id: linkedEntryId || existingInspection?.linked_inspection_id || null,
        inspection_type: type,
        guest_name: guestName || null,
        inspection_date: inspectionDate,
        occupants_count: occupantsCount ? parseInt(occupantsCount) : null,
        meter_electricity: meterElectricity || null,
        meter_water: meterWater || null,
        meter_gas: meterGas || null,
        general_comment: generalComment || null,
        damage_notes: damageNotes || null,
        cleaning_photos_json: cleaningPhotos,
        exit_photos_json: exitPhotos.map(p => ({ url: p.url, uploaded_at: p.uploaded_at })),
        status: complete ? 'completed' : 'draft',
      };

      if (existingInspection) {
        // Upload signatures if they're data URLs
        if (conciergeSignature?.startsWith('data:')) {
          conciergeSignUrl = await uploadSignature(existingInspection.id, conciergeSignature, 'concierge');
        }
        if (guestSignature?.startsWith('data:')) {
          guestSignUrl = await uploadSignature(existingInspection.id, guestSignature, 'guest');
        }
        inspectionData.concierge_signature_url = conciergeSignUrl;
        inspectionData.guest_signature_url = guestSignUrl;

        await updateInspection(existingInspection.id, inspectionData);
      } else {
        const created = await createInspection(inspectionData);
        if (created) {
          // Upload signatures and exit photos with real ID
          if (conciergeSignature?.startsWith('data:')) {
            conciergeSignUrl = await uploadSignature(created.id, conciergeSignature, 'concierge');
          }
          if (guestSignature?.startsWith('data:')) {
            guestSignUrl = await uploadSignature(created.id, guestSignature, 'guest');
          }

          // Upload any pending exit photo files
          const uploadedExitPhotos = [];
          for (const p of exitPhotos) {
            if (p.file) {
              const url = await uploadExitPhoto(created.id, p.file);
              if (url) uploadedExitPhotos.push({ url, uploaded_at: p.uploaded_at });
            } else {
              uploadedExitPhotos.push({ url: p.url, uploaded_at: p.uploaded_at });
            }
          }

          await updateInspection(created.id, {
            concierge_signature_url: conciergeSignUrl,
            guest_signature_url: guestSignUrl,
            exit_photos_json: uploadedExitPhotos,
          } as any);
        }
      }

      onComplete();
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            {type === 'entry' ? "État des lieux d'entrée" : "État des lieux de sortie"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Property */}
          <div className="space-y-2">
            <Label>Bien *</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un bien" />
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Booking */}
          {propertyId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Réservation</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => { setUseManualBooking(!useManualBooking); setBookingId(''); }}
                >
                  {useManualBooking ? 'Choisir une réservation' : 'Séjour direct'}
                </Button>
              </div>
              {!useManualBooking ? (
                <Select value={bookingId} onValueChange={setBookingId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingBookings ? 'Chargement...' : 'Sélectionner une réservation'} />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.guest_name || 'Sans nom'} — {new Date(b.check_in).toLocaleDateString('fr-FR')} → {new Date(b.check_out).toLocaleDateString('fr-FR')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">Séjour direct — pas de réservation liée</p>
              )}
            </div>
          )}

          {/* Guest + date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du client / voyageur</Label>
              <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nom complet" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} />
            </div>
          </div>

          {/* Occupants */}
          <div className="space-y-2">
            <Label>Nombre d'occupants</Label>
            <Input type="number" min="1" value={occupantsCount} onChange={e => setOccupantsCount(e.target.value)} placeholder="Ex: 4" />
          </div>

          {/* Meter readings */}
          {type === 'entry' && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Relevés de compteurs</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Électricité</Label>
                  <Input value={meterElectricity} onChange={e => setMeterElectricity(e.target.value)} placeholder="kWh" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Eau</Label>
                  <Input value={meterWater} onChange={e => setMeterWater(e.target.value)} placeholder="m³" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Gaz (optionnel)</Label>
                  <Input value={meterGas} onChange={e => setMeterGas(e.target.value)} placeholder="m³" />
                </div>
              </div>
            </div>
          )}

          {/* General comment */}
          <div className="space-y-2">
            <Label>Commentaire général / Observation</Label>
            <Textarea value={generalComment} onChange={e => setGeneralComment(e.target.value)} placeholder="État général du logement..." rows={3} />
          </div>

          {/* Damage notes (exit only) */}
          {type === 'exit' && (
            <div className="space-y-2">
              <Label>Dégâts / Problèmes constatés</Label>
              <Textarea value={damageNotes} onChange={e => setDamageNotes(e.target.value)} placeholder="Décrire les éventuels dégâts ou problèmes..." rows={3} />
            </div>
          )}

          {/* Cleaning photos (entry - auto) */}
          {type === 'entry' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Photos ménage (auto-liées)</Label>
              {loadingPhotos ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Récupération des photos...
                </div>
              ) : cleaningPhotos.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {cleaningPhotos.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                  Aucune photo de ménage récente pour ce bien
                </p>
              )}
            </div>
          )}

          {/* Exit photos (exit - manual upload) */}
          {type === 'exit' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Photos de sortie</Label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {exitPhotos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border group">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExitPhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-lg border-2 border-dashed border-primary/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors relative">
                  <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Ajouter</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleExitPhotoUpload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-semibold">Signatures</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SignaturePad
                label="Signature concierge"
                onSignatureChange={setConciergeSignature}
                existingSignature={existingInspection?.concierge_signature_url}
              />
              <SignaturePad
                label="Signature client / voyageur"
                onSignatureChange={setGuestSignature}
                existingSignature={existingInspection?.guest_signature_url}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Annuler</Button>
        <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Enregistrer brouillon
        </Button>
        <Button onClick={() => handleSave(true)} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Finaliser
        </Button>
      </div>
    </div>
  );
}
