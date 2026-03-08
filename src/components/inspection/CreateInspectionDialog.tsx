import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignaturePad } from '@/components/inspection/SignaturePad';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardCheck, Camera, X, Loader2, CheckCircle, Calendar, User, Image, Key, Euro, RefreshCw } from 'lucide-react';

interface Booking {
  id: string;
  guest_name: string | null;
  check_in: string;
  check_out: string;
  source: string;
}

interface CleaningPhoto {
  id?: string;
  url: string;
  type?: string;
  uploaded_at?: string;
  caption?: string | null;
  bufferId?: string; // reference to property_cleaning_buffer.id
}

interface PaymentEntry {
  label: string;
  amount: number;
  paid: boolean;
}

export interface InspectionFormValues {
  property_id: string;
  booking_id: string | null;
  guest_name: string | null;
  inspection_date: string;
  general_comment: string | null;
  occupants_count: number | null;
  keys_handed_over: number | null;
  meter_photos: { url: string; file?: File; uploaded_at: string }[];
  photos: { url: string; file?: File; uploaded_at: string }[];
  cleaningPhotos: CleaningPhoto[];
  bufferPhotoIds: string[]; // IDs to mark as used
  payments: PaymentEntry[];
  concierge_signature: string | null;
  guest_signature: string | null;
}

interface CreateInspectionDialogProps {
  open: boolean;
  onClose: () => void;
  properties: { id: string; name: string; address: string }[];
  onSave: (values: InspectionFormValues) => Promise<void>;
}

const isDev = import.meta.env.DEV;
const log = (...args: any[]) => { if (isDev) console.log('[EdL]', ...args); };

export function CreateInspectionDialog({ open, onClose, properties, onSave }: CreateInspectionDialogProps) {
  const [propertyId, setPropertyId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [comment, setComment] = useState('');
  const [occupants, setOccupants] = useState('');
  const [keysHandedOver, setKeysHandedOver] = useState('');
  const [photos, setPhotos] = useState<{ url: string; file: File; uploaded_at: string }[]>([]);
  const [meterPhotos, setMeterPhotos] = useState<{ url: string; file: File; uploaded_at: string }[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [guestSignature, setGuestSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-loaded data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('manual');
  const [guestName, setGuestName] = useState('');
  const [cleaningPhotos, setCleaningPhotos] = useState<CleaningPhoto[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Payments
  const [cleaningPaid, setCleaningPaid] = useState(false);
  const [cleaningAmount, setCleaningAmount] = useState(0);
  const [linenPaid, setLinenPaid] = useState(false);
  const [linenAmount, setLinenAmount] = useState(0);
  const [extraPaid, setExtraPaid] = useState(false);
  const [extraLabel, setExtraLabel] = useState('');
  const [extraAmount, setExtraAmount] = useState(0);

  // Property settings
  const [propCleaningFee, setPropCleaningFee] = useState(0);
  const [propLinenPrice, setPropLinenPrice] = useState(0);

  // Fetch property financial settings
  const fetchPropertySettings = useCallback(async (propId: string) => {
    try {
      const { data } = await (supabase as any)
        .from('property_financial_settings')
        .select('cleaning_fee, linen_price_per_person')
        .eq('property_id', propId)
        .maybeSingle();
      if (data) {
        const cf = data.cleaning_fee || 0;
        const lp = data.linen_price_per_person || 0;
        setPropCleaningFee(cf);
        setPropLinenPrice(lp);
        setCleaningAmount(cf);
        log('Property settings loaded — cleaning_fee:', cf, 'linen_price:', lp);
      } else {
        setPropCleaningFee(0);
        setPropLinenPrice(0);
        setCleaningAmount(0);
      }
    } catch (err) {
      log('⚠️ property settings fetch error:', err);
    }
  }, []);

  // Fetch bookings for a property
  const fetchBookings = useCallback(async (propId: string) => {
    setLoadingBookings(true);
    setBookings([]);
    setSelectedBookingId('manual');
    try {
      const today = new Date().toISOString().split('T')[0];
      log('Fetching bookings for property:', propId, 'from date:', today);

      const [dbResult, calResult] = await Promise.allSettled([
        (supabase as any)
          .from('bookings')
          .select('id, guest_name, check_in, check_out, source, calendar_event_id')
          .eq('property_id', propId)
          .gte('check_out', today)
          .neq('price_status', 'canceled')
          .order('check_in', { ascending: true }),
        (supabase as any)
          .from('calendar_events')
          .select('id, guest_name, start_date, end_date, platform, event_type, status')
          .eq('property_id', propId)
          .gte('end_date', today)
          .order('start_date', { ascending: true }),
      ]);

      const dbBookings = dbResult.status === 'fulfilled' ? (dbResult.value.data || []) : [];
      const calEvents = calResult.status === 'fulfilled' ? (calResult.value.data || []) : [];
      log('DB bookings:', dbBookings.length, '| Calendar events:', calEvents.length);

      const allBookings: Booking[] = [];
      for (const b of dbBookings) {
        allBookings.push({ id: b.id, guest_name: b.guest_name, check_in: b.check_in, check_out: b.check_out, source: b.source || 'manual' });
      }

      const linkedCalEventIds = new Set(dbBookings.map((b: any) => b.calendar_event_id).filter(Boolean));
      for (const e of calEvents) {
        if (e.event_type === 'blocked' || e.status === 'cancelled' || linkedCalEventIds.has(e.id)) continue;
        const isDuplicate = allBookings.some(b => b.check_in === e.start_date && b.check_out === e.end_date);
        if (isDuplicate) continue;
        allBookings.push({ id: `cal_${e.id}`, guest_name: e.guest_name || e.platform || 'Réservation iCal', check_in: e.start_date, check_out: e.end_date, source: e.platform || 'ical' });
      }

      allBookings.sort((a, b) => a.check_in.localeCompare(b.check_in));
      setBookings(allBookings);
      log('Total merged bookings:', allBookings.length);

      const nextBooking = allBookings.find(b => b.check_in >= today);
      if (nextBooking) {
        log('✅ Auto-selected next booking:', nextBooking.guest_name, nextBooking.check_in);
        setSelectedBookingId(nextBooking.id);
        setGuestName(nextBooking.guest_name || '');
        setDate(nextBooking.check_in);
      } else if (allBookings.length > 0) {
        setSelectedBookingId(allBookings[0].id);
        setGuestName(allBookings[0].guest_name || '');
        setDate(allBookings[0].check_in);
      } else {
        setSelectedBookingId('manual');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setBookings([]);
      setSelectedBookingId('manual');
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // Fetch cleaning photos from buffer (not yet used)
  const fetchBufferPhotos = useCallback(async (propId: string) => {
    setLoadingPhotos(true);
    setCleaningPhotos([]);
    try {
      log('Fetching buffer photos for property:', propId);
      
      // First check buffer for unused photos
      const { data: bufferPhotos } = await (supabase as any)
        .from('property_cleaning_buffer')
        .select('id, photo_url, cleaning_intervention_id, created_at')
        .eq('property_id', propId)
        .eq('used_in_inspection', false)
        .order('created_at', { ascending: false });

      if (bufferPhotos?.length) {
        log('✅ Found', bufferPhotos.length, 'photos in buffer');
        const photos: CleaningPhoto[] = bufferPhotos.map((p: any) => ({
          bufferId: p.id,
          url: p.photo_url,
          uploaded_at: p.created_at,
          type: 'buffer',
        }));
        setCleaningPhotos(photos);
        return;
      }

      // Fallback: fetch directly from cleaning_photos / mission_photos for legacy data
      log('No buffer photos, checking legacy cleaning_photos...');
      const { data: interventions } = await (supabase as any)
        .from('cleaning_interventions')
        .select('id, scheduled_date, status')
        .eq('property_id', propId)
        .in('status', ['completed', 'validated'])
        .order('scheduled_date', { ascending: false })
        .limit(1);

      if (!interventions?.length) { log('No completed cleaning found'); setLoadingPhotos(false); return; }

      const intervention = interventions[0];
      log('✅ Found cleaning intervention:', intervention.id);

      const { data: cpPhotos } = await (supabase as any)
        .from('cleaning_photos')
        .select('id, url, type, uploaded_at, caption')
        .eq('intervention_id', intervention.id);

      const resultPhotos: CleaningPhoto[] = (cpPhotos || []).map((p: any) => ({ 
        id: p.id, url: p.url, type: p.type, uploaded_at: p.uploaded_at, caption: p.caption 
      }));

      if (resultPhotos.length === 0) {
        const { data: mPhotos } = await (supabase as any)
          .from('mission_photos')
          .select('id, url, kind, created_at')
          .eq('mission_id', intervention.id);
        if (mPhotos?.length) {
          for (const mp of mPhotos) {
            resultPhotos.push({ id: mp.id, url: mp.url, type: mp.kind || 'after', uploaded_at: mp.created_at });
          }
        }
      }

      log('Total legacy cleaning photos attached:', resultPhotos.length);
      setCleaningPhotos(resultPhotos);
    } catch (err) {
      console.error('Error fetching cleaning photos:', err);
      setCleaningPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  // Sync button handler
  const handleSync = useCallback(() => {
    if (!propertyId) return;
    log('🔄 Sync triggered for property:', propertyId);
    fetchBookings(propertyId);
    fetchBufferPhotos(propertyId);
  }, [propertyId, fetchBookings, fetchBufferPhotos]);

  // When property changes
  useEffect(() => {
    if (!propertyId) {
      setBookings([]); setSelectedBookingId('manual'); setGuestName(''); setCleaningPhotos([]);
      setPropCleaningFee(0); setPropLinenPrice(0); setCleaningAmount(0); setLinenAmount(0);
      return;
    }
    log('Property selected:', propertyId);
    fetchBookings(propertyId);
    fetchBufferPhotos(propertyId);
    fetchPropertySettings(propertyId);
  }, [propertyId, fetchBookings, fetchBufferPhotos, fetchPropertySettings]);

  // When booking selection changes
  useEffect(() => {
    if (selectedBookingId === 'manual') return;
    const booking = bookings.find(b => b.id === selectedBookingId);
    if (booking) {
      setGuestName(booking.guest_name || '');
      setDate(booking.check_in);
    }
  }, [selectedBookingId, bookings]);

  // Auto-calculate linen total when occupants change
  useEffect(() => {
    const count = parseInt(occupants) || 0;
    if (propLinenPrice > 0 && count > 0) {
      setLinenAmount(count * propLinenPrice);
    }
  }, [occupants, propLinenPrice]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<{ url: string; file: File; uploaded_at: string }[]>>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      setter(prev => [...prev, { url, file, uploaded_at: new Date().toISOString() }]);
    }
  };

  const handleSubmit = async () => {
    if (!propertyId) return;
    setSaving(true);
    const bookingId = selectedBookingId === 'manual' || selectedBookingId.startsWith('cal_') ? null : selectedBookingId;

    const payments: PaymentEntry[] = [];
    if (cleaningPaid) payments.push({ label: 'Ménage', amount: cleaningAmount, paid: true });
    if (linenPaid) payments.push({ label: 'Draps', amount: linenAmount, paid: true });
    if (extraPaid && extraLabel) payments.push({ label: extraLabel, amount: extraAmount, paid: true });

    await onSave({
      property_id: propertyId,
      booking_id: bookingId,
      guest_name: guestName || null,
      inspection_date: date,
      general_comment: comment || null,
      occupants_count: occupants ? parseInt(occupants) : null,
      keys_handed_over: keysHandedOver ? parseInt(keysHandedOver) : null,
      meter_photos: meterPhotos,
      photos,
      cleaningPhotos,
      payments,
      concierge_signature: signature,
      guest_signature: guestSignature,
    });
    setSaving(false);
    // Reset
    setPropertyId(''); setComment(''); setPhotos([]); setMeterPhotos([]);
    setSignature(null); setGuestSignature(null); setGuestName('');
    setSelectedBookingId('manual'); setCleaningPhotos([]);
    setOccupants(''); setKeysHandedOver('');
    setCleaningPaid(false); setLinenPaid(false); setExtraPaid(false);
    setExtraLabel(''); setExtraAmount(0);
    onClose();
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            État des lieux d'entrée
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Property */}
          <div className="space-y-1.5">
            <Label className="text-sm">Logement</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un logement" /></SelectTrigger>
              <SelectContent>
                {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Booking selector */}
          {propertyId && (
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Réservation associée</Label>
              {loadingBookings ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Chargement...</div>
              ) : (
                <>
                  <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {bookings.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          <span className="flex items-center gap-2">
                            <span>{b.guest_name || 'Voyageur'}</span>
                            <span className="text-muted-foreground text-xs">{formatDate(b.check_in)} → {formatDate(b.check_out)}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">{b.source}</Badge>
                          </span>
                        </SelectItem>
                      ))}
                      <SelectItem value="manual"><span className="text-muted-foreground">+ Séjour direct</span></SelectItem>
                    </SelectContent>
                  </Select>
                  {bookings.length === 0 && <p className="text-xs text-muted-foreground">Aucune réservation — séjour direct.</p>}
                </>
              )}
            </div>
          )}

          {/* Guest name + Date */}
          {propertyId && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Voyageur</Label>
                <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nom" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* Occupants + Keys */}
          {propertyId && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre d'occupants</Label>
                <Input type="number" min="1" value={occupants} onChange={e => setOccupants(e.target.value)} placeholder="Ex: 4" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5"><Key className="w-3.5 h-3.5" />Clés remises</Label>
                <Input type="number" min="0" value={keysHandedOver} onChange={e => setKeysHandedOver(e.target.value)} placeholder="Ex: 2" />
              </div>
            </div>
          )}

          {/* Meter photos */}
          {propertyId && (
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" />Photos des compteurs</Label>
              <div className="grid grid-cols-4 gap-2">
                {meterPhotos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border group">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setMeterPhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-lg border-2 border-dashed border-primary/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors relative">
                  <Camera className="w-5 h-5 text-muted-foreground mb-0.5" />
                  <span className="text-[10px] text-muted-foreground">Compteur</span>
                  <input type="file" accept="image/*" capture="environment" multiple onChange={e => handlePhotoUpload(e, setMeterPhotos)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </label>
              </div>
            </div>
          )}

          {/* Payments section */}
          {propertyId && (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Euro className="w-3.5 h-3.5" />Règlements voyageur</Label>
              
              {/* Cleaning */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Switch checked={cleaningPaid} onCheckedChange={setCleaningPaid} />
                  <span className="text-sm">Ménage réglé</span>
                </div>
                {cleaningPaid && (
                  <Input type="number" step="0.01" value={cleaningAmount} onChange={e => setCleaningAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 h-8 text-sm" />
                )}
              </div>

              {/* Linen */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Switch checked={linenPaid} onCheckedChange={setLinenPaid} />
                  <span className="text-sm">Draps réglés</span>
                  {propLinenPrice > 0 && occupants && (
                    <span className="text-xs text-muted-foreground">({occupants} × {propLinenPrice}€)</span>
                  )}
                </div>
                {linenPaid && (
                  <Input type="number" step="0.01" value={linenAmount} onChange={e => setLinenAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 h-8 text-sm" />
                )}
              </div>

              {/* Extra */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch checked={extraPaid} onCheckedChange={setExtraPaid} />
                  <span className="text-sm">Autre règlement</span>
                </div>
                {extraPaid && (
                  <div className="flex gap-2">
                    <Input value={extraLabel} onChange={e => setExtraLabel(e.target.value)} placeholder="Libellé" className="h-8 text-sm flex-1" />
                    <Input type="number" step="0.01" value={extraAmount} onChange={e => setExtraAmount(parseFloat(e.target.value) || 0)}
                      className="w-24 h-8 text-sm" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comment */}
          {propertyId && (
            <div className="space-y-1.5">
              <Label className="text-sm">Observation</Label>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="État général..." rows={2} />
            </div>
          )}

          {/* Auto-loaded cleaning photos */}
          {propertyId && (
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5"><Image className="w-3.5 h-3.5" />Photos du dernier ménage</Label>
              {loadingPhotos ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Chargement...</div>
              ) : cleaningPhotos.length > 0 ? (
                <div>
                  <Badge variant="secondary" className="mb-2 text-xs">{cleaningPhotos.length} photos récupérées</Badge>
                  <div className="grid grid-cols-4 gap-2">
                    {cleaningPhotos.slice(0, 8).map((p, i) => (
                      <img key={i} src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg border" />
                    ))}
                    {cleaningPhotos.length > 8 && (
                      <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center text-sm text-muted-foreground">+{cleaningPhotos.length - 8}</div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucune photo de ménage trouvée.</p>
              )}
            </div>
          )}

          {/* Additional photos */}
          {propertyId && (
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
                  <input type="file" accept="image/*" capture="environment" multiple onChange={e => handlePhotoUpload(e, setPhotos)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </label>
              </div>
            </div>
          )}

          {/* Signatures */}
          {propertyId && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              <SignaturePad label="Signature concierge" onSignatureChange={setSignature} />
              <SignaturePad label="Signature voyageur" onSignatureChange={setGuestSignature} />
            </div>
          )}

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
