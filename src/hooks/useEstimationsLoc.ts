// MODULE — Estimation locative · accès données Supabase
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Estimation, EstimPhoto, EstimDocument, EstimComparable } from "@/lib/estimation-locative/types";

const db = supabase as any;

async function uid() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error("Session expirée — reconnecte-toi.");
  return id;
}

export function useEstimations() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["estim-list"],
    queryFn: async (): Promise<Estimation[]> => {
      const { data, error } = await db
        .from("estim_estimations")
        .select("*, owner:estim_owners(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Estimation[];
    },
  });

  const create = useMutation({
    mutationFn: async (): Promise<Estimation> => {
      const user_id = await uid();
      const { data: ref, error: refErr } = await db.rpc("next_estimation_reference");
      if (refErr) throw refErr;
      const { data, error } = await db
        .from("estim_estimations")
        .insert({ user_id, reference: ref, status: "draft" })
        .select("*")
        .single();
      if (error) throw error;
      return data as Estimation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estim-list"] }),
    onError: (e: any) => toast.error(e.message ?? "Création impossible"),
  });

  const duplicate = useMutation({
    mutationFn: async (source: Estimation) => {
      const user_id = await uid();
      const { data: ref } = await db.rpc("next_estimation_reference");
      const { id, created_at, updated_at, owner, reference, ...rest } = source as any;
      const { data, error } = await db
        .from("estim_estimations")
        .insert({ ...rest, user_id, reference: ref, status: "draft", report_url: null })
        .select("*")
        .single();
      if (error) throw error;
      return data as Estimation;
    },
    onSuccess: () => {
      toast.success("Estimation dupliquée");
      qc.invalidateQueries({ queryKey: ["estim-list"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Duplication impossible"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("estim_estimations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estimation supprimée");
      qc.invalidateQueries({ queryKey: ["estim-list"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Suppression impossible"),
  });

  return { list, create, duplicate, remove };
}

export function useEstimation(id?: string) {
  const qc = useQueryClient();
  const key = ["estim", id];

  const estimation = useQuery({
    queryKey: key,
    enabled: !!id,
    queryFn: async (): Promise<Estimation | null> => {
      const { data, error } = await db
        .from("estim_estimations")
        .select("*, owner:estim_owners(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as Estimation) ?? null;
    },
  });

  const photos = useQuery({
    queryKey: ["estim-photos", id],
    enabled: !!id,
    queryFn: async (): Promise<EstimPhoto[]> => {
      const { data } = await db
        .from("estim_photos").select("*").eq("estimation_id", id).order("position");
      return (data ?? []) as EstimPhoto[];
    },
  });

  const documents = useQuery({
    queryKey: ["estim-docs", id],
    enabled: !!id,
    queryFn: async (): Promise<EstimDocument[]> => {
      const { data } = await db
        .from("estim_documents").select("*").eq("estimation_id", id)
        .order("created_at", { ascending: false });
      return (data ?? []) as EstimDocument[];
    },
  });

  const comparables = useQuery({
    queryKey: ["estim-comps", id],
    enabled: !!id,
    queryFn: async (): Promise<EstimComparable[]> => {
      const { data } = await db
        .from("estim_comparables").select("*").eq("estimation_id", id)
        .order("similarity_score", { ascending: false });
      return (data ?? []) as EstimComparable[];
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      if (!id) throw new Error("Estimation inconnue");
      const { error } = await db.from("estim_estimations").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e.message ?? "Enregistrement impossible"),
  });

  const saveOwner = useMutation({
    mutationFn: async (owner: { first_name: string; last_name: string; email?: string | null; phone?: string | null }) => {
      const user_id = await uid();
      const current = estimation.data;
      if (current?.owner_id) {
        const { error } = await db.from("estim_owners").update(owner).eq("id", current.owner_id);
        if (error) throw error;
        return current.owner_id;
      }
      const { data, error } = await db
        .from("estim_owners").insert({ ...owner, user_id }).select("id").single();
      if (error) throw error;
      await db.from("estim_estimations").update({ owner_id: data.id }).eq("id", id);
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e.message ?? "Propriétaire non enregistré"),
  });

  const uploadPhotos = useMutation({
    mutationFn: async (files: File[]) => {
      const user_id = await uid();
      if (!id) throw new Error("Estimation inconnue");
      const base = photos.data?.length ?? 0;
      let i = 0;
      for (const file of files) {
        const path = `${user_id}/${id}/${Date.now()}_${i}_${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("estimation-photos").upload(path, file);
        if (upErr) throw upErr;
        const { error } = await db.from("estim_photos").insert({
          user_id, estimation_id: id, storage_path: path, file_name: file.name,
          position: base + i, is_cover: base + i === 0,
        });
        if (error) throw error;
        i++;
      }
    },
    onSuccess: () => {
      toast.success("Photos ajoutées");
      qc.invalidateQueries({ queryKey: ["estim-photos", id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Envoi des photos impossible"),
  });

  const updatePhoto = useMutation({
    mutationFn: async ({ photoId, patch }: { photoId: string; patch: Record<string, any> }) => {
      const { error } = await db.from("estim_photos").update(patch).eq("id", photoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estim-photos", id] }),
  });

  const setCover = useMutation({
    mutationFn: async (photoId: string) => {
      await db.from("estim_photos").update({ is_cover: false }).eq("estimation_id", id);
      const { error } = await db.from("estim_photos").update({ is_cover: true }).eq("id", photoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estim-photos", id] }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photo: EstimPhoto) => {
      await supabase.storage.from("estimation-photos").remove([photo.storage_path]);
      const { error } = await db.from("estim_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estim-photos", id] }),
  });

  const uploadRdna = useMutation({
    mutationFn: async (file: File) => {
      const user_id = await uid();
      if (!id) throw new Error("Estimation inconnue");
      const path = `${user_id}/${id}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("estimation-documents").upload(path, file);
      if (upErr) throw upErr;
      const { data: doc, error } = await db.from("estim_documents").insert({
        user_id, estimation_id: id, kind: "rdna", storage_path: path,
        file_name: file.name, status: "processing",
      }).select("*").single();
      if (error) throw error;

      // Extraction via la fonction existante parse-airdna-pdf (aucune valeur inventée).
      const base64 = await fileToBase64(file);
      const { data: parsed, error: fnErr } = await supabase.functions.invoke("parse-airdna-pdf", {
        body: { pdf_base64: base64 },
      });
      if (fnErr) {
        await db.from("estim_documents")
          .update({ status: "error", error_message: fnErr.message }).eq("id", doc.id);
        throw fnErr;
      }
      await db.from("estim_documents")
        .update({ status: "extracted", extracted: parsed ?? {} }).eq("id", doc.id);

      const rdna = mapRdna(parsed);
      await db.from("estim_estimations").update({ rdna_data: rdna }).eq("id", id);

      const comps = (parsed?.comparables ?? []) as any[];
      if (comps.length) {
        await db.from("estim_comparables").insert(
          comps.slice(0, 8).map((c) => ({
            user_id, estimation_id: id, source: "rdna", name: c.nom ?? null,
            bedrooms: c.chambres ?? null,
            displayed_price: c.adr_eur ?? c.adr ?? null,
            occupancy_pct: c.occupation_pct ?? null,
            annual_revenue: c.revenu_annuel_eur ?? null,
            data: c,
          })),
        );
      }
      return parsed;
    },
    onSuccess: () => {
      toast.success("Rapport RDNA importé et lu");
      qc.invalidateQueries({ queryKey: ["estim-docs", id] });
      qc.invalidateQueries({ queryKey: ["estim-comps", id] });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e.message ?? "Lecture du PDF impossible"),
  });

  const analyzePhotos = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Estimation inconnue");
      const items = photos.data ?? [];
      if (!items.length) throw new Error("Ajoute au moins une photo");
      const urls: string[] = [];
      for (const p of items.slice(0, 12)) {
        const { data } = await supabase.storage
          .from("estimation-photos").createSignedUrl(p.storage_path, 900);
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      const { data, error } = await supabase.functions.invoke("estimation-analyze-photos", {
        body: { estimation_id: id, image_urls: urls },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Analyse IA terminée");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e.message ?? "Analyse IA impossible"),
  });

  return {
    estimation, photos, documents, comparables,
    save, saveOwner, uploadPhotos, updatePhoto, setCover, deletePhoto,
    uploadRdna, analyzePhotos,
  };
}

function mapRdna(p: any) {
  if (!p) return {};
  return {
    market_score: p.market_score ?? null,
    chambres: p.chambres ?? null,
    sdb: p.sdb ?? null,
    voyageurs: p.voyageurs ?? null,
    adr_eur: p.adr_eur ?? p.adr ?? null,
    occupation_pct: p.occupation_pct ?? null,
    revenu_annuel_eur: p.revenu_annuel_eur ?? null,
    monthly_revenue: p.monthly_revenue ?? p.monthly_revenue_eur ?? [],
    extra: p,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
