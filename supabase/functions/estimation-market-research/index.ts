// MODULE — Estimation locative · ÉTAPE 4 : recherche de comparables & marché local
// ─────────────────────────────────────────────────────────────────────────────
// Sources : Firecrawl (recherche web publique + lecture de pages accessibles),
// puis structuration par l'IA. Rien n'est inventé (§1) : une donnée absente est
// renvoyée `null`. Les protections techniques ne sont jamais contournées (§32) :
// une page qui refuse la lecture automatique est simplement ignorée.
// Cette fonction NE CALCULE AUCUN PRIX (§26/§34) : elle renvoie des candidats
// bruts que le client qualifie (market-research.ts) avant le moteur.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "google/gemini-3.7-flash";
const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const SEARCH_LIMIT = 8;
const MAX_SCRAPES = 6;

const EXTRACT_RULES = `RÈGLES ABSOLUES :
- Tu n'inventes JAMAIS une donnée. Toute information absente de la source vaut null.
- Un prix affiché reste un prix affiché : ne le convertis jamais en revenu propriétaire.
- Piscine : "privee", "commune", "chauffee", "saisonniere", "aucune" ou null. Une piscine mentionnée sans précision de type reste null.
- Vue : "aucune", "ville", "jardin", "piscine", "montagne", "mer_partielle", "mer_panoramique" ou null. Une vue mer n'est panoramique que si la source le dit.
- Parking : "aucun", "rue", "prive", "garage" ou null. Climatisation : "aucune", "partielle", "totale" ou null.
- Extérieur : "aucun", "balcon", "terrasse", "jardin" ou null.
- Une indisponibilité n'est jamais une réservation.
- Tu réponds UNIQUEMENT en JSON valide, sans markdown.`;

const CANDIDATE_SCHEMA = `{
  "candidates": [{
    "name": string|null, "url": string|null, "platform": "airbnb"|"booking"|"vrbo"|"expedia"|null,
    "property_type": string|null, "bedrooms": number|null, "capacity": number|null,
    "bathrooms": number|null, "surface_m2": number|null, "city": string|null, "district": string|null,
    "lat": number|null, "lng": number|null,
    "pool": string|null, "view": string|null, "parking": string|null, "ac": string|null, "exterior": string|null,
    "amenities": string[], "rating": number|null, "reviews_count": number|null,
    "displayed_price": number|null, "cleaning_fee": number|null, "other_fees": number|null,
    "total_stay_price": number|null, "currency": string|null,
    "price_context": { "nights": number|null, "guests": number|null, "dates": string|null, "notes": string|null },
    "availability_note": string|null, "standing": number|null
  }]
}`;

const LOCAL_SCHEMA = `{
  "pois": [{ "name": string, "category": string, "distance_m": number|null, "source": string|null }],
  "nuisances": [{ "kind": "route"|"autoroute"|"voie_ferree"|"zone_commerciale"|"aeroport"|"port"|"autre", "detail": string|null, "source": string|null }],
  "events": [{ "name": string, "date": string|null, "location": string|null, "source": string|null, "relevance": string|null }]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const estimationId: string | undefined = body?.estimation_id;
    const subject = body?.subject ?? {};
    if (!estimationId) return json({ error: "estimation_id requis" }, 400);

    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!aiKey) return json({ error: "Configuration IA manquante côté serveur." }, 500);
    if (!fcKey) {
      return json({
        error: "La recherche externe n'est pas configurée (aucune source web disponible).",
        sources: [],
      }, 503);
    }

    const city = subject.city ?? "";
    const district = subject.district ?? "";
    const bedrooms = subject.bedrooms ?? null;
    const type = subject.property_type ?? "logement";
    const observedAt = new Date().toISOString();
    const notes: string[] = [];
    const usedSources: string[] = [];

    /* ── 1. Recherche web publique (§2, §3) ─────────────────────────────── */
    const zones = [district, city, ...(Array.isArray(subject.nearby_cities) ? subject.nearby_cities : [])]
      .filter((z: string) => !!z);
    const zoneLabel = zones.slice(0, 3).join(", ") || "Var";
    const queries = [
      `location saisonnière ${type} ${bedrooms ? `${bedrooms} chambres ` : ""}${zoneLabel} site:airbnb.fr`,
      `location vacances ${type} ${zoneLabel} site:booking.com`,
      `location vacances ${type} ${zoneLabel} site:abritel.fr`,
      `location saisonnière ${type} ${bedrooms ? `${bedrooms} chambres ` : ""}${zoneLabel} prix par nuit`,
    ];

    const searchResults: any[] = [];
    for (const q of queries) {
      const r = await firecrawl(fcKey, "/search", {
        query: q, limit: SEARCH_LIMIT, lang: "fr", country: "fr",
      });
      if (!r.ok) { notes.push(`Recherche « ${q.slice(0, 48)}… » indisponible : ${r.error}`); continue; }
      const items = r.data?.data ?? r.data?.web ?? [];
      if (Array.isArray(items)) searchResults.push(...items);
    }

    const seen = new Set<string>();
    const unique = searchResults.filter((r) => {
      const u = String(r?.url ?? "");
      if (!u || seen.has(u)) return false;
      seen.add(u); return true;
    });
    if (unique.length) usedSources.push("firecrawl-search");

    /* ── 2. Lecture des pages réellement accessibles (§32) ──────────────── */
    const pages: { url: string; markdown: string }[] = [];
    for (const r of unique.slice(0, MAX_SCRAPES)) {
      const url = String(r.url);
      const s = await firecrawl(fcKey, "/scrape", {
        url, formats: ["markdown"], onlyMainContent: true,
      });
      if (!s.ok) { notes.push(`Page non lisible (${hostOf(url)}) : ${s.error}`); continue; }
      const md = s.data?.markdown ?? s.data?.data?.markdown ?? "";
      if (md) pages.push({ url, markdown: String(md).slice(0, 12000) });
    }
    if (pages.length) usedSources.push("firecrawl-scrape");

    /* ── 3. Structuration IA des candidats (§14) ────────────────────────── */
    let candidates: any[] = [];
    if (pages.length || unique.length) {
      const material = pages.length
        ? pages.map((p) => `SOURCE ${p.url}\n${p.markdown}`).join("\n\n---\n\n")
        : unique.map((r: any) => `SOURCE ${r.url}\nTITRE ${r.title ?? ""}\n${r.description ?? ""}`).join("\n\n");

      const res = await callAi(aiKey, [
        { role: "system", content: EXTRACT_RULES },
        {
          role: "user",
          content: `Extrait les logements de location courte durée décrits dans ces pages, pour comparer avec un ${type} de ${bedrooms ?? "?"} chambres à ${district || city || "proximité"}.
N'inclus que des annonces de location réellement décrites dans les sources. Ignore les pages de liste sans détail exploitable.
Matériel (extraits web) :
${material.slice(0, 90000)}

Renvoie ce JSON : ${CANDIDATE_SCHEMA}`,
        },
      ]);
      if (res.ok) candidates = Array.isArray(res.data?.candidates) ? res.data.candidates : [];
      else notes.push(`Structuration des annonces impossible : ${res.error}`);
    } else {
      notes.push("Aucun résultat de recherche exploitable.");
    }

    /* ── 4. Contexte local, nuisances, événements (§21, §22, §23) ───────── */
    let local: any = { pois: [], nuisances: [], events: [] };
    const localQuery = `${subject.address ?? ""} ${city} plage centre-ville gare commerces port événements ${new Date().getFullYear()}`.trim();
    const localSearch = await firecrawl(fcKey, "/search", {
      query: localQuery, limit: 6, lang: "fr", country: "fr", scrapeOptions: { formats: ["markdown"] },
    });
    if (localSearch.ok) {
      const items = localSearch.data?.data ?? [];
      const material = (Array.isArray(items) ? items : [])
        .map((r: any) => `SOURCE ${r.url}\n${(r.markdown ?? r.description ?? "").slice(0, 6000)}`)
        .join("\n\n---\n\n");
      const res = await callAi(aiKey, [
        { role: "system", content: `${EXTRACT_RULES}
- Une distance n'est indiquée que si la source la donne, sinon null.
- Une nuisance n'est jamais affirmée : tu signales seulement l'élément observé (route, voie ferrée…).` },
        {
          role: "user",
          content: `Pour un logement situé à ${subject.address ?? ""} ${district} ${city} (Var), relève les points d'intérêt, les éléments pouvant générer des nuisances et les événements locaux à venir (Saint-Raphaël, Fréjus, Roquebrune-sur-Argens, Les Issambres, Sainte-Maxime, Le Trayas et communes proches).
Matériel :
${material.slice(0, 60000)}

Renvoie ce JSON : ${LOCAL_SCHEMA}`,
        },
      ]);
      if (res.ok) local = res.data ?? local;
      else notes.push(`Contexte local indisponible : ${res.error}`);
    } else {
      notes.push(`Recherche locale indisponible : ${localSearch.error}`);
    }

    return json({
      success: true,
      observed_at: observedAt,
      candidates,
      local,
      searched: unique.length,
      scraped: pages.length,
      sources: usedSources,
      notes,
      model: MODEL,
    });
  } catch (err) {
    console.error("estimation-market-research", (err as Error).message);
    return json({ error: "Erreur inattendue pendant la recherche de marché." }, 500);
  }
});

function hostOf(url: string) {
  try { return new URL(url).host; } catch { return url.slice(0, 40); }
}

async function firecrawl(key: string, path: string, payload: unknown): Promise<
  { ok: true; data: any } | { ok: false; status: number; error: string }
> {
  try {
    const resp = await fetch(`${FIRECRAWL_V2}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.error("firecrawl", path, resp.status, text.slice(0, 300));
      // §32 : une source qui refuse l'accès automatique est ignorée, pas contournée.
      return { ok: false, status: resp.status, error: `source indisponible (${resp.status})` };
    }
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    console.error("firecrawl fetch failed", (e as Error).message);
    return { ok: false, status: 502, error: "source injoignable" };
  }
}

async function callAi(key: string, messages: unknown[]): Promise<
  { ok: true; data: any } | { ok: false; status: number; error: string }
> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages, response_format: { type: "json_object" } }),
    });
    if (resp.status === 429) return { ok: false, status: 429, error: "429 — limite IA atteinte, réessaie dans un instant." };
    if (resp.status === 402) return { ok: false, status: 402, error: "402 — crédits IA épuisés." };
    if (!resp.ok) {
      const t = await resp.text();
      console.error("gateway error", resp.status, t.slice(0, 300));
      return { ok: false, status: resp.status, error: `Erreur IA ${resp.status}` };
    }
    const payload = await resp.json();
    const content = String(payload?.choices?.[0]?.message?.content ?? "")
      .replace(/```json\s*/g, "").replace(/```/g, "").trim();
    try { return { ok: true, data: JSON.parse(content) }; }
    catch { return { ok: false, status: 502, error: "Réponse IA illisible." }; }
  } catch (e) {
    console.error("gateway fetch failed", (e as Error).message);
    return { ok: false, status: 502, error: "Service IA injoignable." };
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
