import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useInspections, type Inspection } from '@/hooks/useInspections';
import { useCleaningInterventions } from '@/hooks/useCleaningInterventions';
import { useProperties } from '@/hooks/useProperties';
import { InspectionPdfGenerator } from '@/components/inspection/InspectionPdfGenerator';
import { SignaturePad } from '@/components/inspection/SignaturePad';
import { CreateInspectionDialog } from '@/components/inspection/CreateInspectionDialog';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, Home, Calendar, User, Eye, Edit, Trash2,
  Camera, CheckCircle, Clock, Sparkles, X, Loader2, Plus
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function InspectionsPage() {
  const { inspections, isLoading, deleteInspection, updateInspection, createInspection, createFromCleaning, uploadSignature, uploadExitPhoto, refetch } = useInspections();
  const { interventions } = useCleaningInterventions('concierge');
  const { properties } = useProperties();
  const [viewInspection, setViewInspection] = useState<Inspection | null>(null);
  const [editInspection, setEditInspection] = useState<Inspection | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Completed/validated interventions that don't yet have an inspection
  const existingInterventionIds = new Set(inspections.map(i => i.cleaning_intervention_id).filter(Boolean));
  const completedCleanings = interventions.filter(
    i => ['completed', 'validated'].includes(i.status) && !existingInterventionIds.has(i.id) && i.photos && i.photos.length > 0
  );

  // Properties that have NO inspection at all yet
  const propertiesWithInspection = new Set(inspections.map(i => i.property_id));
  const propertiesWithoutInspection = properties.filter(p => !propertiesWithInspection.has(p.id));

  const handleAutoCreate = async (intervention: any) => {
    await createFromCleaning({
      id: intervention.id,
      property_id: intervention.property_id,
      scheduled_date: intervention.scheduled_date,
      service_provider: intervention.service_provider,
      photos: intervention.photos,
    });
  };

  const handleManualCreate = async (values: {
    property_id: string;
    booking_id: string | null;
    guest_name: string | null;
    inspection_date: string;
    general_comment: string | null;
    photos: { url: string; file?: File; uploaded_at: string }[];
    cleaningPhotos: { url: string; type?: string; uploaded_at?: string; caption?: string | null }[];
    concierge_signature: string | null;
  }) => {
    // Create inspection first
    const result = await createInspection({
      property_id: values.property_id,
      booking_id: values.booking_id,
      guest_name: values.guest_name,
      inspection_date: values.inspection_date,
      general_comment: values.general_comment,
      inspection_type: 'entry',
      status: 'draft',
      cleaning_photos_json: values.cleaningPhotos,
    });
    if (!result) return;

    // Upload additional manual photos
    const additionalPhotoUrls: any[] = [];
    for (const p of values.photos) {
      if (p.file) {
        const url = await uploadExitPhoto(result.id, p.file);
        if (url) additionalPhotoUrls.push({ url, uploaded_at: p.uploaded_at });
      }
    }

    // Upload signature
    let sigUrl = values.concierge_signature;
    if (sigUrl?.startsWith('data:')) {
      sigUrl = await uploadSignature(result.id, sigUrl, 'concierge');
    }

    // Merge cleaning photos with additional uploaded photos
    const allPhotos = [...values.cleaningPhotos, ...additionalPhotoUrls];

    // Update with merged photos and signature
    await updateInspection(result.id, {
      cleaning_photos_json: allPhotos,
      concierge_signature_url: sigUrl,
    } as any);
  };

  const statusLabel = (s: string) => {
    if (s === 'completed') return 'Finalisé';
    if (s === 'pending') return 'En attente';
    return 'Brouillon';
  };

  const statusVariant = (s: string): 'default' | 'secondary' | 'outline' => {
    if (s === 'completed') return 'default';
    if (s === 'pending') return 'outline';
    return 'secondary';
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">État des lieux</h1>
          <p className="text-muted-foreground mt-1">
            {inspections.length > 0
              ? 'Créés automatiquement à chaque ménage validé'
              : 'Créez votre premier état des lieux pour démarrer'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          Créer un état des lieux
        </Button>
      </motion.div>

      {/* First-time setup: properties without any inspection */}
      {!isLoading && propertiesWithoutInspection.length > 0 && inspections.length === 0 && completedCleanings.length === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 text-center">
            <ClipboardCheck className="w-10 h-10 mx-auto text-primary mb-3" />
            <h3 className="text-lg font-semibold mb-1">Aucun état des lieux</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
              Créez un premier état des lieux initial pour vos logements. Ensuite, le système créera automatiquement les suivants à partir des ménages validés.
            </p>
            <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2">
              <Plus className="w-4 h-4" />
              Créer le premier état des lieux
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Properties without inspection (when some inspections exist already) */}
      {!isLoading && propertiesWithoutInspection.length > 0 && inspections.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-sm">Logements sans état des lieux initial</span>
              <Badge variant="secondary" className="text-xs">{propertiesWithoutInspection.length}</Badge>
            </div>
            <div className="space-y-2">
              {propertiesWithoutInspection.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between bg-background rounded-lg p-3 border">
                  <div className="flex items-center gap-3 text-sm">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Créer l'état initial
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending auto-creation from completed cleanings */}
      {completedCleanings.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Ménages terminés sans état des lieux</span>
              <Badge variant="secondary" className="text-xs">{completedCleanings.length}</Badge>
            </div>
            <div className="space-y-2">
              {completedCleanings.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between bg-background rounded-lg p-3 border">
                  <div className="flex items-center gap-3 text-sm">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{c.property?.name || 'Bien'}</span>
                    <span className="text-muted-foreground">{new Date(c.scheduled_date).toLocaleDateString('fr-FR')}</span>
                    {c.photos && <Badge variant="outline" className="text-xs gap-1"><Camera className="w-3 h-3" />{c.photos.length}</Badge>}
                  </div>
                  <Button size="sm" onClick={() => handleAutoCreate(c)} className="gap-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Créer l'état des lieux
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : inspections.length > 0 && (
        <div className="space-y-3">
          {inspections.map((insp, idx) => (
            <motion.div key={insp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Home className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold truncate">{insp.property?.name || 'Bien'}</span>
                        <Badge variant={statusVariant(insp.status)} className="shrink-0">{statusLabel(insp.status)}</Badge>
                        {insp.inspection_type === 'entry' && <Badge variant="outline" className="text-xs">Entrée</Badge>}
                        {insp.damage_notes && <Badge variant="destructive" className="text-xs">Sortie faite</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(insp.inspection_date).toLocaleDateString('fr-FR')}
                        </span>
                        {insp.guest_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {insp.guest_name}
                          </span>
                        )}
                        {insp.cleaner_name && (
                          <span className="text-xs">🧹 {insp.cleaner_name}</span>
                        )}
                        {insp.cleaning_photos_json?.length > 0 && (
                          <span className="flex items-center gap-1 text-xs">
                            <Camera className="w-3 h-3" />{insp.cleaning_photos_json.length} photos
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {insp.status === 'completed' && <InspectionPdfGenerator inspection={insp} />}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewInspection(insp)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditInspection(insp)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(insp.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Manual create dialog */}
      <CreateInspectionDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        properties={properties.map(p => ({ id: p.id, name: p.name, address: p.address }))}
        onSave={handleManualCreate}
      />

      {/* Edit sheet */}
      {editInspection && (
        <InspectionEditDialog
          inspection={editInspection}
          onClose={() => { setEditInspection(null); refetch(); }}
          onSave={async (id, values) => {
            let conciergeUrl = values.concierge_signature_url;
            let guestUrl = values.guest_signature_url;
            if (conciergeUrl?.startsWith('data:')) {
              conciergeUrl = await uploadSignature(id, conciergeUrl, 'concierge');
            }
            if (guestUrl?.startsWith('data:')) {
              guestUrl = await uploadSignature(id, guestUrl, 'guest');
            }

            const exitPhotos = [];
            for (const p of (values.exit_photos_json || [])) {
              if (p.file) {
                const url = await uploadExitPhoto(id, p.file);
                if (url) exitPhotos.push({ url, uploaded_at: p.uploaded_at });
              } else {
                exitPhotos.push(p);
              }
            }

            await updateInspection(id, {
              ...values,
              concierge_signature_url: conciergeUrl,
              guest_signature_url: guestUrl,
              exit_photos_json: exitPhotos,
            } as any);
          }}
        />
      )}

      {/* View dialog */}
      <InspectionViewDialog inspection={viewInspection} onClose={() => setViewInspection(null)} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet état des lieux ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteInspection(deleteId); setDeleteId(null); } }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────
function InspectionEditDialog({ inspection, onClose, onSave }: {
  inspection: Inspection;
  onClose: () => void;
  onSave: (id: string, values: any) => Promise<void>;
}) {
  const [guestName, setGuestName] = useState(inspection.guest_name || '');
  const [occupants, setOccupants] = useState(inspection.occupants_count?.toString() || '');
  const [meterElec, setMeterElec] = useState(inspection.meter_electricity || '');
  const [meterWater, setMeterWater] = useState(inspection.meter_water || '');
  const [meterGas, setMeterGas] = useState(inspection.meter_gas || '');
  const [comment, setComment] = useState(inspection.general_comment || '');
  const [damageNotes, setDamageNotes] = useState(inspection.damage_notes || '');
  const [exitPhotos, setExitPhotos] = useState<any[]>(inspection.exit_photos_json || []);
  const [conciergeSignature, setConciergeSignature] = useState<string | null>(inspection.concierge_signature_url || null);
  const [guestSignature, setGuestSignature] = useState<string | null>(inspection.guest_signature_url || null);
  const [saving, setSaving] = useState(false);

  const handleExitPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      setExitPhotos(prev => [...prev, { url, file, uploaded_at: new Date().toISOString() }]);
    }
  };

  const handleSave = async (complete: boolean) => {
    setSaving(true);
    await onSave(inspection.id, {
      guest_name: guestName || null,
      occupants_count: occupants ? parseInt(occupants) : null,
      meter_electricity: meterElec || null,
      meter_water: meterWater || null,
      meter_gas: meterGas || null,
      general_comment: comment || null,
      damage_notes: damageNotes || null,
      exit_photos_json: exitPhotos,
      concierge_signature_url: conciergeSignature,
      guest_signature_url: guestSignature,
      status: complete ? 'completed' : inspection.status === 'pending' ? 'draft' : inspection.status,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Compléter l'état des lieux — {inspection.property?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {inspection.cleaning_photos_json?.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">Photos ménage ({inspection.cleaning_photos_json.length})</Label>
              <div className="grid grid-cols-4 gap-2">
                {inspection.cleaning_photos_json.slice(0, 8).map((p: any, i: number) => (
                  <img key={i} src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg border" />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Nom du voyageur</Label>
              <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nom complet" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Occupants</Label>
              <Input type="number" min="1" value={occupants} onChange={e => setOccupants(e.target.value)} placeholder="4" />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">Compteurs (optionnel)</Label>
            <div className="grid grid-cols-3 gap-3">
              <Input value={meterElec} onChange={e => setMeterElec(e.target.value)} placeholder="Élec (kWh)" />
              <Input value={meterWater} onChange={e => setMeterWater(e.target.value)} placeholder="Eau (m³)" />
              <Input value={meterGas} onChange={e => setMeterGas(e.target.value)} placeholder="Gaz (m³)" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Commentaire / Observation</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="État général..." rows={2} />
          </div>

          <div className="space-y-3 pt-3 border-t">
            <Label className="text-sm font-semibold">Sortie / Dégâts (à remplir au départ)</Label>
            <Textarea value={damageNotes} onChange={e => setDamageNotes(e.target.value)} placeholder="Notes de dégâts ou problèmes constatés..." rows={2} />
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
                <input type="file" accept="image/*" multiple onChange={handleExitPhotoUpload}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <SignaturePad label="Signature concierge" onSignatureChange={setConciergeSignature} existingSignature={inspection.concierge_signature_url} />
            <SignaturePad label="Signature voyageur" onSignatureChange={setGuestSignature} existingSignature={inspection.guest_signature_url} />
          </div>

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

// ─── View Dialog ──────────────────────────────────────────
function InspectionViewDialog({ inspection, onClose }: { inspection: Inspection | null; onClose: () => void }) {
  if (!inspection) return null;

  const allPhotos = [
    ...(inspection.cleaning_photos_json || []).map((p: any) => ({ ...p, label: 'Ménage' })),
    ...(inspection.exit_photos_json || []).map((p: any) => ({ ...p, label: 'Sortie' })),
  ];

  return (
    <Dialog open={!!inspection} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>État des lieux — {inspection.property?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="font-medium">Date:</span> {new Date(inspection.inspection_date).toLocaleDateString('fr-FR')}</div>
            <div><span className="font-medium">Client:</span> {inspection.guest_name || '—'}</div>
            <div><span className="font-medium">Occupants:</span> {inspection.occupants_count || '—'}</div>
            <div><span className="font-medium">Ménage par:</span> {inspection.cleaner_name || '—'}</div>
          </div>

          {(inspection.meter_electricity || inspection.meter_water || inspection.meter_gas) && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
              <div><span className="font-medium">Élec:</span> {inspection.meter_electricity || '—'}</div>
              <div><span className="font-medium">Eau:</span> {inspection.meter_water || '—'}</div>
              <div><span className="font-medium">Gaz:</span> {inspection.meter_gas || '—'}</div>
            </div>
          )}

          {inspection.general_comment && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium mb-1">Observations</p>
              <p className="whitespace-pre-wrap">{inspection.general_comment}</p>
            </div>
          )}

          {inspection.damage_notes && (
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <p className="font-medium mb-1 text-destructive">Dégâts / Problèmes</p>
              <p className="whitespace-pre-wrap">{inspection.damage_notes}</p>
            </div>
          )}

          {allPhotos.length > 0 && (
            <div>
              <p className="font-medium mb-2">Photos ({allPhotos.length})</p>
              <div className="grid grid-cols-3 gap-2">
                {allPhotos.map((p: any, i: number) => (
                  <div key={i} className="relative">
                    <img src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg border" />
                    <span className="absolute bottom-1 left-1 bg-background/80 text-[10px] px-1.5 py-0.5 rounded">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <div>
              <p className="font-medium text-xs mb-1">Signature concierge</p>
              {inspection.concierge_signature_url ? (
                <img src={inspection.concierge_signature_url} alt="" className="h-16 border rounded" />
              ) : <p className="text-muted-foreground">—</p>}
            </div>
            <div>
              <p className="font-medium text-xs mb-1">Signature client</p>
              {inspection.guest_signature_url ? (
                <img src={inspection.guest_signature_url} alt="" className="h-16 border rounded" />
              ) : <p className="text-muted-foreground">—</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
