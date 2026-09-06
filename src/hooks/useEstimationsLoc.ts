// MODULE — Estimation locative · accès données Supabase
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Estimation, EstimPhoto, EstimDocument, EstimComparable } from "@/lib/estimation-locative/types";
import { runEngine, type EngineInput } from "@/lib/estimation-locative/engine";
import type { ComparableInput } from "@/lib/estimation-locative/engine-types";
import {
  normalizeAiPayload, resolveFacts, factsToFeatures, toEngineAiScores,
  selectReportPhotos, buildPropertySummary, normalizeRdnaExtraction, rdnaToEngineData,
} from "@/lib/estimation-locative/ai-analysis";
import {
  buildMarketSnapshot, computeDataQuality, contrastSources, normalizeWebCandidate,
  selectComparables, toEngineMarketPayload, normalizePoolKind, normalizeViewKind,
  normalizeParkingKind, normalizeAcKind, normalizeExteriorKind, phraseNuisance,
  INSUFFICIENT_WEB_MESSAGE,
  type MarketComparable, type SubjectProfile,
} from "@/lib/estimation-locative/market-research";

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

      // §15/§16 — extraction fidèle conservée (valeur, devise, unité, page), et
      // vue convertie pour le moteur, la conversion étant explicite.
      const extraction = normalizeRdnaExtraction(
        (parsed as any)?.raw_extraction ?? {},
        { file_name: file.name, storage_path: path },
      );
      const rdna = { ...mapRdna(parsed), ...rdnaToEngineData(extraction, 0.92), extraction };
      await db.from("estim_estimations").update({ rdna_data: rdna }).eq("id", id);
      await db.from("estim_documents")
        .update({ raw_extraction: extraction as any }).eq("id", doc.id);

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

  /**
   * §2 à §24 — analyse IA du logement.
   * L'IA observe : ses sorties sont normalisées ici, confrontées à la saisie,
   * puis transmises au moteur. En cas d'échec, rien n'est effacé (§27).
   */
  const analyzePhotos = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Estimation inconnue");
      const est = estimation.data;
      const items = photos.data ?? [];
      if (!items.length) throw new Error("Ajoute au moins une photo avant de lancer l'analyse.");

      await db.from("estim_estimations").update({ ai_status: "running", ai_error: null }).eq("id", id);
      qc.invalidateQueries({ queryKey: key });

      const withUrls: { id: string; url: string; category?: string | null }[] = [];
      for (const p of items.slice(0, 24)) {
        const { data } = await supabase.storage
          .from("estimation-photos").createSignedUrl(p.storage_path, 1800);
        if (data?.signedUrl) withUrls.push({ id: p.id, url: data.signedUrl, category: p.category });
      }
      if (!withUrls.length) throw new Error("Impossible d'accéder aux photos.");

      const rdna = (est?.rdna_data ?? {}) as any;
      const { data, error } = await supabase.functions.invoke("estimation-analyze-photos", {
        body: {
          estimation_id: id,
          photos: withUrls,
          context: {
            features: est?.features ?? {},
            location: est?.location_data ?? {},
            address: est?.address ?? null,
            city: est?.city ?? null,
            property_type: est?.property_type ?? null,
            amenity_penetration: rdna.amenity_penetration ?? {},
          },
        },
      });

      if (error || data?.error) {
        const message = data?.error ?? error?.message ?? "Analyse IA impossible";
        await db.from("estim_estimations")
          .update({ ai_status: "failed", ai_error: String(message).slice(0, 500) }).eq("id", id);
        throw new Error(message);
      }

      const payload = normalizeAiPayload(data.raw, {
        photos_analyzed: data.photos_analyzed ?? 0,
        photos_failed: data.photos_failed ?? 0,
        errors: data.errors ?? [],
      });

      const facts = resolveFacts({
        features: (est?.features ?? {}) as any,
        ai: payload,
        rdna,
        overrides: (est?.manual_overrides ?? {}) as any,
      });

      // Notes par photo + sélection automatique pour le futur rapport (§6).
      const scoreById = new Map(payload.photo_scores.map((s) => [s.photo_id, s]));
      const selection = selectReportPhotos(
        items.map((p) => {
          const s = scoreById.get(p.id);
          return {
            id: p.id, category: s?.category ?? p.category,
            aesthetic: s?.aesthetic ?? null, technical: s?.technical ?? null,
            importance: s?.importance ?? null, usable: s?.usable,
          };
        }),
        ((est as any)?.report_photo_selection ?? {}) as Record<string, boolean>,
      );
      for (const sel of selection) {
        const s = scoreById.get(sel.id);
        await db.from("estim_photos").update({
          aesthetic_score: s?.aesthetic ?? null,
          technical_score: s?.technical ?? null,
          importance_score: s?.importance ?? null,
          quality_score: sel.score,
          ai_usable: s?.usable ?? null,
          selected_for_report: sel.selected,
          ai_analysis: s ?? {},
        }).eq("id", sel.id);
      }

      const incomplete = payload.photos_failed > 0 || payload.errors.length > 0;
      const { error: upErr } = await db.from("estim_estimations").update({
        ai_analysis: payload as any,
        ai_scores: toEngineAiScores(payload) as any,
        ai_facts: { facts } as any,
        ai_summary: buildPropertySummary(payload, facts) as any,
        ai_analyzed_at: new Date().toISOString(),
        // §27 : une analyse partielle n'est pas déclarée terminée.
        ai_status: incomplete ? "partial" : "done",
        ai_error: incomplete ? payload.errors.join(" · ").slice(0, 500) : null,
        status: est?.status === "draft" ? "analyzed" : est?.status,
      }).eq("id", id);
      if (upErr) throw upErr;

      return { payload, incomplete };
    },
    onSuccess: (res) => {
      toast[res.incomplete ? "warning" : "success"](
        res.incomplete
          ? "Analyse partielle : certaines photos n'ont pas pu être analysées."
          : "Analyse du logement terminée",
      );
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["estim-photos", id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Analyse IA impossible"),
  });

  /** §6 — l'utilisateur garde la main sur les photos du rapport. */
  const togglePhotoSelection = useMutation({
    mutationFn: async ({ photoId, selected }: { photoId: string; selected: boolean }) => {
      if (!id) throw new Error("Estimation inconnue");
      const current = { ...(((estimation.data as any)?.report_photo_selection ?? {}) as Record<string, boolean>) };
      current[photoId] = selected;
      await db.from("estim_estimations").update({ report_photo_selection: current }).eq("id", id);
      const { error } = await db.from("estim_photos").update({ selected_for_report: selected }).eq("id", photoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["estim-photos", id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Sélection non enregistrée"),
  });

  /** §20 — correction manuelle d'une caractéristique observée. */
  const overrideFact = useMutation({
    mutationFn: async ({ factKey, value }: { factKey: string; value: unknown }) => {
      if (!id) throw new Error("Estimation inconnue");
      const est = estimation.data;
      const current = { ...(((est?.manual_overrides ?? {}) as any)) };
      const field = `fact.${factKey}`;
      if (value === null || value === undefined || value === "") delete current[field];
      else current[field] = { value, at: new Date().toISOString() };

      const facts = resolveFacts({
        features: (est?.features ?? {}) as any,
        ai: (est?.ai_analysis ?? null) as any,
        rdna: (est?.rdna_data ?? {}) as any,
        overrides: current,
      });
      const { error } = await db.from("estim_estimations").update({
        manual_overrides: current,
        ai_facts: { facts } as any,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e.message ?? "Correction non enregistrée"),
  });

  /** §33 — exécution du moteur : les résultats sont recalculés, jamais devinés. */
  const compute = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Estimation inconnue");
      const est = estimation.data;
      if (!est) throw new Error("Estimation non chargée");
      const input: EngineInput = {
        city: est.city, district: est.district, property_type: est.property_type,
        lat: est.lat, lng: est.lng,
        location_data: est.location_data ?? {},
        // §23 — le moteur reçoit les caractéristiques résolues (saisie > IA), pas l'IA brute.
        features: factsToFeatures(
          (est.features ?? {}) as Record<string, unknown>,
          resolveFacts({
            features: (est.features ?? {}) as any,
            ai: (est.ai_analysis ?? null) as any,
            rdna: (est.rdna_data ?? {}) as any,
            overrides: (est.manual_overrides ?? {}) as any,
          }),
        ),
        constraints: est.constraints ?? {},
        ai_scores: { ...(est.ai_scores ?? {}), ...toEngineAiScores((est.ai_analysis ?? null) as any) },
        ai_analysis: est.ai_analysis ?? {},
        rdna_data: est.rdna_data ?? {},
        market_data: est.market_data ?? {},
        photos_count: photos.data?.length ?? 0,
        comparables: (comparables.data ?? []).map(toComparableInput),
      };

      // §26 — les données externes alimentent le moteur (comparables retenus et
      // taux d'équipement observés) sans modifier le moindre coefficient.
      const subjectProfile = buildSubjectProfile(est);
      const market = toEngineMarketPayload(
        subjectProfile,
        (comparables.data ?? []).map(toMarketComparable),
      );
      const primaryIds = new Set(market.comparables.map((c) => c.id));
      input.comparables = input.comparables.map((c) => ({
        ...c, excluded: c.excluded || !primaryIds.has(c.id),
      }));
      input.market_data = {
        ...(est.market_data ?? {}),
        amenity_penetration: {
          ...((est.rdna_data as any)?.amenity_penetration ?? {}),
          ...market.amenity_penetration,
        },
        snapshot: market.snapshot,
      };

      const output = runEngine(input, (est as any).engine_params);

      // Persistance des scores de similarité sur chaque comparable (traçabilité).
      for (const c of output.comparables) {
        await db.from("estim_comparables").update({
          similarity_score: c.score, weight: c.weight,
          outlier: c.outlier, similarity_detail: c.detail,
        }).eq("id", c.id);
      }

      const { error } = await db.from("estim_estimations").update({
        engine_output: output,
        engine_version: output.version,
        computed_at: output.computed_at,
        confidence_score: output.confidence.score,
        results: toResults(output),
        seasonality: { source: output.trace.find((t) => t.step === "Saisonnalité")?.detail ?? null },
        market_data: { ...input.market_data, baseline_adr: output.market.baseline_adr.value },
        data_quality_score: market.data_quality.score,
        status: output.status === "ok" ? "analyzed" : est.status,
      }).eq("id", id);
      if (error) throw error;
      return output;
    },
    onSuccess: (out) => {
      toast[out.status === "ok" ? "success" : "warning"](
        out.status === "ok" ? "Estimation calculée" : "Données insuffisantes — rien n'a été inventé",
      );
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["estim-comps", id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Calcul impossible"),
  });

  /** §27 — correction manuelle d'une valeur calculée (la valeur d'origine est conservée). */
  const setOverride = useMutation({
    mutationFn: async ({ field, value, computed }: { field: string; value: number | null; computed: number | null }) => {
      if (!id) throw new Error("Estimation inconnue");
      const current = { ...((estimation.data?.manual_overrides as any) ?? {}) };
      if (value === null || Number.isNaN(value)) delete current[field];
      else current[field] = { value, computed, at: new Date().toISOString() };
      const { error } = await db.from("estim_estimations").update({ manual_overrides: current }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e.message ?? "Correction non enregistrée"),
  });

  return {
    estimation, photos, documents, comparables,
    save, saveOwner, uploadPhotos, updatePhoto, setCover, deletePhoto,
    uploadRdna, analyzePhotos, compute, setOverride, togglePhotoSelection, overrideFact,
    researchMarket, addComparable, updateComparable, deleteComparable,
    marketView: buildMarketView(estimation.data, comparables.data ?? []),
  };
}

/** Mise à plat d'une ligne `estim_comparables` vers l'entrée du moteur. */
function toComparableInput(c: any): ComparableInput {
  const d = c.data ?? {};
  return {
    id: c.id,
    name: c.name,
    source: c.source,
    excluded: !!c.excluded,
    adr: c.displayed_price ?? d.adr_eur ?? d.adr ?? null,
    currency: d.currency ?? c.currency ?? "EUR",
    occupancy_pct: c.occupancy_pct ?? d.occupation_pct ?? null,
    annual_revenue: c.annual_revenue ?? null,
    bedrooms: c.bedrooms ?? d.chambres ?? null,
    capacity: c.capacity ?? d.voyageurs ?? null,
    bathrooms: d.sdb ?? d.salles_de_bain ?? null,
    surface_m2: d.surface_m2 ?? null,
    property_type: d.type ?? d.property_type ?? null,
    city: d.ville ?? d.city ?? null,
    district: d.quartier ?? d.district ?? null,
    distance_m: d.distance_m ?? null,
    pool: d.piscine ?? d.pool ?? null,
    parking: d.parking ?? null,
    view: d.vue ?? d.view ?? null,
    exterior: d.exterieur ?? d.exterior ?? null,
    ac: d.climatisation ?? d.ac ?? null,
    standing: d.standing ?? null,
    amenities: d.equipements ?? d.amenities ?? [],
    distance_sea_m: d.distance_mer_m ?? null,
  };
}

/** Résumé stocké dans `results` — sert de socle au futur rapport propriétaire (§32). */
function toResults(out: any) {
  const s = (k: string) => ({
    label: out.seasons[k].label,
    prix_recommande: out.seasons[k].price_recommended,
    prix_min: out.seasons[k].price_min,
    prix_max: out.seasons[k].price_max,
    occupation_pct: out.seasons[k].occupancy_pct,
  });
  return {
    basse: s("basse"), moyenne: s("moyenne"), haute: s("haute"),
    annuel: {
      nuits_commercialisables: out.annual.nights_sellable,
      occupation_pct: out.annual.occupancy_pct,
      adr_moyen: out.annual.adr_weighted,
      ca_annuel: out.annual.revenue,
    },
    engine_version: out.version,
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
