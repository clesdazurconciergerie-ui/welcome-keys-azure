// MODULE — Estimation locative · éditeur (parcours complet en une page à onglets)
// Étape 1 : collecte, import RDNA, analyse IA, correction manuelle, synthèse.
// Aucun coefficient de pricing ici : le moteur arrive à l'étape suivante.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Upload, Loader2, Star, Trash2, Sparkles, FileText, Save, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EstimationAnalysisTab from "@/components/estimation/EstimationAnalysisTab";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { StorageImage } from "@/components/StorageImage";
import { supabase } from "@/integrations/supabase/client";
import { useEstimation } from "@/hooks/useEstimationsLoc";
import { computeConfidence } from "@/lib/estimation-locative/types";
import EstimationEngineTab from "@/components/estimation/EstimationEngineTab";
import {
  AC_OPTIONS, AMENITIES, COMPARABLES_DISCLAIMER, ESTIMATION_STATUSES, EXTERIOR_OPTIONS,
  FLOOR_OPTIONS, MIN_STAY_OPTIONS, OWNER_STRATEGY_OPTIONS, PARKING_OPTIONS, PETS_OPTIONS,
  PHOTO_CATEGORIES, POOL_OPTIONS, PROPERTY_TYPES, SCORE_AXES, STATUS_LABEL, VIEW_OPTIONS,
  WIFI_OPTIONS,
} from "@/lib/estimation-locative/constants";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export default function EstimationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const flow = useEstimation(id);
  const est = flow.estimation.data;

  const [owner, setOwner] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [bien, setBien] = useState<Record<string, any>>({});
  const [features, setFeatures] = useState<Record<string, any>>({});
  const [constraints, setConstraints] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");
  const hydrated = useRef(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!est || hydrated.current) return;
    hydrated.current = true;
    setOwner({
      first_name: est.owner?.first_name ?? "", last_name: est.owner?.last_name ?? "",
      email: est.owner?.email ?? "", phone: est.owner?.phone ?? "",
    });
    setBien({
      address: est.address ?? "", city: est.city ?? "", postal_code: est.postal_code ?? "",
      district: est.district ?? "", property_type: est.property_type ?? "",
      lat: est.lat ?? "", lng: est.lng ?? "",
    });
    setFeatures(est.features ?? {});
    setConstraints(est.constraints ?? {});
    setNotes(est.internal_notes ?? "");
  }, [est]);

  const photos = flow.photos.data ?? [];
  const comparables = flow.comparables.data ?? [];
  const documents = flow.documents.data ?? [];
  const ai = est?.ai_analysis ?? {};
  const scores = est?.ai_scores ?? {};

  const confidence = useMemo(() => computeConfidence({
    hasRdna: Object.keys(est?.rdna_data ?? {}).length > 0,
    comparables: comparables.length,
    photos: photos.length,
    hasAi: Object.keys(ai).length > 0,
    hasCoords: !!est?.lat && !!est?.lng,
    userFieldsFilled: Object.values(features).filter((v) => v !== null && v !== "" && v !== undefined).length,
  }), [est, comparables.length, photos.length, ai, features]);

  const saveAll = async () => {
    if (!id) return;
    if (owner.first_name || owner.last_name) {
      await flow.saveOwner.mutateAsync({
        first_name: owner.first_name, last_name: owner.last_name,
        email: owner.email || null, phone: owner.phone || null,
      });
    }
    await flow.save.mutateAsync({
      address: bien.address || null, city: bien.city || null,
      postal_code: bien.postal_code || null, district: bien.district || null,
      property_type: bien.property_type || null,
      lat: bien.lat === "" ? null : Number(bien.lat),
      lng: bien.lng === "" ? null : Number(bien.lng),
      features, constraints, internal_notes: notes || null,
      confidence_score: confidence,
    });
    toast.success("Estimation enregistrée");
  };

  const setF = (k: string, v: any) => setFeatures((f) => ({ ...f, [k]: v }));
  const setC = (k: string, v: any) => setConstraints((c) => ({ ...c, [k]: v }));

  const toggleList = (k: string, value: string) => {
    setFeatures((f) => {
      const arr: string[] = f[k] ?? [];
      return { ...f, [k]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  };

  if (flow.estimation.isLoading) {
    return <div className="max-w-4xl mx-auto space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-96" /></div>;
  }
  if (!est) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <p className="text-muted-foreground">Estimation introuvable.</p>
        <Button variant="outline" onClick={() => navigate("/rapports/estimations")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <SEOHead title={`${est.reference} — Estimation locative`} description="Estimation de potentiel locatif Azur Keys Properties." />

      <header className="space-y-4 border-b pb-6">
        <button onClick={() => navigate("/rapports/estimations")} className="text-xs uppercase tracking-[0.24em] text-muted-foreground hover:text-foreground flex items-center gap-2">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Estimations
        </button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-wider text-muted-foreground">{est.reference}</p>
            <h1 className="text-2xl font-light tracking-tight mt-1">
              {est.address || "Nouvelle estimation"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Select value={est.status} onValueChange={(v) => flow.save.mutate({ status: v })}>
              <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTIMATION_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={saveAll} disabled={flow.save.isPending}>
              {flow.save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" strokeWidth={1.5} />}
              Enregistrer
            </Button>
          </div>
        </div>
      </header>

      <Tabs defaultValue="proprietaire">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="proprietaire">Propriétaire</TabsTrigger>
          <TabsTrigger value="bien">Bien</TabsTrigger>
          <TabsTrigger value="caracteristiques">Caractéristiques</TabsTrigger>
          <TabsTrigger value="contraintes">Contraintes</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="analyse">Analyse du logement</TabsTrigger>
          <TabsTrigger value="marche">Analyse de marché</TabsTrigger>
          <TabsTrigger value="moteur">Moteur</TabsTrigger>
          <TabsTrigger value="verification">Vérification</TabsTrigger>
        </TabsList>

        {/* ── Propriétaire ─────────────────────────────── */}
        <TabsContent value="proprietaire" className="space-y-6 pt-8">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Prénom">
              <Input value={owner.first_name} onChange={(e) => setOwner({ ...owner, first_name: e.target.value })} />
            </Field>
            <Field label="Nom">
              <Input value={owner.last_name} onChange={(e) => setOwner({ ...owner, last_name: e.target.value })} />
            </Field>
            <Field label="Email (facultatif)">
              <Input type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
            </Field>
            <Field label="Téléphone (facultatif)">
              <Input value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value })} />
            </Field>
          </div>
        </TabsContent>

        {/* ── Bien / localisation ──────────────────────── */}
        <TabsContent value="bien" className="space-y-6 pt-8">
          <Field label="Adresse complète">
            <Input value={bien.address ?? ""} onChange={(e) => setBien({ ...bien, address: e.target.value })} placeholder="12 avenue des Golfs, Saint-Raphaël" />
          </Field>
          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="Ville"><Input value={bien.city ?? ""} onChange={(e) => setBien({ ...bien, city: e.target.value })} /></Field>
            <Field label="Code postal"><Input value={bien.postal_code ?? ""} onChange={(e) => setBien({ ...bien, postal_code: e.target.value })} /></Field>
            <Field label="Quartier"><Input value={bien.district ?? ""} onChange={(e) => setBien({ ...bien, district: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="Type de bien">
              <Select value={bien.property_type ?? ""} onValueChange={(v) => setBien({ ...bien, property_type: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Latitude"><Input value={bien.lat ?? ""} onChange={(e) => setBien({ ...bien, lat: e.target.value })} /></Field>
            <Field label="Longitude"><Input value={bien.lng ?? ""} onChange={(e) => setBien({ ...bien, lng: e.target.value })} /></Field>
          </div>
          <p className="text-xs text-muted-foreground border-l-2 pl-3">
            L'enrichissement automatique de la localisation (distances mer / plage / centre / gare,
            commerces, transports, points d'intérêt) est branché sur le champ <em>Données de localisation</em>
            et sera alimenté à l'étape suivante. Rien n'est inventé pour l'instant.
          </p>
        </TabsContent>

        {/* ── Caractéristiques ─────────────────────────── */}
        <TabsContent value="caracteristiques" className="space-y-8 pt-8">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Surface intérieure (m²)">
              <Input inputMode="numeric" value={features.surface_interieure_m2 ?? ""} onChange={(e) => setF("surface_interieure_m2", num(e.target.value))} placeholder="Inconnue" />
            </Field>
            <Field label="Surface extérieure (m²)">
              <Input inputMode="numeric" value={features.surface_exterieure_m2 ?? ""} onChange={(e) => setF("surface_exterieure_m2", num(e.target.value))} placeholder="Inconnue" />
            </Field>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <Field label="Chambres"><Input inputMode="numeric" value={features.chambres ?? ""} onChange={(e) => setF("chambres", num(e.target.value))} /></Field>
            <Field label="Couchages"><Input inputMode="numeric" value={features.couchages ?? ""} onChange={(e) => setF("couchages", num(e.target.value))} /></Field>
            <Field label="Salles de bain"><Input inputMode="numeric" value={features.salles_de_bain ?? ""} onChange={(e) => setF("salles_de_bain", num(e.target.value))} /></Field>
            <Field label="WC"><Input inputMode="numeric" value={features.wc ?? ""} onChange={(e) => setF("wc", num(e.target.value))} /></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="Étage">
              <Select value={features.etage_mode ?? ""} onValueChange={(v) => setF("etage_mode", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{FLOOR_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {features.etage_mode === "numeric" && (
              <Field label="Numéro d'étage"><Input inputMode="numeric" value={features.etage_numero ?? ""} onChange={(e) => setF("etage_numero", num(e.target.value))} /></Field>
            )}
            <div className="flex items-end gap-6 pb-2">
              <Toggle label="Ascenseur" checked={!!features.ascenseur} onChange={(v) => setF("ascenseur", v)} />
              <Toggle label="Accès PMR" checked={!!features.acces_pmr} onChange={(v) => setF("acces_pmr", v)} />
            </div>
          </div>

          <Group title="Extérieurs">
            <div className="flex flex-wrap gap-2">
              {EXTERIOR_OPTIONS.map((o) => (
                <Chip key={o} active={(features.exterieurs ?? []).includes(o)} onClick={() => toggleList("exterieurs", o)}>{o}</Chip>
              ))}
            </div>
          </Group>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Vue">
              <Select value={features.vue ?? ""} onValueChange={(v) => setF("vue", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{VIEW_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Piscine">
              <Select value={features.piscine ?? ""} onValueChange={(v) => setF("piscine", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{POOL_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Parking">
              <Select value={features.parking ?? ""} onValueChange={(v) => setF("parking", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{PARKING_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Climatisation">
              <Select value={features.climatisation ?? ""} onValueChange={(v) => setF("climatisation", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{AC_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Wi-Fi">
              <Select value={features.wifi ?? ""} onValueChange={(v) => setF("wifi", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{WIFI_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <Group title="Équipements">
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((o) => (
                <Chip key={o} active={(features.equipements ?? []).includes(o)} onClick={() => toggleList("equipements", o)}>{o}</Chip>
              ))}
            </div>
          </Group>
        </TabsContent>

        {/* ── Contraintes ──────────────────────────────── */}
        <TabsContent value="contraintes" className="space-y-6 pt-8">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Durée minimale">
              <Select value={constraints.duree_minimale ?? ""} onValueChange={(v) => setC("duree_minimale", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{MIN_STAY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Préférence du propriétaire">
              <Select value={constraints.strategie_proprietaire ?? ""} onValueChange={(v) => setC("strategie_proprietaire", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{OWNER_STRATEGY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Nuits bloquées par le propriétaire">
              <Input inputMode="numeric" value={constraints.nuits_bloquees ?? ""} onChange={(e) => setC("nuits_bloquees", num(e.target.value))} />
            </Field>
            <Field label="Animaux">
              <Select value={constraints.animaux ?? ""} onValueChange={(v) => setC("animaux", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{PETS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Prix du ménage facturé au voyageur (interne)">
              <Input inputMode="decimal" value={constraints.prix_menage_eur ?? ""} onChange={(e) => setC("prix_menage_eur", num(e.target.value))} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground border-l-2 pl-3">
            Le prix du ménage est une donnée interne : il n'apparaîtra jamais dans le rapport remis au propriétaire.
          </p>
        </TabsContent>

        {/* ── Photos ───────────────────────────────────── */}
        <TabsContent value="photos" className="space-y-6 pt-8">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => photoInput.current?.click()} disabled={flow.uploadPhotos.isPending}>
              {flow.uploadPhotos.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" strokeWidth={1.5} />}
              Ajouter des photos
            </Button>
            <Button onClick={() => flow.analyzePhotos.mutate()} disabled={flow.analyzePhotos.isPending || photos.length === 0}>
              {flow.analyzePhotos.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" strokeWidth={1.5} />}
              Analyser par IA
            </Button>
            <input
              ref={photoInput} type="file" accept="image/*" multiple
              className="absolute opacity-0 w-0 h-0"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) flow.uploadPhotos.mutate(files);
                e.target.value = "";
              }}
            />
          </div>

          {photos.length === 0 ? (
            <div className="border border-dashed py-14 text-center text-sm text-muted-foreground">
              Aucune photo pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((p) => (
                <div key={p.id} className="space-y-2">
                  <div className="relative aspect-[4/3] overflow-hidden border">
                    <SignedPhoto path={p.storage_path} alt={p.file_name ?? "Photo du logement"} />
                    {p.is_cover && (
                      <Badge className="absolute top-2 left-2 text-[10px] uppercase tracking-[0.18em]">Principale</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={p.category ?? ""}
                      onValueChange={(v) => flow.updatePhoto.mutate({ photoId: p.id, patch: { category: v } })}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                      <SelectContent>{PHOTO_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <button onClick={() => flow.setCover.mutate(p.id)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Photo principale">
                      <Star className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => flow.deletePhoto.mutate(p)} className="p-1.5 text-muted-foreground hover:text-destructive" aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Analyse du logement (étape 3) ───────────── */}
        <TabsContent value="analyse">
          <EstimationAnalysisTab
            analysis={(est?.ai_analysis ?? null) as any}
            features={(est?.features ?? {}) as Record<string, unknown>}
            rdna={(est?.rdna_data ?? {}) as Record<string, unknown>}
            overrides={(est?.manual_overrides ?? {}) as Record<string, unknown>}
            photos={photos as any}
            status={(est as any)?.ai_status ?? "idle"}
            error={(est as any)?.ai_error ?? null}
            analyzedAt={(est as any)?.ai_analyzed_at ?? null}
            running={flow.analyzePhotos.isPending}
            onAnalyze={() => flow.analyzePhotos.mutate()}
            onToggleSelection={(photoId, selected) =>
              flow.togglePhotoSelection.mutate({ photoId, selected })}
            onOverrideFact={(factKey, value) => flow.overrideFact.mutate({ factKey, value })}
            renderThumb={(p) => <SignedPhoto path={p.storage_path} alt={p.file_name ?? "Photo du logement"} />}
          />
        </TabsContent>

        {/* ── Analyse de marché ────────────────────────── */}
        <TabsContent value="marche" className="space-y-8 pt-8">
          <div>
            <Button variant="outline" onClick={() => pdfInput.current?.click()} disabled={flow.uploadRdna.isPending}>
              {flow.uploadRdna.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />}
              Importer un PDF AirDNA / RDNA
            </Button>
            <input
              ref={pdfInput} type="file" accept="application/pdf"
              className="absolute opacity-0 w-0 h-0"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) flow.uploadRdna.mutate(f);
                e.target.value = "";
              }}
            />
          </div>

          {documents.length > 0 && (
            <ul className="text-sm divide-y border-t">
              {documents.map((d) => (
                <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                  <span className="truncate">{d.file_name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">{d.status}</Badge>
                </li>
              ))}
            </ul>
          )}

          <Group title="Données RDNA extraites">
            {Object.keys(est.rdna_data ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée importée.</p>
            ) : (
              <dl className="grid sm:grid-cols-3 gap-4 text-sm">
                <Stat label="Market score" value={est.rdna_data.market_score} />
                <Stat label="ADR" value={est.rdna_data.adr_eur} suffix=" €" />
                <Stat label="Occupation" value={est.rdna_data.occupation_pct} suffix=" %" />
                <Stat label="Revenu annuel" value={est.rdna_data.revenu_annuel_eur} suffix=" €" />
                <Stat label="Chambres" value={est.rdna_data.chambres} />
                <Stat label="Voyageurs" value={est.rdna_data.voyageurs} />
              </dl>
            )}
          </Group>

          <Group title="Comparables">
            {comparables.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun comparable pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b">
                      <th className="py-2">Logement</th><th>Chambres</th><th>Prix affiché</th><th>Occupation</th><th>Revenu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparables.map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="py-2 pr-3">{c.name ?? "—"}</td>
                        <td>{c.bedrooms ?? "—"}</td>
                        <td>{c.displayed_price ? `${c.displayed_price} €` : "—"}</td>
                        <td>{c.occupancy_pct ? `${c.occupancy_pct} %` : "—"}</td>
                        <td>{c.annual_revenue ? `${c.annual_revenue} €` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4 border-l-2 pl-3">{COMPARABLES_DISCLAIMER}</p>
          </Group>
        </TabsContent>

        {/* ── Moteur de calcul (interne) ───────────────── */}
        <TabsContent value="moteur">
          <EstimationEngineTab
            raw={((est as any).engine_output && Object.keys((est as any).engine_output).length
              ? (est as any).engine_output : null)}
            overrides={(est.manual_overrides ?? {}) as any}
            computing={flow.compute.isPending}
            onCompute={() => flow.compute.mutate()}
            onOverride={(field, value, computed) => flow.setOverride.mutate({ field, value, computed })}
          />
        </TabsContent>

        {/* ── Vérification ─────────────────────────────── */}
        <TabsContent value="verification" className="space-y-8 pt-8">
          <div className="flex items-baseline gap-4 border-b pb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Confiance interne</p>
              <p className="text-4xl font-light mt-2">{confidence}<span className="text-base text-muted-foreground">/100</span></p>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm">
              Indicateur interne uniquement — il n'apparaîtra pas dans le rapport propriétaire.
            </p>
          </div>

          <Group title="Score IA du bien">
            {Object.keys(scores).length === 0 ? (
              <p className="text-sm text-muted-foreground">Lance l'analyse IA des photos pour obtenir les scores.</p>
            ) : (
              <dl className="grid sm:grid-cols-4 gap-4 text-sm">
                {SCORE_AXES.map((a) => (
                  <Stat key={a.key} label={a.label} value={(scores as any)[a.key]} />
                ))}
              </dl>
            )}
          </Group>

          <Group title="Éléments détectés par l'IA">
            {Object.keys(ai).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune analyse pour l'instant.</p>
            ) : (
              <div className="space-y-4 text-sm">
                <ListBlock title="Points forts" items={(ai as any).points_forts} />
                <ListBlock title="Points faibles" items={(ai as any).points_faibles} />
                <ListBlock title="Éléments vieillissants" items={(ai as any).elements_vieillissants} />
                <ListBlock title="Équipements perçus" items={(ai as any).equipements_percus} />
                {((ai as any).caracteristiques_detectees ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Caractéristiques détectées — corrige-les dans l'onglet Caractéristiques, ta saisie prime toujours
                    </p>
                    <ul className="space-y-1">
                      {((ai as any).caracteristiques_detectees as any[]).map((c, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                          <span className="text-muted-foreground">{c.cle} :</span> {c.valeur}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Group>

          <Group title="Notes internes">
            <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations, hypothèses, points à vérifier…" />
          </Group>

          <div className="border border-dashed p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Résultats du moteur</p>
            Les prix par saison, l'occupation et le chiffre d'affaires annuel se calculent dans
            l'onglet <span className="text-foreground">Moteur</span>. Tu peux y corriger chaque
            valeur à la main : la valeur calculée d'origine reste affichée à côté.
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={saveAll}>Enregistrer l'estimation</Button>
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">
              Statut : {STATUS_LABEL[est.status] ?? est.status}
            </Badge>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── petits composants de mise en page ─────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground border-b pb-2">{title}</h2>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs border transition-colors ${
        active ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      {label}
    </label>
  );
}

function Stat({ label, value, suffix = "" }: { label: string; value: any; suffix?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="text-lg font-light mt-1">
        {value === null || value === undefined || value === "" ? "—" : `${value}${suffix}`}
      </dd>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{title}</p>
      <ul className="list-disc pl-5 space-y-1">{items.map((i, k) => <li key={k}>{i}</li>)}</ul>
    </div>
  );
}

function SignedPhoto({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let active = true;
    supabase.storage.from("estimation-photos").createSignedUrl(path, 3600).then(({ data }) => {
      if (active && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);
  if (!url) return <div className="w-full h-full bg-muted animate-pulse" />;
  return <StorageImage src={url} alt={alt} className="w-full h-full object-cover" loading="lazy" />;
}
