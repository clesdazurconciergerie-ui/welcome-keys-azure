// CANDIDAT NON APPLIQUE : integrer dans les parametres du logement MyWelcome.
// Les dates sont saisies et attestees par Noa ; aucun remplissage automatique.
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Period = { id: string; property_id: string; online_from: string;
  online_until_exclusive: string | null; evidence_kind: string };
// The new tables are included in the migration but not yet in generated Supabase types.
const listingClient = supabase as unknown as SupabaseClient;

export function ListingPeriodsEditor({ propertyId }: { propertyId: string }) {
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Period[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [stillOnline, setStillOnline] = useState(false);
  const [evidence, setEvidence] = useState<"owner_attested" | "platform_record">("owner_attested");
  const [knownFrom, setKnownFrom] = useState("");
  const [attested, setAttested] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Connexion requise."); return; }
    setOwnerUserId(user.id);
    const [periods, history] = await Promise.all([
      listingClient.from("property_listing_periods")
        .select("id,property_id,online_from,online_until_exclusive,evidence_kind")
        .eq("property_id", propertyId).order("online_from"),
      listingClient.from("property_listing_history_attestations")
        .select("complete_from").eq("owner_user_id", user.id).maybeSingle(),
    ]);
    if (periods.error || history.error) { setError("Lecture impossible. Vérifiez les droits."); return; }
    setRows(periods.data ?? []);
    setAttested(history.data?.complete_from ?? null);
    setError("");
  }, [propertyId]);
  useEffect(() => { void load(); }, [load]);

  async function addPeriod() {
    if (!from || (until && until <= from) || (!until && !stillOnline) || (until && stillOnline)) {
      setError("Indiquez une date de retrait ou confirmez que le logement est toujours commercialisé.");
      return;
    }
    const payload = { online_from: from, online_until_exclusive: until || null, evidence_kind: evidence };
    const query = listingClient.from("property_listing_periods");
    const { error: writeError } = editingId
      ? await query.update(payload).eq("id", editingId).eq("property_id", propertyId)
      : await query.insert({ property_id: propertyId, ...payload });
    if (writeError) { setError("Période non enregistrée (doublon, chevauchement ou droit absent)."); return; }
    setFrom(""); setUntil(""); setStillOnline(false); setEditingId(null); setConfirmed(false); await load();
  }

  function editPeriod(row: Period) {
    setEditingId(row.id); setFrom(row.online_from);
    setUntil(row.online_until_exclusive ?? "");
    setStillOnline(row.online_until_exclusive === null);
    setEvidence(row.evidence_kind === "platform_record" ? "platform_record" : "owner_attested");
  }

  async function removePeriod(id: string) {
    if (!window.confirm("Retirer cette période historique ? Une nouvelle attestation sera nécessaire.")) return;
    const { error: writeError } = await listingClient.from("property_listing_periods")
      .delete().eq("id", id).eq("property_id", propertyId);
    if (writeError) { setError("Suppression impossible."); return; }
    setConfirmed(false); await load();
  }

  async function attestHistory() {
    if (!confirmed || !knownFrom || !ownerUserId) return;
    const { error: writeError } = await listingClient.from("property_listing_history_attestations")
      .upsert({ owner_user_id: ownerUserId, complete_from: knownFrom,
        attested_by: ownerUserId, attested_at: new Date().toISOString() },
        { onConflict: "owner_user_id" });
    if (writeError) { setError("Attestation impossible."); return; }
    setConfirmed(false); await load();
  }

  return <section aria-label="Périodes de commercialisation">
    <h3>Périodes de commercialisation</h3>
    <p>Saisissez uniquement des dates connues. Une date inconnue reste vide et le taux historique reste non confirmé.</p>
    {error && <p role="alert">{error}</p>}
    <ul>{rows.map(row => <li key={row.id}>
      Du {row.online_from} au {row.online_until_exclusive ?? "toujours commercialisé"} ({row.evidence_kind})
      <button type="button" onClick={() => editPeriod(row)}>Corriger</button>
      <button type="button" onClick={() => void removePeriod(row.id)}>Retirer</button>
    </li>)}</ul>
    <label>Mise en ligne <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
    <label>Retrait (jour exclu) <input type="date" value={until} disabled={stillOnline} onChange={e => setUntil(e.target.value)} /></label>
    <label><input type="checkbox" checked={stillOnline} onChange={e => { setStillOnline(e.target.checked); if (e.target.checked) setUntil(""); }} />Toujours commercialisé actuellement</label>
    <p>Si la date de retrait historique est inconnue, ne créez pas de période ouverte. Laissez l'historique non attesté jusqu'à vérification.</p>
    <label>Source <select value={evidence} onChange={e => setEvidence(e.target.value as typeof evidence)}>
      <option value="owner_attested">Date confirmée par Noa</option>
      <option value="platform_record">Document de plateforme vérifié</option>
    </select></label>
    <button type="button" onClick={() => void addPeriod()}>{editingId ? "Enregistrer la correction" : "Ajouter la période"}</button>
    <p>Historique exhaustif depuis : {attested ?? "non attesté"}. Cette attestation concerne tous les logements de la conciergerie, y compris retirés.</p>
    <label>Début de l'historique vérifié <input type="date" value={knownFrom} onChange={e => setKnownFrom(e.target.value)} /></label>
    <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
      J'ai vérifié les périodes de tous les logements depuis cette date.</label>
    <button type="button" disabled={!confirmed || !knownFrom} onClick={() => void attestHistory()}>Attester l'historique</button>
  </section>;
}
