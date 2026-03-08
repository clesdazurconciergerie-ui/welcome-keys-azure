import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInspections, type Inspection } from '@/hooks/useInspections';
import { InspectionPdfGenerator } from '@/components/inspection/InspectionPdfGenerator';
import { motion } from 'framer-motion';
import { ClipboardCheck, Home, Calendar, User, Eye, Camera, Key } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const STATUS_LABELS: Record<string, string> = {
  entry_validated: 'Entrée validée',
  exit_completed: 'Sortie complétée',
  finalized: 'Finalisé',
  completed: 'Finalisé',
};

export default function OwnerInspectionsPage() {
  const { inspections, isLoading } = useInspections();
  const [viewInspection, setViewInspection] = useState<Inspection | null>(null);

  // Owners only see entry_validated, exit_completed, finalized, completed
  const visible = inspections.filter(i => ['entry_validated', 'exit_completed', 'finalized', 'completed'].includes(i.status));

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">État des lieux</h1>
        <p className="text-muted-foreground mt-1">Rapports d'état des lieux de vos biens</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="pt-6">
            <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-xl font-semibold mb-2">Aucun état des lieux</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Les rapports apparaîtront ici automatiquement après chaque séjour validé par la conciergerie.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((insp, idx) => {
            const allPhotos = (insp.cleaning_photos_json?.length || 0) + (insp.exit_photos_json?.length || 0);
            const statusLabel = STATUS_LABELS[insp.status] || 'Finalisé';
            return (
              <motion.div key={insp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Home className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold truncate">{insp.property?.name || 'Bien'}</span>
                          <Badge variant={insp.damage_notes ? 'destructive' : 'default'} className="text-xs">{statusLabel}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(insp.inspection_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          {insp.guest_name && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{insp.guest_name}</span>}
                          {(insp as any).keys_handed_over && <span className="flex items-center gap-1"><Key className="w-3 h-3" />{(insp as any).keys_handed_over} clés</span>}
                          {allPhotos > 0 && <span className="flex items-center gap-1 text-xs"><Camera className="w-3 h-3" />{allPhotos} photos</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <InspectionPdfGenerator inspection={insp} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewInspection(insp)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* View dialog — NO payments shown */}
      <Dialog open={!!viewInspection} onOpenChange={o => !o && setViewInspection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          {viewInspection && (
            <>
              <DialogHeader>
                <DialogTitle>État des lieux — {viewInspection.property?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="font-medium">Arrivée:</span> {new Date(viewInspection.inspection_date).toLocaleDateString('fr-FR')}</div>
                  <div><span className="font-medium">Client:</span> {viewInspection.guest_name || '—'}</div>
                  <div><span className="font-medium">Occupants:</span> {viewInspection.occupants_count || '—'}</div>
                  <div><span className="font-medium">Clés remises:</span> {(viewInspection as any).keys_handed_over || '—'}</div>
                </div>

                {viewInspection.general_comment && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium mb-1">Observations</p>
                    <p className="whitespace-pre-wrap">{viewInspection.general_comment}</p>
                  </div>
                )}

                {viewInspection.damage_notes && (
                  <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="font-medium mb-1 text-destructive">Dégâts / Anomalies</p>
                    <p className="whitespace-pre-wrap">{viewInspection.damage_notes}</p>
                  </div>
                )}

                {/* Photos — NO payments_json shown */}
                {(() => {
                  const cleaningPhotos = viewInspection.cleaning_photos_json || [];
                  const meterPhotos = (viewInspection as any).meter_photos_json || [];
                  const exitPhotos = viewInspection.exit_photos_json || [];
                  const hasPhotos = cleaningPhotos.length + meterPhotos.length + exitPhotos.length > 0;
                  if (!hasPhotos) return null;
                  return (
                    <div className="space-y-3">
                      {cleaningPhotos.length > 0 && (
                        <div>
                          <p className="font-medium mb-2">Photos de référence</p>
                          <div className="grid grid-cols-3 gap-2">
                            {cleaningPhotos.map((p: any, i: number) => <img key={i} src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg border" />)}
                          </div>
                        </div>
                      )}
                      {meterPhotos.length > 0 && (
                        <div>
                          <p className="font-medium mb-2">Compteurs</p>
                          <div className="grid grid-cols-3 gap-2">
                            {meterPhotos.map((p: any, i: number) => <img key={i} src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg border" />)}
                          </div>
                        </div>
                      )}
                      {exitPhotos.length > 0 && (
                        <div>
                          <p className="font-medium mb-2">Photos de sortie</p>
                          <div className="grid grid-cols-3 gap-2">
                            {exitPhotos.map((p: any, i: number) => <img key={i} src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg border" />)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <p className="font-medium text-xs mb-1">Signature concierge</p>
                    {viewInspection.concierge_signature_url ? <img src={viewInspection.concierge_signature_url} alt="" className="h-16 border rounded" /> : <p className="text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="font-medium text-xs mb-1">Signature client</p>
                    {viewInspection.guest_signature_url ? <img src={viewInspection.guest_signature_url} alt="" className="h-16 border rounded" /> : <p className="text-muted-foreground">—</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
