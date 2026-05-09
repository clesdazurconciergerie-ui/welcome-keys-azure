// MODULE — Dialog création état des lieux flexible (avec antidatage)
import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { useBookings } from "@/hooks/useBookings";
import { usePropertyInspections, useInspectionDetail } from "@/hooks/usePropertyInspections";
import { useInspectionTemplates, DEFAULT_ROOMS } from "@/hooks/useInspectionTemplates";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
  defaultPropertyId?: string;
  defaultType?: string;
  parentInspectionId?: string;
}

const todayISO = () => new Date().toISOString().split("T")[0];

export function CreateInspectionDialog({ open, onOpenChange, onCreated, defaultPropertyId, defaultType, parentInspectionId }: Props) {
  const { properties } = useProperties();
  const { bookings } = useBookings();
  const { create } = usePropertyInspections();
  const { list: templatesList } = useInspectionTemplates();

  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [bookingId, setBookingId] = useState<string>("");
  const [type, setType] = useState(defaultType ?? "entry");
  const [officialDate, setOfficialDate] = useState(todayISO());
  const [guestName, setGuestName] = useState("");
  const [notes, setNotes] = useState("");
  const [templateId, setTemplateId] = useState<string>("__default__");

  const propertyBookings = useMemo(
    () => bookings.filter((b) => b.property_id === propertyId),
    [bookings, propertyId],
  );
  const selectedBooking = propertyBookings.find((b) => b.id === bookingId);

  const isAntedated = officialDate < todayISO();
  const conflictWarning = useMemo(() => {
    if (!selectedBooking) return null;
    if (type === "entry" && officialDate > selectedBooking.check_in) {
      const days = Math.ceil(
        (new Date(officialDate).getTime() - new Date(selectedBooking.check_in).getTime()) / 86400_000,
      );
      if (days >= 1) return `La date est postérieure à l'arrivée du voyageur (${selectedBooking.check_in}).`;
    }
    if (type === "exit" && officialDate < selectedBooking.check_out) {
      return `La date est antérieure au départ (${selectedBooking.check_out}).`;
    }
    return null;
  }, [selectedBooking, type, officialDate]);

  const reset = () => {
    setPropertyId(""); setBookingId(""); setType("entry");
    setOfficialDate(todayISO()); setGuestName(""); setNotes("");
  };

  const handleSubmit = async () => {
    if (!propertyId) return;
    const result = await create.mutateAsync({
      property_id: propertyId,
      booking_id: bookingId || null,
      inspection_type: type,
      official_date: officialDate,
      guest_name: guestName || selectedBooking?.guest_name || null,
      notes: notes || null,
      parent_inspection_id: parentInspectionId ?? null,
    } as any);

    // Seed items from chosen template (or default)
    try {
      const tpl = templatesList.data?.find((t) => t.id === templateId);
      const rooms = tpl?.rooms ?? (templateId === "__none__" ? [] : DEFAULT_ROOMS);
      if (rooms.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const rows: any[] = [];
        let order = 0;
        for (const r of rooms) {
          for (const it of r.items) {
            rows.push({
              inspection_id: result.id,
              user_id: user!.id,
              room_name: r.name,
              item_name: it.name,
              category: it.category ?? null,
              condition: "good",
              display_order: order++,
            });
          }
        }
        if (rows.length > 0) {
          await (supabase as any).from("inspection_items").insert(rows);
        }
      }
    } catch (e) {
      // non-blocking
      console.error("seed items failed", e);
    }

    onCreated?.(result.id);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel état des lieux</DialogTitle>
          <DialogDescription>
            Vous pouvez créer un état des lieux antidaté si nécessaire (la date réelle reste tracée).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Logement *</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {propertyId && propertyBookings.length > 0 && (
            <div className="space-y-2">
              <Label>Réservation liée (optionnel)</Label>
              <Select value={bookingId} onValueChange={(v) => {
                setBookingId(v);
                const b = propertyBookings.find((bk) => bk.id === v);
                if (b) {
                  setGuestName(b.guest_name ?? "");
                  if (type === "entry" && b.check_in) setOfficialDate(b.check_in);
                  if (type === "exit" && b.check_out) setOfficialDate(b.check_out);
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  {propertyBookings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.guest_name ?? "—"} · {b.check_in} → {b.check_out}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">État des lieux d'entrée</SelectItem>
                  <SelectItem value="exit">État des lieux de sortie</SelectItem>
                  <SelectItem value="inventory">Inventaire</SelectItem>
                  <SelectItem value="maintenance">Visite maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date officielle *</Label>
              <Input
                type="date"
                value={officialDate}
                onChange={(e) => setOfficialDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Cette date apparaîtra sur le PDF. Vous pouvez antidater.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nom du voyageur</Label>
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Modèle de checklist</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Checklist standard (4 pièces, 14 items)</SelectItem>
                <SelectItem value="__none__">Aucune (vide, à remplir manuellement)</SelectItem>
                {(templatesList.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Les pièces et items seront pré-créés. Vous pourrez les compléter (état + photos) ensuite.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {isAntedated && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-100">Antidatage</AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                L'état des lieux sera officiellement daté du {officialDate}.
                La date réelle de création (aujourd'hui) reste dans l'historique.
              </AlertDescription>
            </Alert>
          )}

          {conflictWarning && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
              <AlertTriangle className="h-4 w-4 text-orange-700 dark:text-orange-300" />
              <AlertTitle className="text-orange-900 dark:text-orange-100">Vérification</AlertTitle>
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                {conflictWarning}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={!propertyId || !officialDate || create.isPending}
            className="bg-primary text-primary-foreground"
          >
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
