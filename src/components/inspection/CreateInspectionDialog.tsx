import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignaturePad } from '@/components/inspection/SignaturePad';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardCheck, Camera, X, Loader2, CheckCircle, Calendar, User, Image } from 'lucide-react';

interface Booking {
  id: string;
  guest_name: string | null;
  check_in: string;
  check_out: string;
  source: string;
}

interface CleaningPhoto {
  url: string;
  type?: string;
  uploaded_at?: string;
  caption?: string | null;
}

interface CreateInspectionDialogProps {
  open: boolean;
  onClose: () => void;
  properties: { id: string; name: string; address: string }[];
  onSave: (values: {
    property_id: string;
    booking_id: string | null;
    guest_name: string | null;
    inspection_date: string;
    general_comment: string | null;
    photos: { url: string; file?: File; uploaded_at: string }[];
    cleaningPhotos: CleaningPhoto[];
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

  // Auto-loaded data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('none');
  const [guestName, setGuestName] = useState('');
  const [cleaningPhotos, setCleaningPhotos] = useState<CleaningPhoto[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // When property changes, fetch bookings + last cleaning photos
  useEffect(() => {
    if (!propertyId) {
      setBookings([]);
      setSelectedBookingId('none');
      setGuestName('');
      setCleaningPhotos([]);
      return;
    }

    fetchBookings(propertyId);
    fetchLastCleaningPhotos(propertyId);
  }, [propertyId]);

  // When booking selection changes, update guest name + date
  useEffect(() => {
    if (selectedBookingId === 'none' || selectedBookingId === 'manual') {
      if (selectedBookingId === 'manual') setGuestName('');
      return;
    }
    const booking = bookings.find(b => b.id === selectedBookingId);
    if (booking) {
      setGuestName(booking.guest_name || '');
      setDate(booking.check_in);
    }
  }, [selectedBookingId, bookings]);

  const fetchBookings = async (propId: string) => {
    setLoadingBookings(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch from bookings table
      const { data: dbBookings } = await (supabase as any)
        .from('bookings')
        .select('id, guest_name, check_in, check_out, source')
        .eq('property_id', propId)
        .gte('check_out', today)
        .neq('price_status', 'canceled')
        .order('check_in', { ascending: true });

      // Fetch from calendar_events (iCal imports)
      const { data: calEvents } = await (supabase as any)
        .from('calendar_events')
        .select('id, guest_name, start_date, end_date, platform, event_type, status')
        .eq('property_id', propId)
        .gte('end_date', today)
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true });

      const allBookings: Booking[] = [];

      // Add DB bookings
      for (const b of (dbBookings || [])) {
        allBookings.push({
          id: b.id,
          guest_name: b.guest_name,
          check_in: b.check_in,
          check_out: b.check_out,
          source: b.source || 'manual',
        });
      }

      // Add calendar events (only real reservations, not blocked dates)
      const dbBookingEventIds = new Set((dbBookings || []).map((b: any) => b.calendar_event_id).filter(Boolean));
      for (const e of (calEvents || [])) {
        // Skip blocked slots and events already linked to a booking
        if (e.event_type === 'blocked' || dbBookingEventIds.has(e.id)) continue;
        allBookings.push({
          id: `cal_${e.id}`,
          guest_name: e.guest_name || e.platform,
          check_in: e.start_date,
          check_out: e.end_date,
          source: e.platform || 'ical',
        });
      }

      // Sort by check_in and deduplicate
      allBookings.sort((a, b) => a.check_in.localeCompare(b.check_in));

      setBookings(allBookings);

      // Auto-select next upcoming booking
      const nextBooking = allBookings.find(b => b.check_in >= today);
      if (nextBooking) {
        setSelectedBookingId(nextBooking.id);
        setGuestName(nextBooking.guest_name || '');
        setDate(nextBooking.check_in);
      } else {
        setSelectedBookingId(allBookings.length > 0 ? allBookings[0].id : 'manual');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchLastCleaningPhotos = async (propId: string) => {
    setLoadingPhotos(true);
    try {
      // Get latest completed cleaning intervention for this property
      const { data: interventions } = await (supabase as any)
        .from('cleaning_interventions')
        .select('id')
        .eq('property_id', propId)
        .in('status', ['completed', 'validated'])
        .order('scheduled_date', { ascending: false })
        .limit(1);

      if (!interventions?.length) {
        setCleaningPhotos([]);
        setLoadingPhotos(false);
        return;
      }

      const interventionId = interventions[0].id;

      // Get photos from cleaning_photos table
      const { data: photos } = await (supabase as any)
        .from('cleaning_photos')
        .select('url, type, uploaded_at, caption')
        .eq('intervention_id', interventionId);

      setCleaningPhotos((photos || []).map((p: any) => ({
        url: p.url,
        type: p.type,
        uploaded_at: p.uploaded_at,
        caption: p.caption,
      })));
    } catch (err) {
      console.error('Error fetching cleaning photos:', err);
      setCleaningPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

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
    const bookingId = selectedBookingId === 'none' || selectedBookingId === 'manual' || selectedBookingId.startsWith('cal_')
      ? null
      : selectedBookingId;

    await onSave({
      property_id: propertyId,
      booking_id: bookingId,
      guest_name: guestName || null,
      inspection_date: date,
      general_comment: comment || null,
      photos,
      cleaningPhotos,
      concierge_signature: signature,
    });
    setSaving(false);
    // Reset
    setPropertyId('');
    setComment('');
    setPhotos([]);
    setSignature(null);
    setGuestName('');
    setSelectedBookingId('none');
    setCleaningPhotos([]);
    onClose();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Créer un état des lieux
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

          {/* Booking selector - only shown when a property is selected */}
          {propertyId && (
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Réservation associée
              </Label>
              {loadingBookings ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Chargement des réservations...
                </div>
              ) : (
                <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une réservation" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        <span className="flex items-center gap-2">
                          <span>{b.guest_name || 'Voyageur'}</span>
                          <span className="text-muted-foreground text-xs">
                            {formatDate(b.check_in)} → {formatDate(b.check_out)}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{b.source}</Badge>
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value="manual">
                      <span className="text-muted-foreground">+ Séjour direct (sans réservation)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {bookings.length === 0 && !loadingBookings && (
                <p className="text-xs text-muted-foreground">Aucune réservation trouvée — vous pouvez créer un séjour direct.</p>
              )}
            </div>
          )}

          {/* Guest name */}
          {propertyId && (
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Nom du voyageur
              </Label>
              <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nom complet" />
            </div>
          )}

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

          {/* Auto-loaded cleaning photos */}
          {propertyId && (
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" />
                Photos du dernier ménage
              </Label>
              {loadingPhotos ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Chargement des photos...
                </div>
              ) : cleaningPhotos.length > 0 ? (
                <div>
                  <Badge variant="secondary" className="mb-2 text-xs">{cleaningPhotos.length} photos récupérées automatiquement</Badge>
                  <div className="grid grid-cols-4 gap-2">
                    {cleaningPhotos.slice(0, 8).map((p, i) => (
                      <img key={i} src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg border" />
                    ))}
                    {cleaningPhotos.length > 8 && (
                      <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center text-sm text-muted-foreground">
                        +{cleaningPhotos.length - 8}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucune photo de ménage trouvée pour ce logement.</p>
              )}
            </div>
          )}

          {/* Additional manual photos */}
          <div className="space-y-1.5">
            <Label className="text-sm">Photos supplémentaires</Label>
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
