// MODULE — Hook états des lieux v2 (double datation)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PropertyInspection {
  id: string;
  user_id: string;
  property_id: string;
  booking_id: string | null;
  official_date: string;
  actual_created_at: string;
  inspection_type: string;
  status: string;
  inspector_name: string | null;
  guest_name: string | null;
  notes: string | null;
  global_condition: string | null;
  version: number;
  parent_inspection_id: string | null;
  created_at: string;
  updated_at: string;
  property?: { name: string; address: string | null } | null;
  booking?: { check_in: string; check_out: string; guest_name: string | null } | null;
  concierge_signature_url?: string | null;
  guest_signature_url?: string | null;
  concierge_signer_name?: string | null;
  guest_signer_name?: string | null;
  signed_at?: string | null;
  meter_electricity?: string | null;
  meter_water?: string | null;
  meter_gas?: string | null;
  occupants_count?: number | null;
  damage_notes?: string | null;
}

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  inspection_item_id: string | null;
  official_date: string;
  actual_uploaded_at: string;
  storage_path: string;
  file_url: string;
  caption: string | null;
  room_name: string | null;
  display_order: number;
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  room_name: string;
  item_name: string;
  category: string | null;
  condition: string;
  notes: string | null;
  quantity: number | null;
  display_order: number;
}

export interface InspectionAuditEntry {
  id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string | null;
  reason: string | null;
  created_at: string;
}

export function usePropertyInspections() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["property-inspections"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("property_inspections")
        .select("*, property:property_id(name, address)")
        .order("official_date", { ascending: false });
      if (error) throw error;
      return (data as PropertyInspection[]) ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      property_id: string;
      official_date: string;
      inspection_type: string;
      booking_id?: string | null;
      guest_name?: string | null;
      notes?: string | null;
      parent_inspection_id?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { data, error } = await (supabase as any)
        .from("property_inspections")
        .insert({
          user_id: user.id,
          created_by: user.id,
          status: "draft",
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property-inspections"] });
      toast.success("État des lieux créé");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur création"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("property_inspections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property-inspections"] });
      toast.success("État des lieux supprimé");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur suppression"),
  });

  return { list, create, remove };
}

export function useInspectionDetail(id: string | undefined) {
  const qc = useQueryClient();

  const inspection = useQuery({
    queryKey: ["inspection", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("property_inspections")
        .select("*, property:property_id(name, address)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as PropertyInspection;
    },
    enabled: !!id,
  });

  const photos = useQuery({
    queryKey: ["inspection-photos", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inspection_photos")
        .select("*")
        .eq("inspection_id", id)
        .order("display_order");
      if (error) throw error;
      return (data as InspectionPhoto[]) ?? [];
    },
    enabled: !!id,
  });

  const items = useQuery({
    queryKey: ["inspection-items", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inspection_items")
        .select("*")
        .eq("inspection_id", id)
        .order("display_order");
      if (error) throw error;
      return (data as InspectionItem[]) ?? [];
    },
    enabled: !!id,
  });

  const audit = useQuery({
    queryKey: ["inspection-audit", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inspection_audit_log")
        .select("*")
        .eq("inspection_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as InspectionAuditEntry[]) ?? [];
    },
    enabled: !!id,
  });

  const updateInspection = useMutation({
    mutationFn: async (patch: Partial<PropertyInspection>) => {
      const { error } = await (supabase as any)
        .from("property_inspections")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection", id] });
      qc.invalidateQueries({ queryKey: ["inspection-audit", id] });
      qc.invalidateQueries({ queryKey: ["property-inspections"] });
      toast.success("Mis à jour");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (input: { file: File; roomName?: string; caption?: string; itemId?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id || !inspection.data) throw new Error("Inspection introuvable");

      const ext = input.file.name.split(".").pop() || "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${user.id}/${id}/${filename}`;

      const { error: uploadErr } = await supabase.storage
        .from("inspection-photos")
        .upload(path, input.file, { contentType: input.file.type });
      if (uploadErr) throw uploadErr;

      const { data: signed } = await supabase.storage
        .from("inspection-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const fileUrl = signed?.signedUrl ?? "";

      const { error: insertErr } = await (supabase as any).from("inspection_photos").insert({
        user_id: user.id,
        inspection_id: id,
        inspection_item_id: input.itemId ?? null,
        official_date: inspection.data.official_date,
        storage_path: path,
        file_url: fileUrl,
        file_size: input.file.size,
        mime_type: input.file.type,
        caption: input.caption ?? null,
        room_name: input.roomName ?? null,
      });
      if (insertErr) throw insertErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-photos", id] });
      toast.success("Photo ajoutée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur upload"),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photo: InspectionPhoto) => {
      await supabase.storage.from("inspection-photos").remove([photo.storage_path]);
      const { error } = await (supabase as any)
        .from("inspection_photos")
        .delete()
        .eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection-photos", id] }),
  });

  const uploadSignature = useMutation({
    mutationFn: async (input: { type: "concierge" | "guest"; dataUrl: string; signerName?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) throw new Error("Inspection introuvable");
      const blob = await fetch(input.dataUrl).then((r) => r.blob());
      const path = `${user.id}/${id}/signatures/${input.type}_${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("inspection-photos")
        .upload(path, blob, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("inspection-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? "";
      const patch: any = input.type === "concierge"
        ? { concierge_signature_url: url, concierge_signer_name: input.signerName ?? null }
        : { guest_signature_url: url, guest_signer_name: input.signerName ?? null };
      const { error } = await (supabase as any)
        .from("property_inspections")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection", id] });
      toast.success("Signature enregistrée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur signature"),
  });

  const seedItems = useMutation({
    mutationFn: async (rooms: { name: string; items: { name: string; category?: string }[] }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) throw new Error("Inspection introuvable");
      const rows: any[] = [];
      let order = 0;
      for (const r of rooms) {
        for (const it of r.items) {
          rows.push({
            inspection_id: id,
            user_id: user.id,
            room_name: r.name,
            item_name: it.name,
            category: it.category ?? null,
            condition: "good",
            display_order: order++,
          });
        }
      }
      if (rows.length === 0) return;
      const { error } = await (supabase as any).from("inspection_items").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-items", id] });
      toast.success("Checklist initialisée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const updateItem = useMutation({
    mutationFn: async (input: { itemId: string; patch: Partial<InspectionItem> }) => {
      const { error } = await (supabase as any)
        .from("inspection_items")
        .update(input.patch)
        .eq("id", input.itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection-items", id] }),
  });

  const addItem = useMutation({
    mutationFn: async (input: { room_name: string; item_name: string; category?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) throw new Error("Inspection introuvable");
      const { error } = await (supabase as any).from("inspection_items").insert({
        inspection_id: id,
        user_id: user.id,
        room_name: input.room_name,
        item_name: input.item_name,
        category: input.category ?? null,
        condition: "good",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection-items", id] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase as any)
        .from("inspection_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection-items", id] }),
  });

  return { inspection, photos, items, audit, updateInspection, uploadPhoto, deletePhoto, uploadSignature, seedItems, updateItem, addItem, deleteItem };
}
