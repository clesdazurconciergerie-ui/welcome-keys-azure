// MODULE — Parcours mobile-first de remplissage d'un état des lieux
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, AlertTriangle, Camera, StickyNote,
  Trash2, Loader2, ShieldAlert, FileText, Lock, Sparkles,
} from "lucide-react";
import { useInspectionFlow } from "@/hooks/useInspectionFlow";
import { useCleaningPhotosForInspection } from "@/hooks/useCleaningPhotosForInspection";
import {
  INSPECTION_ZONES, ISSUE_CATEGORIES, ISSUE_SEVERITIES, ISSUE_CATEGORY_LABEL,
  ISSUE_SEVERITY_LABEL, ZONE_LABEL, guessZoneFromKind,
} from "@/lib/inspection-zones";
import { ZoneMediaStrip } from "@/components/inspection/ZoneMediaStrip";
import { SignaturePad } from "@/components/inspection/SignaturePad";
import { InspectionPrintView } from "@/components/inspection/InspectionPrintView";
import { generateAndUploadInspectionPdf } from "@/lib/inspection-pdf";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

type Step = { kind: "zone"; index: number } | { kind: "summary" } | { kind: "sign" };

export default function InspectionQuickFillPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const flow = useInspectionFlow(id);
  const [step, setStep] = useState(0); // 0..6 zones, 7 récap, 8 signatures
  const [issueZone, setIssueZone] = useState<string | null>(null);
  const [noteZone, setNoteZone] = useState<string | null>(null);
  const [generalNotes, setGeneralNotes] = useState("");
  const [conciergeSig, setConciergeSig] = useState<string | null>(null);
  const [guestSig, setGuestSig] = useState<string | null>(null);
  const [conciergeName, setConciergeName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadZoneRef = useRef<string | null>(null);

  const insp = flow.inspection.data;
  const zones = flow.zones.data ?? [];
  const issues = flow.issues.data ?? [];
  const photos = flow.photos.data ?? [];
  const locked = !!insp?.locked_at;

  const cleaning = useCleaningPhotosForInspection(insp?.property_id, insp?.official_date);

  useEffect(() => {
    if (insp) {
      setGeneralNotes(insp.general_notes ?? insp.notes ?? "");
      setGuestName(insp.guest_name ?? insp.booking?.guest_name ?? "");
      setConciergeName(insp.inspector_name ?? "");
    }
  }, [insp?.id]);

  useEffect(() => {
    if (flow.zones.isSuccess && zones.length === 0 && id) flow.ensureZones.mutate();
  }, [flow.zones.isSuccess, zones.length, id]);

  // Brouillon auto local (résilience fermeture / perte réseau)
  useEffect(() => {
    if (!id) return;
    const saved = localStorage.getItem(`edl-draft-${id}`);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.generalNotes && !generalNotes) setGeneralNotes(d.generalNotes);
        if (typeof d.step === "number") setStep(d.step);
      } catch { /* ignore */ }
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`edl-draft-${id}`, JSON.stringify({ generalNotes, step }));
  }, [id, generalNotes, step]);

  const orderedZones = useMemo(
    () => INSPECTION_ZONES.map((z) => zones.find((x) => x.zone_key === z.key)).filter(Boolean) as typeof zones,
    [zones],
  );
  const checkedCount = orderedZones.filter((z) => z.status !== "pending").length;
  const totalZones = INSPECTION_ZONES.length;
  const totalSteps = totalZones + 2;
  const currentZone = step < totalZones ? INSPECTION_ZONES[step] : null;
  const currentZoneRow = currentZone ? zones.find((z) => z.zone_key === currentZone.key) : null;

  const cleaningByZone = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const p of cleaning.data?.photos ?? []) {
      const zk = guessZoneFromKind(p.kind) ?? "_other";
      (map[zk] ||= []).push(p);
    }
    return map;
  }, [cleaning.data]);

  const zonePhotos = (zk: string) => photos.filter((p) => p.zone_key === zk);
  const zoneIssues = (zk: string) => issues.filter((i) => i.zone_key === zk);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const zk = uploadZoneRef.current;
    e.target.value = "";
    if (!file || !zk) return;
    await flow.uploadZoneMedia.mutateAsync({ file, zone_key: zk });
  };

  const pickFile = (zk: string) => {
    uploadZoneRef.current = zk;
    fileRef.current?.click();
  };

  const markOk = async (zk: string) => {
    await flow.setZone.mutateAsync({ zone_key: zk, status: "ok" });
    if (step < totalZones - 1) setStep((s) => s + 1);
    else setStep(totalZones);
  };

  const bothSigned = !!(insp?.concierge_signature_url || conciergeSig) && !!(insp?.guest_signature_url || guestSig);

  const finalize = async () => {
    if (!id || !insp) return;
    if (!conciergeName.trim() || !guestName.trim()) {
      toast.error("Indiquez le nom des deux signataires");
      return;
    }
    setFinalizing(true);
    try {
      if (conciergeSig) await flow.saveSignature.mutateAsync({ type: "concierge", dataUrl: conciergeSig, signerName: conciergeName });
      if (guestSig) await flow.saveSignature.mutateAsync({ type: "guest", dataUrl: guestSig, signerName: guestName });
      await flow.updateInspection.mutateAsync({
        general_notes: generalNotes,
        guest_name: guestName,
        inspector_name: conciergeName,
      });
      await flow.finalize.mutateAsync();
      await flow.inspection.refetch();
      // PDF
      const { data: { user } } = await supabase.auth.getUser();
      await new Promise((r) => setTimeout(r, 400));
      await generateAndUploadInspectionPdf({
        elementId: "inspection-print-view",
        inspectionId: id,
        userId: user!.id,
        propertyName: insp.property?.name ?? "bien",
        officialDate: insp.official_date,
      });
      localStorage.removeItem(`edl-draft-${id}`);
      toast.success("État des lieux finalisé et PDF généré");
      navigate(`/dashboard/etats-des-lieux/${id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Finalisation impossible");
    } finally {
      setFinalizing(false);
    }
  };

  if (flow.inspection.isLoading || !insp) {
    return <div className="p-4 space-y-3"><Skeleton className="h-12" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="min-h-[100dvh] pb-36">
      <SEOHead title="Contrôle en cours — Welkom" description="Remplissage rapide d'un état des lieux" />
      <input ref={fileRef} type="file" accept="image/*,video/*" capture="environment" onChange={handleFile} className="absolute opacity-0 pointer-events-none w-0 h-0" />

      {/* Header sticky */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-3 py-2.5 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/etats-des-lieux")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{insp.property?.name ?? "Bien"}</p>
            <p className="text-[11px] text-muted-foreground">
              {insp.inspection_type === "exit" ? "État des lieux de sortie" : "État des lieux d'entrée"}
              {" · "}{checkedCount} zone{checkedCount > 1 ? "s" : ""} sur {totalZones} contrôlée{checkedCount > 1 ? "s" : ""}
            </p>
          </div>
          {locked && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Verrouillé</Badge>}
        </div>
        <div className="h-1 bg-muted">
          <div className="h-full bg-foreground transition-all" style={{ width: `${(checkedCount / totalZones) * 100}%` }} />
        </div>
      </header>

      <div className="px-4 py-5 max-w-3xl mx-auto space-y-6">
        {/* ÉTAPE ZONE */}
        {currentZone && (
          <section className="space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Zone {step + 1} / {totalZones}</p>
              <h2 className="text-2xl font-semibold tracking-tight">{currentZone.label}</h2>
              <p className="text-sm text-muted-foreground">{currentZone.hint}</p>
            </div>

            <ZoneStatusBadge status={currentZoneRow?.status ?? "pending"} />

            {/* Médias ménage précédent (entrée) */}
            {insp.inspection_type === "entry" && (
              <div className="border border-border p-3 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> Médias du ménage précédent
                </p>
                <ZoneMediaStrip
                  media={[...(cleaningByZone[currentZone.key] ?? []), ...(cleaningByZone._other ?? [])].map((p: any) => ({
                    id: p.id, url: p.url, media_type: "photo", captured_at: p.created_at,
                  }))}
                  empty="Aucun média de ménage disponible pour cette zone."
                />
              </div>
            )}

            {/* Actions rapides */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-16 text-base col-span-2" disabled={locked || flow.setZone.isPending}
                onClick={() => markOk(currentZone.key)}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" strokeWidth={1.5} /> Tout est conforme
              </Button>
              <Button variant="outline" className="h-14" disabled={locked} onClick={() => setIssueZone(currentZone.key)}>
                <AlertTriangle className="h-4 w-4 mr-2" strokeWidth={1.5} /> Signaler
              </Button>
              <Button variant="outline" className="h-14" disabled={locked} onClick={() => pickFile(currentZone.key)}>
                {flow.uploadZoneMedia.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" strokeWidth={1.5} />}
                Photo
              </Button>
              <Button variant="outline" className="h-14 col-span-2" disabled={locked} onClick={() => setNoteZone(currentZone.key)}>
                <StickyNote className="h-4 w-4 mr-2" strokeWidth={1.5} /> Ajouter une note
              </Button>
            </div>

            {currentZoneRow?.note && (
              <p className="text-sm border-l-2 border-foreground pl-3 whitespace-pre-wrap">{currentZoneRow.note}</p>
            )}

            {/* Photos EDL de la zone */}
            {zonePhotos(currentZone.key).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider">Photos de ce contrôle</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {zonePhotos(currentZone.key).map((p) => (
                    <div key={p.id} className="relative shrink-0">
                      <ZoneMediaStrip media={[{ id: p.id, url: p.file_url, media_type: p.media_type }]} />
                      {!locked && (
                        <button
                          type="button" aria-label="Supprimer la photo"
                          onClick={() => flow.deleteMedia.mutate(p)}
                          className="absolute top-1 right-1 bg-background border border-border p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anomalies de la zone */}
            {zoneIssues(currentZone.key).map((i) => (
              <IssueRow key={i.id} issue={i} onDelete={() => flow.deleteIssue.mutate(i.id)} locked={locked} />
            ))}
          </section>
        )}

        {/* RÉCAPITULATIF */}
        {step === totalZones && (
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">Récapitulatif</h2>
            <SummaryBlock insp={insp} zones={orderedZones} issues={issues} photosCount={photos.length} />
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider">Notes générales</label>
              <Textarea
                value={generalNotes} disabled={locked}
                onChange={(e) => setGeneralNotes(e.target.value)}
                onBlur={() => flow.updateInspection.mutate({ general_notes: generalNotes })}
                rows={4} placeholder="Observations complémentaires…"
              />
            </div>
          </section>
        )}

        {/* SIGNATURES */}
        {step === totalSteps - 1 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">Signatures</h2>
            <p className="text-sm border border-border p-3 leading-relaxed">
              Les parties reconnaissent avoir pris connaissance de l'état du logement et des éventuelles
              observations indiquées ci-dessus.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Input placeholder="Nom du signataire conciergerie" value={conciergeName} disabled={locked}
                  onChange={(e) => setConciergeName(e.target.value)} className="h-12" />
                {locked && insp.concierge_signature_url ? (
                  <img src={insp.concierge_signature_url} alt="Signature conciergerie" className="h-24 border border-border bg-white" />
                ) : (
                  <SignaturePad label="Signature de la conciergerie" onSignatureChange={setConciergeSig} existingSignature={insp.concierge_signature_url} />
                )}
              </div>
              <div className="space-y-2">
                <Input placeholder="Nom du voyageur" value={guestName} disabled={locked}
                  onChange={(e) => setGuestName(e.target.value)} className="h-12" />
                {locked && insp.guest_signature_url ? (
                  <img src={insp.guest_signature_url} alt="Signature voyageur" className="h-24 border border-border bg-white" />
                ) : (
                  <SignaturePad label="Signature du voyageur" onSignatureChange={setGuestSig} existingSignature={insp.guest_signature_url} />
                )}
              </div>
            </div>

            {locked && (
              <p className="text-sm flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" /> Signé le {new Date(insp.signed_at ?? insp.locked_at).toLocaleString("fr-FR")} — document verrouillé.
              </p>
            )}
          </section>
        )}
      </div>

      {/* Rendu PDF hors écran */}
      <div className="fixed -left-[10000px] top-0" aria-hidden="true">
        <InspectionPrintView
          inspection={{ ...insp, general_notes: generalNotes, guest_name: guestName, inspector_name: conciergeName }}
          zones={orderedZones}
          issues={issues}
          photos={photos}
          conciergeSignature={conciergeSig ?? insp.concierge_signature_url}
          guestSignature={guestSig ?? insp.guest_signature_url}
        />
      </div>

      {/* Barre d'action fixe */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto flex gap-2">
          {step > 0 && (
            <Button variant="outline" className="h-14 px-4" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button className="h-14 flex-1 text-base" onClick={() => setStep((s) => s + 1)}>
              Continuer <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : locked ? (
            <Button className="h-14 flex-1 text-base" onClick={() => navigate(`/dashboard/etats-des-lieux/${id}`)}>
              <FileText className="h-4 w-4 mr-2" /> Voir le rapport
            </Button>
          ) : (
            <Button className="h-14 flex-1 text-base" disabled={!bothSigned || finalizing} onClick={finalize}>
              {finalizing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
              Finaliser et générer le PDF
            </Button>
          )}
        </div>
      </div>

      <IssueDialog
        zoneKey={issueZone}
        onClose={() => setIssueZone(null)}
        onSubmit={async (payload) => {
          await flow.addIssue.mutateAsync(payload);
          setIssueZone(null);
        }}
        onPickPhoto={pickFile}
      />

      <NoteDialog
        zoneKey={noteZone}
        initial={noteZone ? zones.find((z) => z.zone_key === noteZone)?.note ?? "" : ""}
        onClose={() => setNoteZone(null)}
        onSubmit={async (note) => {
          if (!noteZone) return;
          await flow.setZone.mutateAsync({ zone_key: noteZone, note });
          setNoteZone(null);
        }}
      />
    </div>
  );
}

function ZoneStatusBadge({ status }: { status: string }) {
  if (status === "ok") {
    return <p className="flex items-center gap-2 text-sm border border-foreground px-3 py-2"><CheckCircle2 className="h-4 w-4" strokeWidth={1.5} /> Zone marquée conforme</p>;
  }
  if (status === "issue") {
    return <p className="flex items-center gap-2 text-sm border border-foreground bg-foreground text-background px-3 py-2"><AlertTriangle className="h-4 w-4" strokeWidth={1.5} /> Problème signalé sur cette zone</p>;
  }
  return <p className="flex items-center gap-2 text-sm border border-dashed border-border px-3 py-2 text-muted-foreground"><ShieldAlert className="h-4 w-4" strokeWidth={1.5} /> Zone non encore contrôlée</p>;
}

function IssueRow({ issue, onDelete, locked }: { issue: any; onDelete: () => void; locked: boolean }) {
  return (
    <div className="border border-border p-3 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{ISSUE_CATEGORY_LABEL[issue.category] ?? issue.category}</Badge>
          <Badge variant={issue.severity === "urgent" ? "default" : "outline"} className="gap-1">
            <AlertTriangle className="h-3 w-3" /> {ISSUE_SEVERITY_LABEL[issue.severity] ?? issue.severity}
          </Badge>
        </div>
        {!locked && (
          <button type="button" aria-label="Supprimer l'anomalie" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      {issue.comment && <p className="text-sm whitespace-pre-wrap">{issue.comment}</p>}
    </div>
  );
}

function SummaryBlock({ insp, zones, issues, photosCount }: any) {
  const stay = insp.booking
    ? `${new Date(insp.booking.check_in).toLocaleDateString("fr-FR")} → ${new Date(insp.booking.check_out).toLocaleDateString("fr-FR")}`
    : "—";
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-y-2">
        <Row label="Bien" value={insp.property?.name ?? "—"} />
        <Row label="Type" value={insp.inspection_type === "exit" ? "Sortie" : "Entrée"} />
        <Row label="Voyageur" value={insp.guest_name ?? insp.booking?.guest_name ?? "—"} />
        <Row label="Séjour" value={stay} />
        <Row label="Photos jointes" value={String(photosCount)} />
        <Row label="Anomalies" value={String(issues.length)} />
      </dl>
      <div className="space-y-1">
        {zones.map((z: any) => (
          <div key={z.id} className="flex items-center justify-between border-b border-border py-2">
            <span>{ZONE_LABEL[z.zone_key] ?? z.zone_label}</span>
            <span className="flex items-center gap-1.5 text-xs">
              {z.status === "ok" && <><CheckCircle2 className="h-3.5 w-3.5" /> Conforme</>}
              {z.status === "issue" && <><AlertTriangle className="h-3.5 w-3.5" /> Problème</>}
              {z.status === "pending" && <><ShieldAlert className="h-3.5 w-3.5" /> Non contrôlée</>}
            </span>
          </div>
        ))}
      </div>
      {issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider">Anomalies signalées</p>
          {issues.map((i: any) => (
            <div key={i.id} className="border border-border p-2 text-xs">
              <strong>{ZONE_LABEL[i.zone_key] ?? i.zone_key}</strong> · {ISSUE_CATEGORY_LABEL[i.category]} · {ISSUE_SEVERITY_LABEL[i.severity]}
              {i.comment ? ` — ${i.comment}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground text-xs uppercase tracking-wider">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}

function IssueDialog({ zoneKey, onClose, onSubmit, onPickPhoto }: {
  zoneKey: string | null;
  onClose: () => void;
  onSubmit: (p: { zone_key: string; category: string; severity: string; comment: string }) => Promise<void>;
  onPickPhoto: (zk: string) => void;
}) {
  const [category, setCategory] = useState("cleanliness");
  const [severity, setSeverity] = useState("minor");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (zoneKey) { setCategory("cleanliness"); setSeverity("minor"); setComment(""); }
  }, [zoneKey]);

  return (
    <Dialog open={!!zoneKey} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Signaler un problème — {zoneKey ? ZONE_LABEL[zoneKey] : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider">Catégorie</p>
            <div className="grid grid-cols-2 gap-2">
              {ISSUE_CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                  className={`border px-3 py-3 text-sm min-h-[48px] ${category === c.value ? "bg-foreground text-background border-foreground" : "border-border"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider">Niveau</p>
            <div className="grid grid-cols-3 gap-2">
              {ISSUE_SEVERITIES.map((s) => (
                <button key={s.value} type="button" onClick={() => setSeverity(s.value)}
                  className={`border px-2 py-3 text-sm min-h-[48px] ${severity === s.value ? "bg-foreground text-background border-foreground" : "border-border"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Textarea placeholder="Commentaire (facultatif)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          {zoneKey && (
            <Button variant="outline" className="w-full h-12" onClick={() => onPickPhoto(zoneKey)}>
              <Camera className="h-4 w-4 mr-2" /> Ajouter une photo
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={saving || !zoneKey}
            onClick={async () => {
              if (!zoneKey) return;
              setSaving(true);
              try { await onSubmit({ zone_key: zoneKey, category, severity, comment }); }
              finally { setSaving(false); }
            }}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteDialog({ zoneKey, initial, onClose, onSubmit }: {
  zoneKey: string | null; initial: string; onClose: () => void; onSubmit: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(initial);
  useEffect(() => setNote(initial), [zoneKey, initial]);
  return (
    <Dialog open={!!zoneKey} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Note — {zoneKey ? ZONE_LABEL[zoneKey] : ""}</DialogTitle></DialogHeader>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} placeholder="Observation libre…" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSubmit(note)}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
