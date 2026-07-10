import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProperties } from "@/hooks/useProperties";


// ────────────────────────────────────────────────────────────
// Wizard 5 étapes — Rapport de performance mensuelle Airbnb
// ────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, { label: string; unit?: string }> = {
  impressions: { label: "Impressions" },
  vues: { label: "Vues de la page" },
  taux_clic: { label: "Taux de clic", unit: "%" },
  taux_conversion: { label: "Taux de conversion", unit: "%" },
  reservations: { label: "Réservations" },
  revenus: { label: "Revenus", unit: "€" },
  nuits_reservees: { label: "Nuits réservées" },
  taux_occupation: { label: "Taux d'occupation", unit: "%" },
  prix_moyen_nuit: { label: "Prix moyen / nuit", unit: "€" },
  annulations: { label: "Annulations" },
};

const METRIC_KEYS = Object.keys(METRIC_LABELS);

type KpiField = { value: number | null; confidence: number; source: "extracted" | "manual" | "missing" };
type KpiState = Record<string, KpiField>;

const emptyKpi = (): KpiState =>
  Object.fromEntries(METRIC_KEYS.map((k) => [k, { value: null, confidence: 0, source: "missing" }])) as KpiState;

const STEPS = [
  { id: "selection", num: "01", label: "Sélection" },
  { id: "import", num: "02", label: "Import" },
  { id: "extraction", num: "03", label: "Extraction" },
  { id: "validation", num: "04", label: "Validation" },
  { id: "generation", num: "05", label: "Génération" },
] as const;

type StepId = typeof STEPS[number]["id"];

type UploadedFile = { path: string; name: string; previewUrl: string };

export default function AirbnbReportWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft");
  const initialProperty = searchParams.get("property") ?? "";
  const { properties, isLoading: loadingProps } = useProperties();

  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  // Étape 1
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Étape 2 / 3
  const [kpi, setKpi] = useState<KpiState>(emptyKpi());
  const [extracting, setExtracting] = useState(false);

  // Étape 4
  const [propertySlug, setPropertySlug] = useState<string>(initialProperty);
  const [periodMonth, setPeriodMonth] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7); // YYYY-MM
  });
  const [manual, setManual] = useState({
    commentaires_voyageurs: "",
    actions_conciergerie: "",
    objectif_type: "" as "" | "revenus" | "occupation",
    objectif_valeur: "" as string,
  });

  // Étape 5
  const [generating, setGenerating] = useState(false);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === propertySlug) || null,
    [propertySlug, properties],
  );

  const periodLabel = useMemo(() => {
    if (!periodMonth) return "";
    const [y, m] = periodMonth.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [periodMonth]);

  // Load draft if requested
  useEffect(() => {
    if (!draftId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("azurkeys_reports")
        .select("*")
        .eq("id", draftId)
        .maybeSingle();
      if (!data) return;
      setPropertySlug(data.property_slug);
      setPeriodMonth(data.period);
      const merged: KpiState = emptyKpi();
      for (const k of METRIC_KEYS) {
        const v = (data.kpi_data ?? {})[k];
        if (v && v.value !== null && v.value !== undefined) {
          merged[k] = { value: Number(v.value), confidence: Number(v.confidence ?? 1), source: v.source ?? "manual" };
        }
      }
      setKpi(merged);
      if (data.manual_data) setManual({ ...data.manual_data });
      toast.success("Brouillon chargé — ajoutez les captures Airbnb");
    })();
  }, [draftId]);

  useEffect(() => {
    return () => files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
  }, [files]);


  // ── UPLOAD ────────────────────────────────────────────────
  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Vous devez être connecté");
      setUploading(false);
      return;
    }
    try {
      const added: UploadedFile[] = [];
      for (const f of Array.from(fileList)) {
        if (!f.type.startsWith("image/")) continue;
        const cleaned = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}_${cleaned}`;
        const { error } = await supabase.storage.from("airbnb-screenshots").upload(path, f, { upsert: false });
        if (error) throw error;
        added.push({ path, name: f.name, previewUrl: URL.createObjectURL(f) });
      }
      setFiles((prev) => [...prev, ...added]);
      toast.success(`${added.length} capture(s) importée(s)`);
    } catch (e: any) {
      toast.error(`Import : ${e.message ?? "erreur"}`);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (path: string) => {
    await supabase.storage.from("airbnb-screenshots").remove([path]);
    setFiles((prev) => prev.filter((f) => f.path !== path));
  };

  // ── PREFILL depuis les données de conciergerie ────────────
  const prefillFromBookings = async (propertyId: string, period: string) => {
    if (!propertyId || !period) return;
    const [y, m] = period.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const firstDayStr = firstDay.toISOString().slice(0, 10);
    const lastDayStr = lastDay.toISOString().slice(0, 10);
    const daysInMonth = lastDay.getDate();

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("check_in, check_out, gross_amount")
      .eq("property_id", propertyId)
      .lte("check_in", lastDayStr)
      .gte("check_out", firstDayStr);
    if (error) {
      toast.error(`Pré-remplissage : ${error.message}`);
      return;
    }

    let revenus = 0, nuits = 0, reservations = 0;
    for (const b of bookings ?? []) {
      const s = new Date(Math.max(new Date(b.check_in).getTime(), firstDay.getTime()));
      const e = new Date(Math.min(new Date(b.check_out).getTime(), new Date(lastDay).setHours(23, 59, 59, 999)));
      const n = e > s ? Math.round((e.getTime() - s.getTime()) / 86400000) : 0;
      if (n > 0) {
        nuits += n;
        reservations += 1;
        const total = Math.max(1, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000));
        revenus += ((Number(b.gross_amount) || 0) * n) / total;
      }
    }
    const occupation = daysInMonth > 0 ? (nuits / daysInMonth) * 100 : 0;
    const prixMoyen = nuits > 0 ? revenus / nuits : 0;

    setKpi((prev) => ({
      ...prev,
      revenus: { value: Math.round(revenus), confidence: 1, source: "manual" },
      nuits_reservees: { value: nuits, confidence: 1, source: "manual" },
      reservations: { value: reservations, confidence: 1, source: "manual" },
      taux_occupation: { value: Number(occupation.toFixed(1)), confidence: 1, source: "manual" },
      prix_moyen_nuit: { value: nuits > 0 ? Math.round(prixMoyen) : null, confidence: nuits > 0 ? 1 : 0, source: nuits > 0 ? "manual" : "missing" },
    }));
    toast.success(`Pré-rempli depuis ${reservations} réservation${reservations > 1 ? "s" : ""}`);
  };

  // Auto-prefill when property or period changes (unless loading a draft)
  useEffect(() => {
    if (draftId) return;
    if (propertySlug && periodMonth) prefillFromBookings(propertySlug, periodMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertySlug, periodMonth, draftId]);

  // ── EXTRACTION ────────────────────────────────────────────
  const runExtraction = async () => {
    if (files.length === 0) {
      toast.error("Ajoutez au moins une capture");
      return;
    }
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-airbnb-stats", {
        body: { paths: files.map((f) => f.path) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Merge extracted values ONTO existing KPI (preserve prefilled values)
      setKpi((prev) => {
        const merged = { ...prev };
        for (const k of METRIC_KEYS) {
          const v = data.metrics?.[k];
          if (v && v.value !== null && v.value !== undefined) {
            merged[k] = { value: Number(v.value), confidence: Number(v.confidence ?? 0), source: "extracted" };
          }
        }
        return merged;
      });
      toast.success("Chiffres extraits");
      setStepIdx(3);
    } catch (e: any) {
      toast.error(`Extraction : ${e.message ?? "erreur"}`);
    } finally {
      setExtracting(false);
    }
  };

  // ── GÉNÉRATION ────────────────────────────────────────────
  const runGeneration = async () => {
    if (!selectedProperty) {
      toast.error("Sélectionnez un logement");
      return;
    }
    if (!periodMonth) {
      toast.error("Indiquez la période");
      return;
    }
    setGenerating(true);
    try {
      // Rapport précédent pour comparaison
      const [y, m] = periodMonth.split("-").map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      const { data: prevRow } = await (supabase as any)
        .from("azurkeys_reports")
        .select("period_label, kpi_data")
        .eq("property_slug", propertySlug)
        .eq("period", prevPeriod)
        .maybeSingle();

      const previous = prevRow
        ? {
            period_label: prevRow.period_label,
            kpi: Object.fromEntries(
              Object.entries((prevRow.kpi_data ?? {}) as KpiState).map(([k, v]) => [k, { value: v?.value ?? null }]),
            ),
          }
        : null;

      const { data, error } = await supabase.functions.invoke("generate-airbnb-report", {
        body: {
          property: { nom: selectedProperty.name, ville: selectedProperty.city ?? "", slug: selectedProperty.id },
          period_label: periodLabel,
          kpi,
          manual: {
            commentaires_voyageurs: manual.commentaires_voyageurs || undefined,
            actions_conciergerie: manual.actions_conciergerie || undefined,
            objectif_type: manual.objectif_type || null,
            objectif_valeur: manual.objectif_valeur ? Number(manual.objectif_valeur) : null,
          },
          previous,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { data: user } = await supabase.auth.getUser();
      const insertPayload = {
        property_slug: propertySlug,
        period: periodMonth,
        period_label: periodLabel,
        kpi_data: kpi,
        manual_data: manual,
        analysis_text: data.sections,
        screenshot_urls: files.map((f) => f.path),
        status: "completed",
        created_by: user.user?.id ?? null,
      };

      const { data: row, error: insertErr } = await (supabase as any)
        .from("azurkeys_reports")
        .upsert(insertPayload, { onConflict: "property_slug,period" })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      toast.success("Rapport généré");
      navigate(`/rapports/airbnb/${row.id}`);
    } catch (e: any) {
      toast.error(`Génération : ${e.message ?? "erreur"}`);
    } finally {
      setGenerating(false);
    }
  };

  // ── NAVIGATION ────────────────────────────────────────────
  const canNext = (): boolean => {
    if (step.id === "selection") return Boolean(propertySlug && periodMonth);
    if (step.id === "import") return true; // screenshots optional (prefilled data suffices)
    if (step.id === "extraction") return Object.values(kpi).some((v) => v.value !== null);
    return true;
  };

  const goNext = async () => {
    if (step.id === "extraction") {
      if (!Object.values(kpi).some((v) => v.value !== null)) {
        toast.error("Aucune donnée disponible");
        return;
      }
    }
    if (!canNext()) {
      toast.error("Complétez les champs obligatoires");
      return;
    }
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  };


  const goPrev = () => setStepIdx((i) => Math.max(0, i - 1));

  return (
    <div className="azurkeys-scope max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link to="/rapports" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--az-muted))] hover:text-[hsl(var(--az-ink))]">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour
        </Link>
        <p className="az-eyebrow">Nouveau rapport</p>
      </div>

      <h1 className="font-display text-4xl md:text-5xl mb-2">Rapport de performance Airbnb</h1>
      <p className="font-body text-[13px] text-[hsl(var(--az-muted))] mb-10">Sélectionnez un logement, on remplit ce qu'on peut. Vous ajoutez les captures Airbnb pour compléter.</p>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-10 border-b border-[hsl(var(--az-line))] pb-6">
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <div key={s.id} className="flex-1 flex flex-col items-center text-center">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[11px] font-body ${active ? "border-[hsl(var(--az-ink))] bg-[hsl(var(--az-ink))] text-[hsl(var(--az-sand))]" : done ? "border-[hsl(var(--az-gold))] text-[hsl(var(--az-gold))]" : "border-[hsl(var(--az-line))] text-[hsl(var(--az-muted))]"}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <p className={`mt-2 text-[10px] uppercase tracking-[0.2em] ${active ? "text-[hsl(var(--az-ink))]" : "text-[hsl(var(--az-muted))]"}`}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* STEP CONTENT */}
      <div className="az-card p-8 min-h-[380px]">
        {step.id === "selection" && (
          <StepComplement
            properties={properties}
            loadingProps={loadingProps}
            propertySlug={propertySlug}
            setPropertySlug={setPropertySlug}
            periodMonth={periodMonth}
            setPeriodMonth={setPeriodMonth}
            periodLabel={periodLabel}
            manual={manual}
            setManual={setManual}
            kpi={kpi}
          />
        )}
        {step.id === "import" && (
          <StepImport files={files} uploading={uploading} onFiles={handleFiles} onRemove={removeFile} />
        )}
        {step.id === "extraction" && (
          <StepExtraction files={files} extracting={extracting} onExtract={runExtraction} kpi={kpi} />
        )}
        {step.id === "validation" && (
          <StepValidation kpi={kpi} setKpi={setKpi} />
        )}
        {step.id === "generation" && (
          <StepGeneration property={selectedProperty} periodLabel={periodLabel} generating={generating} onGenerate={runGeneration} />
        )}
      </div>


      {/* NAV */}
      <div className="flex items-center justify-between mt-8">
        <button onClick={goPrev} disabled={stepIdx === 0} className="az-btn-ghost disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Précédent
        </button>
        {stepIdx < STEPS.length - 1 && (
          <button onClick={goNext} className="az-btn-primary">
            Suivant <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── STEP 1 : IMPORT ────────────────────────────────────────
function StepImport({ files, uploading, onFiles, onRemove }: {
  files: UploadedFile[];
  uploading: boolean;
  onFiles: (fl: FileList | null) => void;
  onRemove: (path: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div>
      <p className="az-eyebrow mb-3">Étape 1</p>
      <h2 className="font-display text-2xl mb-6">Importez vos captures d'écran Airbnb</h2>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
        className={`block border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${dragging ? "border-[hsl(var(--az-ink))] bg-[hsl(var(--az-sand))]" : "border-[hsl(var(--az-line))]"}`}
      >
        <input type="file" accept="image/*" multiple className="sr-only" style={{ opacity: 0, position: "absolute", pointerEvents: "none" }} onChange={(e) => onFiles(e.target.files)} />
        <Upload className="w-6 h-6 mx-auto mb-3 text-[hsl(var(--az-muted))]" strokeWidth={1.5} />
        <p className="font-body text-[13px] text-[hsl(var(--az-ink))]">{uploading ? "Import en cours…" : "Glissez vos captures ici ou cliquez pour sélectionner"}</p>
        <p className="font-body text-[11px] text-[hsl(var(--az-muted))] mt-2">Statistiques de conversion, réservations, revenus…</p>
      </label>

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {files.map((f) => (
            <div key={f.path} className="relative group border border-[hsl(var(--az-line))]">
              <img src={f.previewUrl} alt={f.name} className="w-full h-32 object-cover" />
              <button onClick={() => onRemove(f.path)} className="absolute top-1 right-1 bg-[hsl(var(--az-ink))] text-[hsl(var(--az-sand))] p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
              <p className="text-[10px] p-1 truncate font-body text-[hsl(var(--az-muted))]">{f.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── STEP 2 : EXTRACTION ────────────────────────────────────
function StepExtraction({ files, extracting, onExtract, kpi }: {
  files: UploadedFile[]; extracting: boolean; onExtract: () => void; kpi: KpiState;
}) {
  const hasResult = Object.values(kpi).some((v) => v.value !== null);
  return (
    <div>
      <p className="az-eyebrow mb-3">Étape 2</p>
      <h2 className="font-display text-2xl mb-2">Extraction automatique</h2>
      <p className="font-body text-[13px] text-[hsl(var(--az-muted))] mb-6">Une IA de vision lit vos {files.length} capture(s) et extrait les chiffres visibles. Aucun chiffre inventé.</p>

      {!hasResult && (
        <button onClick={onExtract} disabled={extracting} className="az-btn-primary">
          {extracting ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours…</> : <><Sparkles className="w-4 h-4" /> Lancer l'extraction</>}
        </button>
      )}

      {hasResult && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {METRIC_KEYS.map((k) => {
            const v = kpi[k];
            return (
              <div key={k} className="border border-[hsl(var(--az-line))] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--az-muted))]">{METRIC_LABELS[k].label}</p>
                <p className="font-display text-2xl mt-1">
                  {v.value !== null ? `${v.value}${METRIC_LABELS[k].unit ?? ""}` : "—"}
                </p>
                {v.value !== null && (
                  <p className={`text-[10px] mt-1 ${v.confidence < 0.7 ? "text-orange-600" : "text-[hsl(var(--az-muted))]"}`}>
                    Confiance {(v.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── STEP 3 : VALIDATION ────────────────────────────────────
function StepValidation({ kpi, setKpi }: { kpi: KpiState; setKpi: (k: KpiState) => void }) {
  const update = (key: string, value: string) => {
    const num = value === "" ? null : Number(value);
    setKpi({
      ...kpi,
      [key]: {
        value: Number.isNaN(num as number) ? null : num,
        confidence: 1,
        source: num === null ? "missing" : "manual",
      },
    });
  };
  return (
    <div>
      <p className="az-eyebrow mb-3">Étape 3</p>
      <h2 className="font-display text-2xl mb-2">Validation des chiffres</h2>
      <p className="font-body text-[13px] text-[hsl(var(--az-muted))] mb-6">Vérifiez et corrigez. Les cases orange sont à vérifier, les cases vides sont à compléter.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METRIC_KEYS.map((k) => {
          const v = kpi[k];
          const lowConf = v.source === "extracted" && v.confidence < 0.7;
          const missing = v.value === null;
          return (
            <div key={k}>
              <label className="az-label flex items-center justify-between">
                <span>{METRIC_LABELS[k].label}{METRIC_LABELS[k].unit ? ` (${METRIC_LABELS[k].unit})` : ""}</span>
                {lowConf && <span className="text-[9px] text-orange-600 normal-case tracking-normal">à vérifier</span>}
                {missing && <span className="text-[9px] text-[hsl(var(--az-muted))] normal-case tracking-normal">donnée manquante</span>}
              </label>
              <input
                type="number"
                step="any"
                className={`az-input ${lowConf ? "border-orange-400" : ""}`}
                value={v.value ?? ""}
                onChange={(e) => update(k, e.target.value)}
                placeholder="à compléter"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── STEP 1 : SÉLECTION + CONTEXTE (avec pré-remplissage) ──
function StepComplement({ properties, loadingProps, propertySlug, setPropertySlug, periodMonth, setPeriodMonth, periodLabel, manual, setManual, kpi }: any) {
  const filled = propertySlug && periodMonth
    ? METRIC_KEYS.filter((k) => kpi?.[k]?.value !== null && kpi?.[k]?.value !== undefined)
    : [];
  return (
    <div>
      <p className="az-eyebrow mb-3">Étape 1</p>
      <h2 className="font-display text-2xl mb-2">Sélectionnez le logement</h2>
      <p className="font-body text-[13px] text-[hsl(var(--az-muted))] mb-6">
        On pré-remplit automatiquement les revenus, nuitées, réservations, occupation et prix moyen depuis votre conciergerie.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="az-label">Logement</label>
          <select className="az-input" value={propertySlug} onChange={(e) => setPropertySlug(e.target.value)} disabled={loadingProps}>
            <option value="">— Sélectionnez —</option>
            {properties.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}{p.city ? ` — ${p.city}` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="az-label">Période (mois)</label>
          <input type="month" className="az-input" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} />
          {periodLabel && <p className="text-[11px] text-[hsl(var(--az-muted))] mt-1 capitalize">{periodLabel}</p>}
        </div>
      </div>

      {propertySlug && periodMonth && (
        <div className="border border-[hsl(var(--az-line))] p-4 mb-6 bg-[hsl(var(--az-sand))]">
          <p className="az-eyebrow mb-3">Pré-rempli automatiquement</p>
          {filled.length === 0 ? (
            <p className="font-body text-[12px] text-[hsl(var(--az-muted))]">Aucune réservation trouvée pour cette période. Tout sera à saisir manuellement.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filled.map((k) => (
                <div key={k}>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--az-muted))]">{METRIC_LABELS[k].label}</p>
                  <p className="font-display text-lg">{kpi[k].value}{METRIC_LABELS[k].unit ?? ""}</p>
                </div>
              ))}
            </div>
          )}
          <p className="font-body text-[11px] text-[hsl(var(--az-muted))] mt-3">
            Les autres indicateurs (impressions, vues, taux de clic, conversion, annulations) viendront de vos captures Airbnb à l'étape suivante.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="az-label">Objectif (optionnel)</label>
          <div className="flex gap-2">
            <select className="az-input" value={manual.objectif_type} onChange={(e) => setManual({ ...manual, objectif_type: e.target.value })}>
              <option value="">Aucun</option>
              <option value="revenus">Revenus (€)</option>
              <option value="occupation">Occupation (%)</option>
            </select>
            <input type="number" className="az-input" value={manual.objectif_valeur} onChange={(e) => setManual({ ...manual, objectif_valeur: e.target.value })} placeholder="valeur" disabled={!manual.objectif_type} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="az-label">Commentaires voyageurs marquants</label>
        <textarea className="az-input" rows={3} value={manual.commentaires_voyageurs} onChange={(e) => setManual({ ...manual, commentaires_voyageurs: e.target.value })} placeholder="Retours, remarques, éloges…" />
      </div>

      <div>
        <label className="az-label">Actions réalisées par la conciergerie</label>
        <textarea className="az-input" rows={3} value={manual.actions_conciergerie} onChange={(e) => setManual({ ...manual, actions_conciergerie: e.target.value })} placeholder="Optimisations, interventions, améliorations…" />
      </div>
    </div>
  );
}


// ── STEP 5 : GÉNÉRATION ────────────────────────────────────
function StepGeneration({ property, periodLabel, generating, onGenerate }: any) {
  return (
    <div className="text-center py-6">
      <p className="az-eyebrow mb-3">Étape 5</p>
      <h2 className="font-display text-3xl mb-4">Prêt à générer</h2>
      <p className="font-body text-[13px] text-[hsl(var(--az-muted))] mb-2">Logement : <strong>{property?.name ?? "—"}</strong></p>
      <p className="font-body text-[13px] text-[hsl(var(--az-muted))] mb-8 capitalize">Période : {periodLabel}</p>
      <button onClick={onGenerate} disabled={generating} className="az-btn-primary">
        {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</> : <><Sparkles className="w-4 h-4" /> Générer le rapport</>}
      </button>
      <p className="font-body text-[11px] text-[hsl(var(--az-muted))] mt-6 max-w-md mx-auto">L'IA rédige le rapport uniquement à partir des données que vous avez validées. Aucun chiffre inventé.</p>
    </div>
  );
}
