import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInspections, type Inspection } from '@/hooks/useInspections';
import { InspectionPdfGenerator } from '@/components/inspection/InspectionPdfGenerator';
import { motion } from 'framer-motion';
import { ClipboardCheck, Home, Calendar, User, Eye } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function OwnerInspectionsPage() {
  const { inspections, isLoading } = useInspections();
  const [viewInspection, setViewInspection] = useState<Inspection | null>(null);

  const completed = inspections.filter(i => i.status === 'completed');

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">État des lieux</h1>
        <p className="text-muted-foreground mt-1">Inspections d'entrée et de sortie de vos biens</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : completed.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="pt-6">
            <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-xl font-semibold mb-2">Aucun état des lieux</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Les documents d'état des lieux apparaîtront ici une fois finalisés par votre conciergerie.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {completed.map((insp, idx) => (
            <motion.div key={insp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold truncate">{insp.property?.name || 'Bien'}</span>
                        <Badge variant={insp.inspection_type === 'entry' ? 'default' : 'secondary'}>
                          {insp.inspection_type === 'entry' ? 'Entrée' : 'Sortie'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(insp.inspection_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        {insp.guest_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {insp.guest_name}
                          </span>
                        )}
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
          ))}
        </div>
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
    </div>
  );
}
