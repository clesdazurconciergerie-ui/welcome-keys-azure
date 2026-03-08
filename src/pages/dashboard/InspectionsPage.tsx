import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInspections, type Inspection } from '@/hooks/useInspections';
import { useCleaningInterventions } from '@/hooks/useCleaningInterventions';
import { useProperties } from '@/hooks/useProperties';
import { InspectionPdfGenerator } from '@/components/inspection/InspectionPdfGenerator';
import { CreateInspectionDialog, type InspectionFormValues } from '@/components/inspection/CreateInspectionDialog';
import { EntryValidationDialog } from '@/components/inspection/EntryValidationDialog';
import { ExitCompletionDialog } from '@/components/inspection/ExitCompletionDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, Home, Calendar, User, Eye, Edit, Trash2,
  Camera, CheckCircle, Plus, Key, Euro, LogOut, FileDown
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const isDev = import.meta.env.DEV;
const log = (...args: any[]) => { if (isDev) console.log('[EdL]', ...args); };

// Status definitions
type InspStatus = 'draft' | 'entry_validated' | 'exit_completed' | 'finalized';

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Préparé', color: 'text-amber-600', variant: 'secondary' },
  pending: { label: 'Préparé', color: 'text-amber-600', variant: 'secondary' },
  entry_validated: { label: 'Entrée validée', color: 'text-blue-600', variant: 'outline' },
  exit_completed: { label: 'Sortie complétée', color: 'text-purple-600', variant: 'default' },
  finalized: { label: 'Finalisé', color: 'text-emerald-600', variant: 'default' },
  completed: { label: 'Finalisé', color: 'text-emerald-600', variant: 'default' },
};

export default function InspectionsPage() {
  const { inspections, isLoading, deleteInspection, updateInspection, createInspection, uploadSignature, uploadExitPhoto, refetch } = useInspections();
  const { properties } = useProperties();
  const [viewInspection, setViewInspection] = useState<Inspection | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [entryValidateInspection, setEntryValidateInspection] = useState<Inspection | null>(null);
  const [exitCompleteInspection, setExitCompleteInspection] = useState<Inspection | null>(null);

  /** Create cash_incomes for paid items */
  const createFinanceRecords = async (inspectionId: string, propertyId: string, bookingId: string | null, payments: { label: string; amount: number; paid: boolean }[]) => {
    const paidPayments = payments.filter(p => p.paid && p.amount > 0);
    if (paidPayments.length === 0) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      for (const p of paidPayments) {
        const category = p.label === 'Ménage' ? 'menage' : p.label === 'Draps' ? 'linge' : 'other';
        await (supabase as any).from('cash_incomes').insert({
          user_id: user.id, property_id: propertyId, amount: p.amount,
          description: `${p.label} — EdL`, income_date: new Date().toISOString().split('T')[0],
          category, notes: `Inspection ${inspectionId}${bookingId ? ` / Réservation ${bookingId}` : ''}`,
        });
      }
      toast.success(`${paidPayments.length} règlement(s) enregistré(s) en finance`);
    } catch (err) { console.error('Error creating finance records:', err); }
  };

  const handleManualCreate = async (values: InspectionFormValues) => {
    const result = await createInspection({
      property_id: values.property_id,
      booking_id: values.booking_id,
      guest_name: values.guest_name,
      inspection_date: values.inspection_date,
      general_comment: values.general_comment,
      occupants_count: values.occupants_count,
      inspection_type: 'entry',
      status: 'draft',
      cleaning_photos_json: values.cleaningPhotos,
    } as any);
    if (!result) return;

    // Upload meter photos
    const meterPhotoUrls: any[] = [];
    for (const p of values.meter_photos) {
      if (p.file) {
        const url = await uploadExitPhoto(result.id, p.file);
        if (url) meterPhotoUrls.push({ url, uploaded_at: p.uploaded_at, type: 'meter' });
      }
    }

    // Upload additional photos
    const additionalPhotoUrls: any[] = [];
    for (const p of values.photos) {
      if (p.file) {
        const url = await uploadExitPhoto(result.id, p.file);
        if (url) additionalPhotoUrls.push({ url, uploaded_at: p.uploaded_at });
      }
    }

    const allPhotos = [...values.cleaningPhotos, ...additionalPhotoUrls];

    await updateInspection(result.id, {
      cleaning_photos_json: allPhotos,
      keys_handed_over: values.keys_handed_over,
      meter_photos_json: meterPhotoUrls,
      payments_json: values.payments,
    } as any);

    // Mark buffer photos as used
    if (values.bufferPhotoIds?.length > 0) {
      await (supabase as any)
        .from('property_cleaning_buffer')
        .update({ used_in_inspection: true, inspection_id: result.id })
        .in('id', values.bufferPhotoIds);
    }

    // Create finance records for paid items
    if (values.payments.length > 0) {
      await createFinanceRecords(result.id, values.property_id, values.booking_id, values.payments);
    }
  };

  const handleEntryValidation = async (id: string, conciergeSignature: string | null, guestSignature: string | null) => {
    let conciergeUrl = conciergeSignature;
    if (conciergeUrl?.startsWith('data:')) conciergeUrl = await uploadSignature(id, conciergeUrl, 'concierge');
    let guestUrl = guestSignature;
    if (guestUrl?.startsWith('data:')) guestUrl = await uploadSignature(id, guestUrl, 'guest');

    await updateInspection(id, {
      concierge_signature_url: conciergeUrl,
      guest_signature_url: guestUrl,
      status: 'entry_validated',
    } as any);
    toast.success('Entrée validée avec signatures');
    refetch();
  };

  const handleExitCompletion = async (id: string, values: {
    damage_notes: string | null;
    general_comment: string | null;
    exit_photos: { url: string; file?: File; uploaded_at: string }[];
    concierge_signature: string | null;
    guest_signature: string | null;
    finalize: boolean;
  }) => {
    // Upload exit photos
    const exitPhotos: any[] = [];
    for (const p of values.exit_photos) {
      if (p.file) {
        const url = await uploadExitPhoto(id, p.file);
        if (url) exitPhotos.push({ url, uploaded_at: p.uploaded_at });
      } else {
        exitPhotos.push(p);
      }
    }

    let conciergeUrl = values.concierge_signature;
    if (conciergeUrl?.startsWith('data:')) conciergeUrl = await uploadSignature(id, conciergeUrl, 'concierge');
    let guestUrl = values.guest_signature;
    if (guestUrl?.startsWith('data:')) guestUrl = await uploadSignature(id, guestUrl, 'guest');

    const newStatus = values.finalize ? 'finalized' : 'exit_completed';

    await updateInspection(id, {
      damage_notes: values.damage_notes,
      general_comment: values.general_comment,
      exit_photos_json: exitPhotos,
      ...(conciergeUrl && { concierge_signature_url: conciergeUrl }),
      ...(guestUrl && { guest_signature_url: guestUrl }),
      status: newStatus,
    } as any);
    toast.success(values.finalize ? 'État des lieux finalisé' : 'Sortie enregistrée');
    refetch();
  };

  const getStatusConfig = (s: string) => STATUS_CONFIG[s] || STATUS_CONFIG.draft;

  const getActions = (insp: Inspection) => {
    const s = insp.status;
    const actions: { label: string; icon: any; onClick: () => void; variant?: 'default' | 'outline' | 'ghost' }[] = [];

    if (s === 'draft' || s === 'pending') {
      actions.push({ label: 'Valider l\'entrée', icon: CheckCircle, onClick: () => setEntryValidateInspection(insp), variant: 'default' });
    }
    if (s === 'entry_validated') {
      actions.push({ label: 'Compléter la sortie', icon: LogOut, onClick: () => setExitCompleteInspection(insp), variant: 'default' });
    }
    if (s === 'exit_completed') {
      actions.push({ label: 'Finaliser', icon: CheckCircle, onClick: async () => {
        await updateInspection(insp.id, { status: 'finalized' } as any);
        refetch();
      }, variant: 'default' });
    }
    if (['finalized', 'completed', 'exit_completed'].includes(s)) {
      actions.push({ label: 'PDF', icon: FileDown, onClick: () => {}, variant: 'outline' });
    }
    return actions;
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">État des lieux</h1>
          <p className="text-muted-foreground mt-1">Préparez, validez l'entrée, puis complétez la sortie</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          Préparer un état des lieux
        </Button>
      </motion.div>

      {/* Empty state */}
      {!isLoading && inspections.length === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 text-center">
            <ClipboardCheck className="w-10 h-10 mx-auto text-primary mb-3" />
            <h3 className="text-lg font-semibold mb-1">Aucun état des lieux</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
              Préparez un état des lieux pour un logement. Le système récupérera automatiquement les réservations et photos ménage.
            </p>
            <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2">
              <Plus className="w-4 h-4" />
              Préparer le premier état des lieux
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : inspections.length > 0 && (
        <div className="space-y-3">
          {inspections.map((insp, idx) => {
            const sc = getStatusConfig(insp.status);
            const actions = getActions(insp);
            return (
              <motion.div key={insp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Home className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold truncate">{insp.property?.name || 'Bien'}</span>
                          <Badge variant={sc.variant} className="shrink-0">{sc.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(insp.inspection_date).toLocaleDateString('fr-FR')}</span>
                          {insp.guest_name && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{insp.guest_name}</span>}
                          {(insp as any).keys_handed_over && <span className="flex items-center gap-1"><Key className="w-3 h-3" />{(insp as any).keys_handed_over} clés</span>}
                          {insp.cleaning_photos_json?.length > 0 && (
                            <span className="flex items-center gap-1 text-xs"><Camera className="w-3 h-3" />{insp.cleaning_photos_json.length} photos</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {/* Main action button */}
                        {actions.length > 0 && actions[0].label !== 'PDF' && (
                          <Button size="sm" variant={actions[0].variant as any} onClick={actions[0].onClick} className="gap-1.5 text-xs h-8">
                            <actions[0].icon className="w-3.5 h-3.5" />
                            {actions[0].label}
                          </Button>
                        )}
                        {['finalized', 'completed', 'exit_completed'].includes(insp.status) && (
                          <InspectionPdfGenerator inspection={insp} />
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewInspection(insp)}><Eye className="w-4 h-4" /></Button>
                        {(insp.status === 'draft' || insp.status === 'pending') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(insp.id)}><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <CreateInspectionDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        properties={properties.map(p => ({ id: p.id, name: p.name, address: p.address }))}
        onSave={handleManualCreate}
      />

      <EntryValidationDialog
        inspection={entryValidateInspection}
        onClose={() => { setEntryValidateInspection(null); refetch(); }}
        onValidate={handleEntryValidation}
      />

      <ExitCompletionDialog
        inspection={exitCompleteInspection}
        onClose={() => { setExitCompleteInspection(null); refetch(); }}
        onSave={handleExitCompletion}
      />

      <InspectionViewDialog inspection={viewInspection} onClose={() => setViewInspection(null)} />

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet état des lieux ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteInspection(deleteId); setDeleteId(null); } }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── View Dialog (concierge) ──────────────────────────────
function InspectionViewDialog({ inspection, onClose }: { inspection: Inspection | null; onClose: () => void }) {
  if (!inspection) return null;

  const allPhotos = [
    ...(inspection.cleaning_photos_json || []).map((p: any) => ({ ...p, label: 'Ménage' })),
    ...((inspection as any).meter_photos_json || []).map((p: any) => ({ ...p, label: 'Compteur' })),
    ...(inspection.exit_photos_json || []).map((p: any) => ({ ...p, label: 'Sortie' })),
  ];

  const sc = STATUS_CONFIG[inspection.status] || STATUS_CONFIG.draft;

  return (
    <Dialog open={!!inspection} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            État des lieux — {inspection.property?.name}
            <Badge variant={sc.variant}>{sc.label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="font-medium">Arrivée:</span> {new Date(inspection.inspection_date).toLocaleDateString('fr-FR')}</div>
            <div><span className="font-medium">Client:</span> {inspection.guest_name || '—'}</div>
            <div><span className="font-medium">Occupants:</span> {inspection.occupants_count || '—'}</div>
            <div><span className="font-medium">Clés remises:</span> {(inspection as any).keys_handed_over || '—'}</div>
            <div><span className="font-medium">Ménage par:</span> {inspection.cleaner_name || '—'}</div>
          </div>

          {/* Payments (concierge only) */}
          {(inspection as any).payments_json?.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium mb-2 flex items-center gap-1.5"><Euro className="w-3.5 h-3.5" />Règlements voyageur (interne)</p>
              {(inspection as any).payments_json.map((p: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span>{p.label}</span>
                  <span className="font-medium">{p.amount?.toFixed(2)} €</span>
                </div>
              ))}
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
              <p className="font-medium mb-1 text-destructive">Dégâts / Anomalies</p>
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
              {inspection.concierge_signature_url ? <img src={inspection.concierge_signature_url} alt="" className="h-16 border rounded" /> : <p className="text-muted-foreground">—</p>}
            </div>
            <div>
              <p className="font-medium text-xs mb-1">Signature client</p>
              {inspection.guest_signature_url ? <img src={inspection.guest_signature_url} alt="" className="h-16 border rounded" /> : <p className="text-muted-foreground">—</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
