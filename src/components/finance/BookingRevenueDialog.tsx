import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Coins, Sparkles } from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";
import { resolveBookingPlatform } from "@/lib/booking-platforms";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface BookingRevenueTarget {
  id: string;
  property_id: string;
  property_name?: string;
  check_in: string;
  check_out: string;
  guest_name: string | null;
  source_platform: string | null;
  source: string | null;
  gross_amount: number | null;
  cleaning_amount: number | null;
  commission_amount: number | null;
  tourist_tax_amount?: number | null;
}

interface Props {
  booking: BookingRevenueTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function BookingRevenueDialog({ booking, open, onOpenChange, onSaved }: Props) {
  const [gross, setGross] = useState("");
  const [cleaning, setCleaning] = useState("");
  const [commission, setCommission] = useState("");
  const [touristTax, setTouristTax] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setGross(booking.gross_amount != null ? String(booking.gross_amount) : "");
      setCleaning(booking.cleaning_amount != null ? String(booking.cleaning_amount) : "");
      setCommission(booking.commission_amount != null ? String(booking.commission_amount) : "");
      setTouristTax(booking.tourist_tax_amount != null ? String(booking.tourist_tax_amount) : "");
    }
  }, [booking]);

  if (!booking) return null;

  const platform = resolveBookingPlatform({
    platform: booking.source_platform,
    source: booking.source,
  });

  const nights = Math.max(
    1,
    Math.round(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000,
    ),
  );

  const grossNum = parseFloat(gross) || 0;
  const cleaningNum = parseFloat(cleaning) || 0;
  const commissionNum = parseFloat(commission) || 0;
  const touristTaxNum = parseFloat(touristTax) || 0;
  const ownerNet = Math.max(0, grossNum - cleaningNum - commissionNum - touristTaxNum);
  const adr = nights > 0 ? grossNum / nights : 0;

  // Smart defaults based on platform commission rates
  const suggestCommission = () => {
    if (!grossNum) {
      toast.info("Saisissez d'abord le prix brut");
      return;
    }
    const rates: Record<string, number> = {
      airbnb: 0.03,
      booking: 0.15,
      vrbo: 0.08,
      direct: 0,
      other: 0,
    };
    const rate = rates[platform] ?? 0;
    setCommission((grossNum * rate).toFixed(2));
    toast.success(`Commission estimée (${(rate * 100).toFixed(0)}%)`);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      gross_amount: gross === "" ? null : grossNum,
      cleaning_amount: cleaningNum,
      commission_amount: commissionNum,
      tourist_tax_amount: touristTaxNum,
      owner_net: ownerNet,
      financial_status: gross !== "" ? "completed" : "pending",
      price_status: gross !== "" ? "filled" : "pending",
    };

    const { error } = await (supabase as any)
      .from("bookings")
      .update(payload)
      .eq("id", booking.id);

    setSaving(false);

    if (error) {
      toast.error("Erreur enregistrement: " + error.message);
      return;
    }
    toast.success("Revenus enregistrés ✓");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[hsl(var(--gold))]" />
            Compléter les revenus
          </DialogTitle>
          <DialogDescription className="space-y-1.5 pt-2">
            <div className="flex items-center gap-2">
              <PlatformBadge platform={platform} />
              <span className="text-sm font-medium text-foreground">
                {booking.guest_name || "Réservation"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {booking.property_name && <span className="font-medium">{booking.property_name} · </span>}
              {format(new Date(booking.check_in), "d MMM", { locale: fr })}
              {" → "}
              {format(new Date(booking.check_out), "d MMM yyyy", { locale: fr })}
              {" · "}
              {nights} nuit{nights > 1 ? "s" : ""}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="gross" className="text-xs">Prix brut total (€) *</Label>
            <Input
              id="gross"
              type="number"
              step="0.01"
              min="0"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              placeholder="ex: 850.00"
              autoFocus
            />
            {grossNum > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                ADR: {adr.toFixed(0)}€/nuit
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="cleaning" className="text-xs">Frais ménage (€)</Label>
              <Input
                id="cleaning"
                type="number"
                step="0.01"
                min="0"
                value={cleaning}
                onChange={(e) => setCleaning(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="tax" className="text-xs">Taxe séjour (€)</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                min="0"
                value={touristTax}
                onChange={(e) => setTouristTax(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="commission" className="text-xs">Commission plateforme (€)</Label>
              <button
                type="button"
                onClick={suggestCommission}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Estimer
              </button>
            </div>
            <Input
              id="commission"
              type="number"
              step="0.01"
              min="0"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="0"
            />
          </div>

          {grossNum > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Brut</span>
                <span>{grossNum.toFixed(2)}€</span>
              </div>
              {cleaningNum > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>− Ménage</span>
                  <span>{cleaningNum.toFixed(2)}€</span>
                </div>
              )}
              {touristTaxNum > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>− Taxe séjour</span>
                  <span>{touristTaxNum.toFixed(2)}€</span>
                </div>
              )}
              {commissionNum > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>− Commission</span>
                  <span>{commissionNum.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-foreground pt-1.5 border-t border-border">
                <span>Net propriétaire</span>
                <span className="text-[hsl(var(--gold))]">{ownerNet.toFixed(2)}€</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || !gross}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
