import { useState } from "react";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onCreated?: () => void;
}

const schema = z.object({
  guest_name: z.string().trim().min(1, "Nom requis").max(120),
  guest_email: z.string().trim().email("Email invalide").max(255).optional().or(z.literal("")),
  guest_phone: z.string().trim().max(40).optional().or(z.literal("")),
  check_in: z.string().min(1, "Date d'arrivée requise"),
  check_out: z.string().min(1, "Date de départ requise"),
  gross_amount: z.string().optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
}).refine(d => new Date(d.check_out) > new Date(d.check_in), {
  message: "La date de départ doit être après l'arrivée",
  path: ["check_out"],
});

export function AddDirectBookingDialog({ open, onOpenChange, propertyId, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    check_in: "",
    check_out: "",
    gross_amount: "",
    notes: "",
  });

  const reset = () => setForm({
    guest_name: "", guest_email: "", guest_phone: "",
    check_in: "", check_out: "", gross_amount: "", notes: "",
  });

  const handleSubmit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Non authentifié"); return; }

      const gross = form.gross_amount ? parseFloat(form.gross_amount.replace(",", ".")) : 0;

      const { error } = await (supabase as any).from("bookings").insert({
        user_id: user.id,
        property_id: propertyId,
        check_in: form.check_in,
        check_out: form.check_out,
        guest_name: form.guest_name.trim(),
        guest_email: form.guest_email.trim() || null,
        guest_phone: form.guest_phone.trim() || null,
        gross_amount: Number.isFinite(gross) ? gross : 0,
        notes: form.notes.trim() || null,
        source: "manual",
        source_platform: "direct",
        is_manual: true,
        price_status: "complete",
        financial_status: "pending",
      });

      if (error) { toast.error("Erreur création : " + error.message); return; }

      toast.success("Réservation directe ajoutée");
      reset();
      onOpenChange(false);
      onCreated?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[hsl(var(--gold))]" />
            Ajouter une réservation directe
          </DialogTitle>
          <DialogDescription>
            Réservation sans plateforme externe (téléphone, email, bouche-à-oreille).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="guest_name">Nom du client *</Label>
            <Input
              id="guest_name"
              value={form.guest_name}
              onChange={e => setForm({ ...form, guest_name: e.target.value })}
              placeholder="Jean Dupont"
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="guest_email">Email</Label>
              <Input
                id="guest_email"
                type="email"
                value={form.guest_email}
                onChange={e => setForm({ ...form, guest_email: e.target.value })}
                placeholder="jean@exemple.fr"
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest_phone">Téléphone</Label>
              <Input
                id="guest_phone"
                type="tel"
                value={form.guest_phone}
                onChange={e => setForm({ ...form, guest_phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
                maxLength={40}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="check_in">Arrivée *</Label>
              <Input
                id="check_in"
                type="date"
                value={form.check_in}
                onChange={e => setForm({ ...form, check_in: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="check_out">Départ *</Label>
              <Input
                id="check_out"
                type="date"
                value={form.check_out}
                min={form.check_in || undefined}
                onChange={e => setForm({ ...form, check_out: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gross_amount">Prix total (€)</Label>
            <Input
              id="gross_amount"
              type="number"
              min="0"
              step="0.01"
              value={form.gross_amount}
              onChange={e => setForm({ ...form, gross_amount: e.target.value })}
              placeholder="450.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              maxLength={1000}
              placeholder="Informations spécifiques à cette réservation…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer la réservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
