import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInspections, type Inspection } from '@/hooks/useInspections';
import { InspectionForm } from '@/components/inspection/InspectionForm';
import { InspectionPdfGenerator } from '@/components/inspection/InspectionPdfGenerator';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, Plus, Home, Calendar, User, Trash2, Edit, Eye, ArrowRight
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function InspectionsPage() {
  const { inspections, isLoading, deleteInspection, refetch } = useInspections();
  const [showForm, setShowForm] = useState<'entry' | 'exit' | null>(null);
  const [editInspection, setEditInspection] = useState<Inspection | null>(null);
  const [linkedEntryId, setLinkedEntryId] = useState<string | undefined>();
  const [viewInspection, setViewInspection] = useState<Inspection | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const entries = inspections.filter(i => i.inspection_type === 'entry');
  const exits = inspections.filter(i => i.inspection_type === 'exit');

  const handleCreateExit = (entryId: string) => {
    setLinkedEntryId(entryId);
    setShowForm('exit');
  };

  const handleFormComplete = () => {
    setShowForm(null);
    setEditInspection(null);
    setLinkedEntryId(undefined);
    refetch();
  };

  if (showForm || editInspection) {
    return (
      <div className="space-y-6 max-w-6xl">
        <InspectionForm
          type={editInspection?.inspection_type || showForm || 'entry'}
          existingInspection={editInspection}
          linkedEntryId={linkedEntryId}
          onComplete={handleFormComplete}
          onCancel={() => { setShowForm(null); setEditInspection(null); setLinkedEntryId(undefined); }}
        />
      </div>
    );
  }

  const renderList = (list: Inspection[]) => {
    if (list.length === 0) return (
      <Card className="text-center py-12">
        <CardContent className="pt-6">
          <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucun état des lieux</p>
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-3">
        {list.map((insp, idx) => (
          <motion.div key={insp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Home className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold truncate">{insp.property?.name || 'Bien'}</span>
                      <Badge variant={insp.status === 'completed' ? 'default' : 'secondary'} className="shrink-0">
                        {insp.status === 'completed' ? 'Finalisé' : 'Brouillon'}
                      </Badge>
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
                    </div>
                    {insp.general_comment && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{insp.general_comment}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {insp.status === 'completed' && <InspectionPdfGenerator inspection={insp} />}
                    {insp.inspection_type === 'entry' && !exits.find(e => e.linked_inspection_id === insp.id) && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => handleCreateExit(insp.id)}>
                        <ArrowRight className="w-3.5 h-3.5" />
                        Sortie
                      </Button>
                    )}
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
    );
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">État des lieux</h1>
          <p className="text-muted-foreground mt-1">Inspections d'entrée et de sortie de vos biens</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowForm('exit')} className="gap-2">
            <Plus className="w-4 h-4" />
            Sortie
          </Button>
          <Button onClick={() => setShowForm('entry')} className="gap-2">
            <Plus className="w-4 h-4" />
            Entrée
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="entry">
          <TabsList>
            <TabsTrigger value="entry">Entrées ({entries.length})</TabsTrigger>
            <TabsTrigger value="exit">Sorties ({exits.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="entry" className="mt-4">
            {renderList(entries)}
          </TabsContent>
          <TabsContent value="exit" className="mt-4">
            {renderList(exits)}
          </TabsContent>
        </Tabs>
      )}

      {/* View dialog */}
      <Dialog open={!!viewInspection} onOpenChange={o => !o && setViewInspection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          {viewInspection && (
            <>
              <DialogHeader>
                <DialogTitle>
                  État des lieux {viewInspection.inspection_type === 'entry' ? "d'entrée" : "de sortie"} — {viewInspection.property?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="font-medium">Date:</span> {new Date(viewInspection.inspection_date).toLocaleDateString('fr-FR')}</div>
                  <div><span className="font-medium">Client:</span> {viewInspection.guest_name || '—'}</div>
                  <div><span className="font-medium">Occupants:</span> {viewInspection.occupants_count || '—'}</div>
                  <div><span className="font-medium">Statut:</span> {viewInspection.status === 'completed' ? 'Finalisé' : 'Brouillon'}</div>
                </div>

                {viewInspection.inspection_type === 'entry' && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
                    <div><span className="font-medium">Élec:</span> {viewInspection.meter_electricity || '—'}</div>
                    <div><span className="font-medium">Eau:</span> {viewInspection.meter_water || '—'}</div>
                    <div><span className="font-medium">Gaz:</span> {viewInspection.meter_gas || '—'}</div>
                  </div>
                )}

                {viewInspection.general_comment && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium mb-1">Observations</p>
                    <p className="whitespace-pre-wrap">{viewInspection.general_comment}</p>
                  </div>
                )}

                {viewInspection.damage_notes && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-medium mb-1 text-red-700">Dégâts / Problèmes</p>
                    <p className="whitespace-pre-wrap text-red-800">{viewInspection.damage_notes}</p>
                  </div>
                )}

                {/* Photos */}
                {(() => {
                  const photos = viewInspection.inspection_type === 'entry'
                    ? viewInspection.cleaning_photos_json || []
                    : viewInspection.exit_photos_json || [];
                  if (photos.length === 0) return null;
                  return (
                    <div>
                      <p className="font-medium mb-2">
                        {viewInspection.inspection_type === 'entry' ? 'Photos ménage' : 'Photos de sortie'}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((p: any, i: number) => (
                          <img key={i} src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg border" />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <p className="font-medium text-xs mb-1">Signature concierge</p>
                    {viewInspection.concierge_signature_url ? (
                      <img src={viewInspection.concierge_signature_url} alt="" className="h-16 border rounded" />
                    ) : <p className="text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="font-medium text-xs mb-1">Signature client</p>
                    {viewInspection.guest_signature_url ? (
                      <img src={viewInspection.guest_signature_url} alt="" className="h-16 border rounded" />
                    ) : <p className="text-muted-foreground">—</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
