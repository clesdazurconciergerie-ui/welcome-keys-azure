import { useState, useEffect } from "react";
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
  initialStart?: string;
  initialEnd?: string;
  hideDateInputs?: boolean;
}

export function OwnerBlockDatesDialog({ open, onOpenChange, onConfirm, initialStart, initialEnd, hideDateInputs }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(initialStart || today);
  const [end, setEnd] = useState(initialEnd || today);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialStart) setStart(initialStart);
      if (initialEnd) setEnd(initialEnd);
    }
  }, [open, initialStart, initialEnd]);

  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

  const nights = (() => {
    if (!start || !end) return 0;
    return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
  })();

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
            <Lock className="w-4 h-4" /> Bloquer ces dates
          </DialogTitle>
          <DialogDescription>
            Ces dates seront indisponibles à la réservation. Elles sont automatiquement transmises via iCal à Airbnb, Booking et toutes les plateformes connectées (délai OTA : 1 à 3 heures).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {hideDateInputs ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sélection</p>
              <p className="text-sm font-medium">{fmt(start)}</p>
              <p className="text-xs text-muted-foreground">au</p>
              <p className="text-sm font-medium">{fmt(end)}</p>
              <p className="text-[11px] text-muted-foreground pt-1">{nights} nuit{nights > 1 ? "s" : ""} bloquée{nights > 1 ? "s" : ""} (départ le {fmt(end)})</p>
            </div>
          ) : (
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
          )}
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
