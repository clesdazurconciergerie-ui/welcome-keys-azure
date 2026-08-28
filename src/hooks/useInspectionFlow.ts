// MODULE — Parcours état des lieux : zones, anomalies, photos, signatures, verrouillage
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { INSPECTION_ZONES, ZoneStatus, buildInspectionReference } from "@/lib/inspection-zones";

export interface InspectionZone {
  id: string;
  inspection_id: string;
  zone_key: string;
  zone_label: string;
  status: ZoneStatus;
  note: string | null;
  display_order: number;
}

export interface InspectionIssue {
  id: string;
  inspection_id: string;
  zone_key: string;
  category: string;
  severity: string;
  comment: string | null;
  photo_urls: string[];
  created_at: string;
}

export interface InspectionZonePhoto {
  id: string;
  inspection_id: string;
  zone_key: string | null;
  media_type: string;
  file_url: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

async function requireUser() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Non authentifié");
  return user;
}

export function useInspectionFlow(inspectionId: string | undefined) {
  const qc = useQueryClient();
  const key = (n: string) => [n, inspectionId];

  const inspection = useQuery({
    queryKey: key("inspection-flow"),
    enabled: !!inspectionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("property_inspections")
        .select("*, property:property_id(name, address, city), booking:booking_id(check_in, check_out, guest_name, source)")
        .eq("id", inspectionId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const zones = useQuery({
    queryKey: key("inspection-zones"),
    enabled: !!inspectionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inspection_zones")
        .select("*")
        .eq("inspection_id", inspectionId)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as InspectionZone[];
    },
  });

  const issues = useQuery({
    queryKey: key("inspection-issues"),
    enabled: !!inspectionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inspection_issues")
        .select("*")
        .eq("inspection_id", inspectionId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((i: any) => ({ ...i, photo_urls: i.photo_urls ?? [] })) as InspectionIssue[];
    },
  });

  const photos = useQuery({
    queryKey: key("inspection-zone-photos"),
    enabled: !!inspectionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inspection_photos")
        .select("id, inspection_id, zone_key, media_type, file_url, storage_path, caption, created_at")
        .eq("inspection_id", inspectionId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as InspectionZonePhoto[];
    },
  });

  /** Crée les 7 zones si elles n'existent pas encore. */
  const ensureZones = useMutation({
    mutationFn: async () => {
      if (!inspectionId) return;
      const user = await requireUser();
      const existing = new Set((zones.data ?? []).map((z) => z.zone_key));
      const rows = INSPECTION_ZONES.filter((z) => !existing.has(z.key)).map((z, i) => ({
        inspection_id: inspectionId,
        user_id: user.id,
        zone_key: z.key,
        zone_label: z.label,
        status: "pending",
        display_order: INSPECTION_ZONES.findIndex((x) => x.key === z.key) + i * 0,
      }));
      if (rows.length === 0) return;
      const { error } = await (supabase as any).from("inspection_zones").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key("inspection-zones") }),
  });

  const setZone = useMutation({
    mutationFn: async (input: { zone_key: string; status?: ZoneStatus; note?: string | null }) => {
      const patch: any = {};
      if (input.status) patch.status = input.status;
      if (input.note !== undefined) patch.note = input.note;
      const { error } = await (supabase as any)
        .from("inspection_zones")
        .update(patch)
        .eq("inspection_id", inspectionId)
        .eq("zone_key", input.zone_key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key("inspection-zones") }),
    onError: (e: any) => toast.error(e.message ?? "Enregistrement impossible"),
  });

  const addIssue = useMutation({
    mutationFn: async (input: {
      zone_key: string; category: string; severity: string; comment?: string | null; photo_urls?: string[];
    }) => {
      const user = await requireUser();
      const { error } = await (supabase as any).from("inspection_issues").insert({
        inspection_id: inspectionId,
        user_id: user.id,
        zone_key: input.zone_key,
        category: input.category,
        severity: input.severity,
        comment: input.comment ?? null,
        photo_urls: input.photo_urls ?? [],
      });
      if (error) throw error;
      await (supabase as any)
        .from("inspection_zones")
        .update({ status: "issue" })
        .eq("inspection_id", inspectionId)
        .eq("zone_key", input.zone_key);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("inspection-issues") });
      qc.invalidateQueries({ queryKey: key("inspection-zones") });
      toast.success("Problème enregistré");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const deleteIssue = useMutation({
    mutationFn: async (issueId: string) => {
      const { error } = await (supabase as any).from("inspection_issues").delete().eq("id", issueId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key("inspection-issues") }),
  });

  const uploadZoneMedia = useMutation({
    mutationFn: async (input: { file: File; zone_key: string; caption?: string }) => {
      const user = await requireUser();
      if (!inspectionId) throw new Error("État des lieux introuvable");
      const ext = input.file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${inspectionId}/${input.zone_key}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("inspection-photos")
        .upload(path, input.file, { contentType: input.file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("inspection-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error } = await (supabase as any).from("inspection_photos").insert({
        inspection_id: inspectionId,
        user_id: user.id,
        zone_key: input.zone_key,
        media_type: input.file.type.startsWith("video") ? "video" : "photo",
        official_date: inspection.data?.official_date ?? new Date().toISOString().slice(0, 10),
        storage_path: path,
        file_url: signed?.signedUrl ?? "",
        file_size: input.file.size,
        mime_type: input.file.type,
        room_name: input.zone_key,
        caption: input.caption ?? null,
      });
      if (error) throw error;
      return signed?.signedUrl ?? "";
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("inspection-zone-photos") });
      toast.success("Média ajouté");
    },
    onError: (e: any) => toast.error(e.message ?? "Upload impossible"),
  });

  const deleteMedia = useMutation({
    mutationFn: async (photo: InspectionZonePhoto) => {
      await supabase.storage.from("inspection-photos").remove([photo.storage_path]);
      const { error } = await (supabase as any).from("inspection_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key("inspection-zone-photos") }),
  });

  const updateInspection = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await (supabase as any)
        .from("property_inspections")
        .update(patch)
        .eq("id", inspectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("inspection-flow") });
      qc.invalidateQueries({ queryKey: ["property-inspections"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const saveSignature = useMutation({
    mutationFn: async (input: { type: "concierge" | "guest"; dataUrl: string; signerName: string }) => {
      const user = await requireUser();
      if (!inspectionId) throw new Error("État des lieux introuvable");
      const blob = await fetch(input.dataUrl).then((r) => r.blob());
      const path = `${user.id}/${inspectionId}/signatures/${input.type}.png`;
      const { error: upErr } = await supabase.storage
        .from("inspection-photos")
        .upload(path, blob, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("inspection-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const patch: any = input.type === "concierge"
        ? { concierge_signature_url: signed?.signedUrl, concierge_signer_name: input.signerName }
        : { guest_signature_url: signed?.signedUrl, guest_signer_name: input.signerName };
      const { error } = await (supabase as any)
        .from("property_inspections")
        .update(patch)
        .eq("id", inspectionId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key("inspection-flow") }),
    onError: (e: any) => toast.error(e.message ?? "Signature impossible"),
  });

  /** Verrouille l'état des lieux : statut finalisé + horodatage + référence. */
  const finalize = useMutation({
    mutationFn: async () => {
      const user = await requireUser();
      const insp = inspection.data;
      if (!insp) throw new Error("État des lieux introuvable");
      const now = new Date().toISOString();
      const reference = insp.reference
        ?? buildInspectionReference(insp.inspection_type, insp.official_date, insp.id);
      const { error } = await (supabase as any).from("property_inspections").update({
        status: "validated",
        signed_at: now,
        locked_at: now,
        validated_at: now,
        validated_by: user.id,
        reference,
      }).eq("id", inspectionId);
      if (error) throw error;
      await (supabase as any).from("inspection_audit_log").insert({
        inspection_id: inspectionId,
        user_id: user.id,
        action: "finalized",
        changed_by: user.id,
        changed_by_name: user.email ?? null,
      });
      return reference as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("inspection-flow") });
      qc.invalidateQueries({ queryKey: ["property-inspections"] });
      toast.success("État des lieux finalisé");
    },
    onError: (e: any) => toast.error(e.message ?? "Finalisation impossible"),
  });

  return {
    inspection, zones, issues, photos,
    ensureZones, setZone, addIssue, deleteIssue,
    uploadZoneMedia, deleteMedia, updateInspection, saveSignature, finalize,
  };
}
