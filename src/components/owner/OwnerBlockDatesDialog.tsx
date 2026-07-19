import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (start: string, end: string, reason: string) => Promise<boolean> | boolean;
}

export function OwnerBlockDatesDialog({ open, onOpenChange, onConfirm }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const ok = await onConfirm(start, end, reason);
    setSubmitting(false);
    if (ok) {
      setReason("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" /> Bloquer des dates
          </DialogTitle>
          <DialogDescription>
            Ces dates seront indisponibles à la réservation. Elles sont automatiquement transmises via iCal à Airbnb, Booking et toutes les plateformes connectées (délai de synchronisation OTA : 1 à 3 heures).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start">Date de début</Label>
              <Input id="start" type="date" value={start} min={today} onChange={e => setStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="end">Date de fin</Label>
              <Input id="end" type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">Non incluse (départ)</p>
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Motif (optionnel)</Label>
            <Textarea
              id="reason"
              placeholder="Séjour personnel, travaux, entretien…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={submitting || !start || !end || end <= start}>
            {submitting ? "Blocage…" : "Bloquer ces dates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
