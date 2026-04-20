// MODULE 8 — Compliance Hub : taxe de séjour
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TouristTaxSettings {
  id: string;
  user_id: string;
  property_id: string;
  is_enabled: boolean;
  commune_name: string | null;
  commune_code: string | null;
  rate_type: "fixed_per_night_per_person" | "percentage";
  rate_amount: number;
  max_amount_per_night: number | null;
  exempt_under_age: number | null;
  classification: string | null;
}

export interface TouristTaxRecord {
  id: string;
  property_id: string;
  booking_id: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guests_count: number;
  guests_taxable: number;
  rate_applied: number;
  rate_type: string;
  total_tax: number;
  declaration_status: "pending" | "declared" | "paid";
  declared_at: string | null;
  declaration_period: string | null;
  notes: string | null;
}

export function useTouristTaxSettings() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["tax-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tourist_tax_settings").select("*");
      if (error) throw error;
      return (data ?? []) as TouristTaxSettings[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (s: Partial<TouristTaxSettings> & { property_id: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      const { error } = await (supabase as any)
        .from("tourist_tax_settings")
        .upsert({ ...s, user_id: u.user.id }, { onConflict: "property_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-settings"] });
      toast.success("Configuration enregistrée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return { settings: query.data ?? [], isLoading: query.isLoading, upsert: upsert.mutate };
}

export function useTouristTaxRecords() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["tax-records"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tourist_tax_records")
        .select("*")
        .order("check_in", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TouristTaxRecord[];
    },
  });

  const create = useMutation({
    mutationFn: async (r: Partial<TouristTaxRecord>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      const { error } = await (supabase as any)
        .from("tourist_tax_records")
        .insert({ ...r, user_id: u.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-records"] });
      toast.success("Enregistrement créé");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "declared" | "paid" }) => {
      const { error } = await (supabase as any)
        .from("tourist_tax_records")
        .update({
          declaration_status: status,
          declared_at: status !== "pending" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-records"] });
      toast.success("Statut mis à jour");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    create: create.mutate,
    updateStatus: updateStatus.mutate,
  };
}

export function calculateTax(
  settings: TouristTaxSettings,
  nights: number,
  guestsTotal: number,
  guestsTaxable: number,
  grossAmount: number
): number {
  if (!settings.is_enabled) return 0;
  if (settings.rate_type === "fixed_per_night_per_person") {
    let perNight = settings.rate_amount * guestsTaxable;
    if (settings.max_amount_per_night && perNight > settings.max_amount_per_night) {
      perNight = settings.max_amount_per_night;
    }
    return Math.round(perNight * nights * 100) / 100;
  } else {
    // percentage du loyer brut, plafonné par max_amount_per_night
    const perNightPercent = (grossAmount / Math.max(nights, 1)) * (settings.rate_amount / 100);
    let perNight = perNightPercent * guestsTaxable;
    if (settings.max_amount_per_night && perNight > settings.max_amount_per_night) {
      perNight = settings.max_amount_per_night;
    }
    return Math.round(perNight * nights * 100) / 100;
  }
}

export function exportTaxRecordsCSV(records: TouristTaxRecord[], properties: Array<{ id: string; name: string }>): string {
  const propMap = new Map(properties.map((p) => [p.id, p.name]));
  const header = "Bien,Check-in,Check-out,Nuits,Voyageurs,Voyageurs taxables,Tarif,Total taxe (€),Statut,Période\n";
  const rows = records
    .map((r) =>
      [
        `"${propMap.get(r.property_id) ?? r.property_id}"`,
        r.check_in,
        r.check_out,
        r.nights,
        r.guests_count,
        r.guests_taxable,
        r.rate_applied,
        r.total_tax.toFixed(2),
        r.declaration_status,
        r.declaration_period ?? "",
      ].join(",")
    )
    .join("\n");
  return header + rows;
}
