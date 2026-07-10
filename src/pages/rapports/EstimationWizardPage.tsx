import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import "@/styles/estimation-scope.css";
import { useEstimationForm } from "@/lib/estimation/state";
import {
  bienSchema,
  contactSchema,
  equipementSchema,
  exterieurSchema,
  localisationSchema,
  photosSchema,
  strategieSchema,
  type PhotoItem,
} from "@/lib/estimation/types";
import type { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Wizard 8 étapes (7 obligatoires + données marché optionnelle).
// Chaque étape valide localement via zod ; on n'avance que si OK.
// ─────────────────────────────────────────────────────────────

type StepId =
  | "contact" | "localisation" | "bien" | "exterieur"
  | "equipement" | "strategie" | "donnees_marche" | "photos";

const STEPS: { id: StepId; label: string; num: string }[] = [
  { id: "contact",        num: "01", label: "Contact" },
  { id: "localisation",   num: "02", label: "Localisation" },
  { id: "bien",           num: "03", label: "Bien" },
  { id: "exterieur",      num: "04", label: "Extérieur" },
  { id: "equipement",     num: "05", label: "Équipement" },
  { id: "strategie",      num: "06", label: "Stratégie" },
  { id: "donnees_marche", num: "07", label: "Données marché" },
  { id: "photos",         num: "08", label: "Photos" },
];

export default function EstimationWizardPage() {
  const navigate = useNavigate();
  const { data, patch, reset } = useEstimationForm();
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  const validators: Partial<Record<StepId, () => z.SafeParseReturnType<unknown, unknown>>> = {
    contact:      () => contactSchema.safeParse(data.contact),
    localisation: () => localisationSchema.safeParse(data.localisation),
    bien:         () => bienSchema.safeParse(data.bien),
    exterieur:    () => exterieurSchema.safeParse(data.exterieur),
    equipement:   () => equipementSchema.safeParse(data.equipement),
    strategie:    () => strategieSchema.safeParse(data.strategie),
    photos:       () => photosSchema.safeParse(data.photos),
    // donnees_marche : optionnelle, aucun blocage.
  };

  const next = () => {
    const v = validators[step.id];
    if (v) {
      const res = v();
      if (!res.success) {
        const first = res.error.issues[0];
        toast.error(first?.message ?? "Champs invalides");
        return;
      }
    }
    if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
    else finish();
  };
  const prev = () => stepIdx > 0 && setStepIdx((i) => i - 1);

  const finish = () => {
    // Validation finale — on rejoue TOUS les schémas pour être sûrs.
    for (const s of STEPS) {
      const v = validators[s.id];
      if (v) {
        const res = v();
        if (!res.success) {
          setStepIdx(STEPS.indexOf(s));
          toast.error(`${s.label} : ${res.error.issues[0]?.message ?? "invalide"}`);
          return;
        }
      }
    }
    // Calcul déterministe côté client (miroir back = phase 4).
    import("@/lib/estimation/engine").then(({ estimate }) => {
      const result = estimate(data);
      const id = crypto.randomUUID();
      const payload = { id, form: data, result, generatedAt: new Date().toISOString() };
      // Clé unique lue par EstimationReportPage (voir loadPayload).
      try {
        sessionStorage.setItem("estimation:last", JSON.stringify(payload));
      } catch {
        // Photos trop volumineuses → on retire les photos et on retente.
        const slim = { ...payload, form: { ...data, photos: { items: [] } } };
        try { sessionStorage.setItem("estimation:last", JSON.stringify(slim)); }
        catch { toast.error("Impossible de stocker l'estimation (mémoire insuffisante)"); return; }
        toast.warning("Photos trop volumineuses pour l'aperçu — rapport généré sans galerie.");
      }
      navigate(`/rapports/estimation/${id}`);
    });
  };

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [stepIdx]);

  return (
    <div className="estim-scope min-h-[70vh]">
      <div className="max-w-2xl mx-auto py-12 px-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-10">
          <Link
            to="/rapports"
            className="e-eyebrow inline-flex items-center gap-2 hover:text-[color:var(--e-ink)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            Retour
          </Link>
          <button
            onClick={() => { if (confirm("Réinitialiser tout le formulaire ?")) reset(); }}
            className="e-eyebrow hover:text-[color:var(--e-ink)] transition-colors"
          >
            Réinitialiser
          </button>
        </div>

        <p className="e-eyebrow mb-3">Nouvelle estimation · {step.num} / {STEPS.length.toString().padStart(2, "0")}</p>
        <h1 className="text-4xl md:text-5xl mb-2">{step.label}</h1>
        <hr className="e-hairline my-8" />

        {/* Contenu de l'étape */}
        <StepContent step={step.id} data={data} patch={patch} />

        {/* Navigation */}
        <hr className="e-hairline my-10" />
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            disabled={stepIdx === 0}
            className="e-btn e-btn-ghost"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            Précédent
          </button>
          <button onClick={next} className="e-btn">
            {stepIdx === STEPS.length - 1 ? "Générer" : "Suivant"}
            {stepIdx === STEPS.length - 1
              ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
              : <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />}
          </button>
        </div>

        {/* Progression */}
        <div className="mt-10 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className="h-[2px] flex-1 transition-colors"
              style={{ background: i <= stepIdx ? "var(--e-ink)" : "var(--e-line)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composants primitifs (filet bas, éditoriaux).
// ─────────────────────────────────────────────────────────────
type Patch = ReturnType<typeof useEstimationForm>["patch"];
type Data = ReturnType<typeof useEstimationForm>["data"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-6">
      <span className="e-label block mb-2">{label}</span>
      {children}
    </label>
  );
}
function Text({
  value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="e-field"
    />
  );
}
function Num({
  value, onChange, min, max, placeholder,
}: { value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; placeholder?: string }) {
  return (
    <input
      type="number" value={value ?? ""} min={min} max={max} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="e-field"
    />
  );
}
function Select<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="text-left px-4 py-3 border transition-colors"
            style={{
              borderColor: active ? "var(--e-ink)" : "var(--e-line)",
              background: active ? "var(--e-ink)" : "transparent",
              color: active ? "var(--e-paper)" : "var(--e-ink)",
              fontFamily: "var(--e-body)",
              fontSize: 13,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
function Toggle({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between px-4 py-3 border transition-colors mb-3"
      style={{
        borderColor: value ? "var(--e-ink)" : "var(--e-line)",
        background: value ? "var(--e-ink)" : "transparent",
        color: value ? "var(--e-paper)" : "var(--e-ink)",
        fontFamily: "var(--e-body)", fontSize: 13,
      }}
    >
      <span>{label}</span>
      <span style={{ opacity: value ? 1 : 0.4 }}>{value ? "OUI" : "NON"}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Contenu des étapes.
// ─────────────────────────────────────────────────────────────
function StepContent({ step, data, patch }: { step: StepId; data: Data; patch: Patch }) {
  switch (step) {
    case "contact":
      return (
        <div>
          <Field label="Nom">
            <Text value={data.contact.nom} onChange={(v) => patch("contact", { nom: v })} placeholder="Nom du propriétaire" />
          </Field>
          <Field label="Email">
            <Text type="email" value={data.contact.email} onChange={(v) => patch("contact", { email: v })} placeholder="nom@exemple.com" />
          </Field>
          <Field label="Téléphone">
            <Text type="tel" value={data.contact.telephone} onChange={(v) => patch("contact", { telephone: v })} placeholder="06 __ __ __ __" />
          </Field>
        </div>
      );

    case "localisation":
      return (
        <div>
          <Field label="Adresse">
            <Text value={data.localisation.adresse} onChange={(v) => patch("localisation", { adresse: v })} placeholder="12 avenue de la Corniche" />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Ville">
              <Text value={data.localisation.ville} onChange={(v) => patch("localisation", { ville: v })} />
            </Field>
            <Field label="Code postal">
              <Text value={data.localisation.code_postal} onChange={(v) => patch("localisation", { code_postal: v })} />
            </Field>
            <Field label="Quartier">
              <Text value={data.localisation.quartier} onChange={(v) => patch("localisation", { quartier: v })} placeholder="Boulouris" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plage (mètres)">
              <Num value={data.localisation.distance_plage_m} onChange={(v) => patch("localisation", { distance_plage_m: v })} min={0} placeholder="200" />
            </Field>
            <Field label="Commerces (mètres)">
              <Num value={data.localisation.distance_commerces_m} onChange={(v) => patch("localisation", { distance_commerces_m: v })} min={0} placeholder="500" />
            </Field>
          </div>
          <p className="text-xs e-italic text-[color:var(--e-text-soft)] mt-2">
            Le géocodage automatique (lat/lng) sera lancé en phase 8. Non simulé pour l'instant.
          </p>
        </div>
      );

    case "bien":
      return (
        <div>
          <Field label="Type de bien">
            <Select value={data.bien.type} onChange={(v) => patch("bien", { type: v })}
              options={[
                { value: "bien_entier", label: "Bien entier" },
                { value: "partie_villa", label: "Partie de villa" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Surface (m²)">
              <Num value={data.bien.surface_m2} onChange={(v) => patch("bien", { surface_m2: v ?? 0 })} min={10} />
            </Field>
            <Field label="Voyageurs">
              <Num value={data.bien.voyageurs} onChange={(v) => patch("bien", { voyageurs: v ?? 1 })} min={1} />
            </Field>
            <Field label="Chambres">
              <Num value={data.bien.chambres} onChange={(v) => patch("bien", { chambres: v ?? 0 })} min={0} />
            </Field>
            <Field label="Salles de bain">
              <Num value={data.bien.sdb} onChange={(v) => patch("bien", { sdb: v ?? 0 })} min={0} />
            </Field>
            <Field label="Étage">
              <Num value={data.bien.etage} onChange={(v) => patch("bien", { etage: v })} placeholder="RDC = 0" />
            </Field>
            <Field label="Ascenseur">
              <Toggle label="Présent" value={data.bien.ascenseur} onChange={(v) => patch("bien", { ascenseur: v })} />
            </Field>
          </div>
        </div>
      );

    case "exterieur":
      return (
        <div>
          <Field label="Type d'extérieur">
            <Select value={data.exterieur.type} onChange={(v) => patch("exterieur", { type: v })}
              options={[
                { value: "aucun",    label: "Aucun" },
                { value: "balcon",   label: "Balcon" },
                { value: "terrasse", label: "Terrasse" },
                { value: "jardin",   label: "Jardin" },
              ]}
            />
          </Field>
          <Field label="Surface extérieure (m²)">
            <Num value={data.exterieur.surface_m2} onChange={(v) => patch("exterieur", { surface_m2: v })} min={0} placeholder="Optionnel" />
          </Field>
          <Field label="Vue">
            <Select value={data.exterieur.vue} onChange={(v) => patch("exterieur", { vue: v })}
              options={[
                { value: "aucune",         label: "Aucune" },
                { value: "degagee",        label: "Dégagée" },
                { value: "mer_partielle",  label: "Mer partielle" },
                { value: "mer_totale",     label: "Mer totale" },
                { value: "exceptionnelle", label: "Exceptionnelle" },
              ]}
            />
          </Field>
          <Field label="Piscine">
            <Select value={data.exterieur.piscine} onChange={(v) => patch("exterieur", { piscine: v })}
              options={[
                { value: "aucune",     label: "Aucune" },
                { value: "collective", label: "Collective" },
                { value: "privee",     label: "Privée" },
              ]}
            />
          </Field>
          <Toggle label="Parking / stationnement" value={data.exterieur.parking} onChange={(v) => patch("exterieur", { parking: v })} />
        </div>
      );

    case "equipement":
      return (
        <div>
          <Toggle label="Climatisation" value={data.equipement.clim} onChange={(v) => patch("equipement", { clim: v })} />
          <Toggle label="Wifi haut débit" value={data.equipement.wifi} onChange={(v) => patch("equipement", { wifi: v })} />
          <Field label="Cuisine">
            <Select value={data.equipement.cuisine} onChange={(v) => patch("equipement", { cuisine: v })}
              options={[
                { value: "basique",       label: "Basique" },
                { value: "standard",      label: "Standard" },
                { value: "premium",       label: "Premium" },
                { value: "haut_de_gamme", label: "Haut de gamme" },
              ]}
            />
          </Field>
          <Field label="Standing général">
            <Select value={data.equipement.standing} onChange={(v) => patch("equipement", { standing: v })}
              options={[
                { value: "basique",  label: "Basique" },
                { value: "standard", label: "Standard" },
                { value: "premium",  label: "Premium" },
                { value: "luxe",     label: "Luxe" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Année de rénovation">
              <Num value={data.equipement.annee_renovation} onChange={(v) => patch("equipement", { annee_renovation: v })} min={1900} placeholder="2020" />
            </Field>
            <Field label="Qualité des photos">
              <Select value={data.equipement.qualite_photos} onChange={(v) => patch("equipement", { qualite_photos: v })}
                options={[
                  { value: "amateur",         label: "Amateur" },
                  { value: "correcte",        label: "Correcte" },
                  { value: "professionnelle", label: "Professionnelle" },
                  { value: "editoriale",      label: "Éditoriale" },
                ]}
              />
            </Field>
          </div>
        </div>
      );

    case "strategie":
      return (
        <div>
          <Field label="Clientèle cible">
            <textarea
              value={data.strategie.clientele_cible}
              onChange={(e) => patch("strategie", { clientele_cible: e.target.value })}
              className="e-field" rows={2}
              placeholder="Ex. familles, couples, groupes d'amis, voyageurs d'affaires…"
            />
          </Field>
          <Field label="Atouts du bien">
            <textarea
              value={data.strategie.atouts}
              onChange={(e) => patch("strategie", { atouts: e.target.value })}
              className="e-field" rows={3}
            />
          </Field>
          <Field label="Faiblesses identifiées">
            <textarea
              value={data.strategie.faiblesses}
              onChange={(e) => patch("strategie", { faiblesses: e.target.value })}
              className="e-field" rows={3}
            />
          </Field>
          <Field label="Revenus locatifs actuels (€ / an, optionnel)">
            <Num value={data.strategie.revenus_actuels_eur} onChange={(v) => patch("strategie", { revenus_actuels_eur: v })} min={0} />
          </Field>
        </div>
      );

    case "donnees_marche":
      return <DonneesMarcheStepView data={data} patch={patch} />;

    case "photos":
      return <PhotosStepView data={data} patch={patch} />;
  }
}

function PhotosStepView({ data, patch }: { data: Data; patch: Patch }) {
  const items = data.photos.items;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const list: PhotoItem[] = [...items];
    for (const f of Array.from(files)) {
      if (list.length >= 30) { toast.error("Maximum 30 photos"); break; }
      if (f.size > 25 * 1024 * 1024) { toast.error(`${f.name} > 25 Mo`); continue; }
      try {
        const dataUrl = await compressImage(f, 1600, 0.82);
        list.push({
          id: crypto.randomUUID(),
          data_url: dataUrl,
          name: f.name,
          couverture: list.length === 0, // La 1ʳᵉ est couverture par défaut
        });
      } catch {
        toast.error(`Impossible de traiter ${f.name}`);
      }
    }
    patch("photos", { items: list });
  };

  // Downscale + JPEG pour rester sous la limite sessionStorage (~5 Mo cumulés).
  async function compressImage(file: File, maxSide: number, quality: number): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  }

  const setCouverture = (id: string) => {
    patch("photos", { items: items.map((p) => ({ ...p, couverture: p.id === id })) });
  };
  const remove = (id: string) => {
    const next = items.filter((p) => p.id !== id);
    if (next.length && !next.some((p) => p.couverture)) next[0].couverture = true;
    patch("photos", { items: next });
  };

  return (
    <div>
      <p className="e-italic text-lg text-[color:var(--e-text)] mb-6">
        La première photo sert de couverture au rapport. Vous pourrez la changer.
      </p>

      <label className="block border border-dashed border-[color:var(--e-line)] p-10 text-center cursor-pointer hover:border-[color:var(--e-ink)] transition-colors mb-6">
        <input
          type="file" accept="image/*" multiple
          onChange={(e) => handleFiles(e.target.files)}
          style={{ opacity: 0, position: "absolute", pointerEvents: "none" }}
        />
        <Upload className="w-6 h-6 mx-auto mb-3 text-[color:var(--e-text-soft)]" strokeWidth={1.5} />
        <p className="e-label mb-1">Ajouter des photos</p>
        <p className="text-xs text-[color:var(--e-text-soft)]">JPG / PNG / WEBP · max 8 Mo · 30 max</p>
      </label>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {items.map((p) => (
            <div key={p.id} className="relative group">
              <img src={p.data_url} alt={p.name} className="w-full aspect-[4/3] object-cover" />
              {p.couverture && (
                <span className="absolute top-2 left-2 px-2 py-1 text-[9px] tracking-[0.25em] uppercase bg-[color:var(--e-ink)] text-[color:var(--e-paper)]">
                  Couverture
                </span>
              )}
              <div className="absolute inset-0 flex items-end justify-end gap-1 p-2 bg-black/0 group-hover:bg-black/40 transition-colors">
                {!p.couverture && (
                  <button
                    type="button" onClick={() => setCouverture(p.id)}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[9px] tracking-[0.25em] uppercase bg-white text-black transition-opacity"
                  >Couverture</button>
                )}
                <button
                  type="button" onClick={() => remove(p.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 bg-white text-black transition-opacity"
                  aria-label="Supprimer"
                ><X className="w-3 h-3" strokeWidth={2} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Étape 7 · Données marché (upload PDF AirDNA → extraction Gemini)
// ─────────────────────────────────────────────────────────────
function DonneesMarcheStepView({ data, patch }: { data: Data; patch: Patch }) {
  const [busy, setBusy] = useState(false);
  const airdna = data.donnees_marche.airdna;

  const handlePdf = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("PDF > 10 Mo"); return; }
    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: resp, error } = await supabase.functions.invoke("parse-airdna-pdf", {
        body: { pdf_base64: base64, filename: file.name },
      });
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);

      patch("donnees_marche", {
        airdna: {
          adr_eur: resp.adr_eur ?? null,
          occupation_pct: resp.occupation_pct ?? null,
          revenu_annuel_eur: resp.revenu_annuel_eur ?? null,
          prix_haute_eur: null,
          prix_moyenne_eur: null,
          prix_basse_eur: null,
          comparables: (resp.comparables ?? []).map((c: {
            nom: string; adr_eur: number | null; occupation_pct: number | null; revenu_annuel_eur: number | null;
          }) => ({
            nom: c.nom,
            adr_eur: c.adr_eur ?? 0,
            occupation_pct: c.occupation_pct ?? 0,
            revenu_annuel_eur: c.revenu_annuel_eur ?? 0,
          })),
        },
      });
      toast.success(`AirDNA extrait · ${resp.comparables?.length ?? 0} comparables`);
    } catch (e) {
      console.error(e);
      toast.error("Extraction impossible — vérifiez le PDF");
    } finally {
      setBusy(false);
    }
  };

  const clear = () => patch("donnees_marche", { airdna: null });

  return (
    <div>
      <p className="e-italic text-lg text-[color:var(--e-text)] mb-6">
        Étape optionnelle — calibre le rapport sur des données AirDNA réelles.
      </p>

      <div className="border border-[color:var(--e-line)] p-6 mb-4">
        <p className="e-label mb-2">Import PDF AirDNA / Rentalizer</p>
        <p className="text-sm text-[color:var(--e-text)] mb-4">
          Glissez un rapport Rentalizer PDF — extraction automatique de l'ADR, occupation, revenu et comparables (conversion USD → EUR).
        </p>

        {!airdna ? (
          <label className="inline-flex items-center gap-2 e-btn e-btn-ghost cursor-pointer" style={{ pointerEvents: busy ? "none" : "auto", opacity: busy ? 0.5 : 1 }}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />}
            {busy ? "Analyse…" : "Uploader le PDF"}
            <input
              type="file" accept="application/pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handlePdf(f); }}
              style={{ opacity: 0, position: "absolute", pointerEvents: "none", width: 0, height: 0 }}
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Kpi label="ADR" value={airdna.adr_eur != null ? `${airdna.adr_eur} €` : "—"} />
              <Kpi label="Occupation" value={airdna.occupation_pct != null ? `${airdna.occupation_pct}%` : "—"} />
              <Kpi label="Revenu annuel" value={airdna.revenu_annuel_eur != null ? `${airdna.revenu_annuel_eur} €` : "—"} />
            </div>
            <p className="text-xs text-[color:var(--e-text-soft)]">
              {airdna.comparables.length} comparables extraits.
            </p>
            <button type="button" onClick={clear} className="e-eyebrow hover:text-[color:var(--e-ink)] inline-flex items-center gap-2">
              <X className="w-3 h-3" strokeWidth={1.5} /> Retirer
            </button>
          </div>
        )}
      </div>

      <div className="border border-[color:var(--e-line)] p-6 opacity-60">
        <p className="e-label mb-2">Recherche marché IA</p>
        <p className="text-sm text-[color:var(--e-text)] mb-4">
          Analyse hyper-locale du micro-marché (ADR / occupation / concurrence).
        </p>
        <button type="button" disabled className="e-btn e-btn-ghost">Bientôt · phase 9</button>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 border border-[color:var(--e-line)]">
      <p className="e-label mb-1">{label}</p>
      <p className="text-sm" style={{ fontFamily: "var(--e-title)" }}>{value}</p>
    </div>
  );
}

