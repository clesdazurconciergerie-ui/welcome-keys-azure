// MODULE — Estimation locative · document du rapport propriétaire (A4 portrait).
// Rendu pur : aucune donnée n'est calculée ici, tout vient de `EstimationReportData`.
// Étape 6 : direction artistique premium monochrome + auto-ajustement des pages.
import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import "@/styles/estimation-report.css";
import {
  formatDateFr, formatDistance, formatEur, formatPct, UNAVAILABLE, UNKNOWN,
  type EstimationReportData, type ReportPageKey, type ReportSeason, type ReportComparable,
  type ReportPhoto,
} from "@/lib/estimation-locative/report-data";

export interface ReportFitReport {
  /** Pages dont le contenu a dû être compressé pour tenir dans le format A4. */
  compressed: { page: number; title: string; scale: number }[];
  /** Pages qui débordent encore malgré la compression (bloquant). */
  overflowing: { page: number; title: string }[];
}

interface Props {
  data: EstimationReportData;
  /** URL résolue (signée ou data-url) par identifiant de photo. */
  photoUrls: Record<string, string>;
  preview?: boolean;
  /** Rapport d'ajustement automatique après mise en page. */
  onFit?: (report: ReportFitReport) => void;
}

/* ─────────────────────────── Blocs ─────────────────────────── */

function Page({ data, index, total, title, children, className }: {
  data: EstimationReportData; index: number; total: number;
  title?: string; children: ReactNode; className?: string;
}) {
  return (
    <section className={`er-page ${className ?? ""}`} data-page={index} data-title={title ?? "Couverture"}>
      {title && (
        <div className="er-head">
          <span>{data.meta.brand}</span>
          <span>{title}</span>
        </div>
      )}
      <div className="er-body">{children}</div>
      <div className="er-foot">
        <span>{data.meta.brand}</span>
        <span className="er-foot-mid">Estimation locative · {data.meta.reference}</span>
        <span>{String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>
    </section>
  );
}

const SeasonCard = ({ s }: { s: ReportSeason }) => (
  <div className="er-season">
    <div className="er-season-label">{s.label}</div>
    <div className={`er-season-price ${s.price_recommended === null ? "er-na" : ""}`}>
      {s.price_recommended !== null ? formatEur(s.price_recommended) : UNKNOWN}
    </div>
    {s.price_recommended !== null && <div className="er-season-unit">par nuit</div>}
    <div className="er-season-meta">
      <div>
        <span>Occupation estimée</span>
        <span className={s.occupancy_pct === null ? "er-na" : "er-num"}>
          {s.occupancy_pct !== null ? formatPct(s.occupancy_pct) : UNKNOWN}
        </span>
      </div>
      <div>
        <span>Fourchette</span>
        <span className={s.price_min === null || s.price_max === null ? "er-na" : "er-num"}>
          {s.price_min !== null && s.price_max !== null
            ? `${formatEur(s.price_min)} – ${formatEur(s.price_max)}`
            : UNKNOWN}
        </span>
      </div>
    </div>
  </div>
);

const Gallery = ({ photos, urls }: { photos: ReportPhoto[]; urls: Record<string, string> }) => {
  const usable = photos.filter((p) => urls[p.id]).slice(0, 4);
  if (usable.length === 0) return null;
  return (
    <div className={`er-gallery er-gallery-${usable.length}`}>
      {usable.map((ph) => (
        <figure className="er-photo" key={ph.id}>
          <img src={urls[ph.id]} alt={ph.category ?? "Photo du logement"} />
        </figure>
      ))}
    </div>
  );
};

/** Position sur un axe 0–100, uniquement si l'information existe réellement. */
function axisPosition(label: string | null, ends: [string[], string[]]): number | null {
  if (!label) return null;
  const l = label.toLowerCase();
  const [low, high] = ends;
  if (high.some((w) => l.includes(w))) return 82;
  if (low.some((w) => l.includes(w))) return 18;
  if (l.includes("intermédiaire") || l.includes("milieu") || l.includes("standard")) return 50;
  return null;
}

const PRIORITY_LABEL: Record<string, string> = { high: "Priorité élevée", medium: "Priorité moyenne", low: "Priorité complémentaire" };

const CompCell = ({ v }: { v: string | null }) => (v ? <>{v}</> : <span className="er-na">{UNKNOWN}</span>);

function ComparablesTable({ rows }: { rows: ReportComparable[] }) {
  return (
    <table className="er-table">
      <colgroup>
        <col style={{ width: "27%" }} />
        <col style={{ width: "20%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "15%" }} />
      </colgroup>
      <thead>
        <tr>
          <th>Bien</th>
          <th>Localisation</th>
          <th className="er-num">Ch.</th>
          <th className="er-num">Capacité</th>
          <th>Caractéristiques</th>
          <th className="er-num">Prix affiché observé</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td>
              <CompCell v={c.name} />
              {c.similarity_label && <div className="er-small">{c.similarity_label}</div>}
            </td>
            <td><CompCell v={c.location} /></td>
            <td className="er-num">{c.bedrooms !== null ? c.bedrooms : <span className="er-na">—</span>}</td>
            <td className="er-num">{c.capacity !== null ? `${c.capacity} pers.` : <span className="er-na">—</span>}</td>
            <td>{c.highlights.length > 0 ? c.highlights.slice(0, 3).join(" · ") : <span className="er-na">{UNKNOWN}</span>}</td>
            <td className="er-num">
              {c.displayed_price !== null ? `${formatEur(c.displayed_price)} / nuit` : <span className="er-na">{UNKNOWN}</span>}
              {(c.platform || c.observed_at) && (
                <div className="er-small">
                  {[c.platform, c.observed_at ? formatDateFr(c.observed_at) : null].filter(Boolean).join(" · ")}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─────────────────────────── Document ─────────────────────────── */

export default function OwnerReportDocument({ data, photoUrls, preview, onFit }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pages = data.pages;
  const total = pages.length;
  const idx = (key: ReportPageKey) => pages.indexOf(key) + 1;
  const has = (key: ReportPageKey) => pages.includes(key);
  const p = (key: ReportPageKey, title: string | undefined, children: ReactNode, className?: string) =>
    has(key) ? (
      <Page key={key} data={data} index={idx(key)} total={total} title={title} className={className}>
        {children}
      </Page>
    ) : null;

  /* Auto-ajustement : aucune page ne doit couper son contenu. */
  const fit = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const compressed: ReportFitReport["compressed"] = [];
    const overflowing: ReportFitReport["overflowing"] = [];
    root.querySelectorAll<HTMLElement>(".er-page").forEach((page) => {
      const body = page.querySelector<HTMLElement>(".er-body");
      if (!body) return;
      body.style.transform = "";
      body.style.width = "";
      const available = body.clientHeight;
      const needed = body.scrollHeight;
      if (available <= 0 || needed <= available + 1) return;
      const scale = Math.max(0.72, available / needed);
      body.style.transform = `scale(${scale})`;
      body.style.width = `${100 / scale}%`;
      const info = { page: Number(page.dataset.page ?? 0), title: page.dataset.title ?? "" };
      compressed.push({ ...info, scale });
      if (needed * scale > available + 2) overflowing.push(info);
    });
    onFit?.({ compressed, overflowing });
  }, [onFit]);

  useLayoutEffect(() => { fit(); });
  useEffect(() => {
    const t = window.setTimeout(fit, 350); // après chargement des polices / images
    return () => window.clearTimeout(t);
  }, [fit, photoUrls, data]);

  const monthly = data.market.monthly_revenue;
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.revenue));
  const projRows = data.projection.rows;
  const maxProjRevenue = Math.max(1, ...projRows.map((r) => r.revenue));
  const coverUrl = data.cover.photo ? photoUrls[data.cover.photo.id] : undefined;
  const galleryPhotos = data.property.photos.filter((ph) => ph.id !== data.cover.photo?.id);

  const priceAxis = axisPosition(data.positioning.label, [
    ["accessible", "économique", "entrée"],
    ["premium", "haut de gamme", "élevé", "luxe"],
  ]);

  return (
    <div id="estimation-report" ref={rootRef} className={`er-doc ${preview ? "er-preview" : ""}`}>
      {/* ── Couverture ─────────────────────────────────────────── */}
      <section className="er-page er-cover" data-page={1} data-title="Couverture">
        <div className={`er-cover-media ${coverUrl ? "" : "er-cover-empty"}`}>
          {coverUrl && <img src={coverUrl} alt={data.meta.address ?? "Logement estimé"} />}
        </div>
        <div className="er-cover-body">
          <div className="er-cover-brand">{data.meta.brand}</div>
          <div className="er-cover-rule" />
          <div className="er-cover-kicker">Dossier confidentiel</div>
          <h1 className="er-cover-title">Estimation<br />locative</h1>
          <div className="er-cover-place">
            {data.meta.property_title && <strong>{data.meta.property_title}</strong>}
            {data.meta.property_title && <br />}
            {data.meta.address ?? ""}
            {data.meta.address && data.meta.city ? <br /> : null}
            {[data.meta.postal_code, data.meta.city].filter(Boolean).join(" ")}
          </div>
          <div className="er-cover-meta">
            <div>{data.meta.owner_name ? `Préparé pour ${data.meta.owner_name}` : ""}</div>
            <div style={{ textAlign: "right" }}>
              <div>{data.meta.date_label}</div>
              <div>Réf. {data.meta.reference}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Synthèse ───────────────────────────────────────────── */}
      {p("synthesis", "Synthèse", (
        <>
          <p className="er-eyebrow">Synthèse</p>
          <h2 className="er-title">Votre potentiel locatif</h2>
          <p className="er-lead">{data.synthesis.explanation}</p>

          <div className="er-hero-kpi">
            <div className="er-kpi-label">Potentiel locatif annuel</div>
            <div className={`er-kpi-value ${data.synthesis.annual_revenue === null ? "er-na" : ""}`}>
              {data.synthesis.annual_revenue !== null ? formatEur(data.synthesis.annual_revenue) : UNKNOWN}
            </div>
            <div className="er-kpi-sub">Revenu locatif brut estimé sur douze mois</div>
          </div>

          <div className="er-kpis er-kpis-2">
            <div className="er-kpi">
              <div className="er-kpi-label">Occupation estimée</div>
              <div className={`er-kpi-value ${data.synthesis.annual_occupancy_pct === null ? "er-na" : ""}`}>
                {data.synthesis.annual_occupancy_pct !== null ? formatPct(data.synthesis.annual_occupancy_pct) : UNKNOWN}
              </div>
            </div>
            <div className="er-kpi">
              <div className="er-kpi-label">Prix moyen pondéré</div>
              <div className={`er-kpi-value ${data.synthesis.adr_weighted === null ? "er-na" : ""}`}>
                {data.synthesis.adr_weighted !== null ? `${formatEur(data.synthesis.adr_weighted)} / nuit` : UNKNOWN}
              </div>
            </div>
          </div>

          <h3 className="er-h2">Vos tarifs par saison</h3>
          <div className="er-seasons">
            {data.synthesis.seasons.map((s) => <SeasonCard key={s.key} s={s} />)}
          </div>

          {data.synthesis.takeaways.length > 0 && (
            <>
              <h3 className="er-h2">À retenir</h3>
              <ul className="er-list">
                {data.synthesis.takeaways.slice(0, 5).map((t) => <li key={t}>{t}</li>)}
              </ul>
            </>
          )}
        </>
      ))}

      {/* ── Le logement ────────────────────────────────────────── */}
      {p("property", "Le logement", (
        <>
          <p className="er-eyebrow">Le bien</p>
          <h2 className="er-title">Le logement</h2>
          <p className="er-subtitle">Caractéristiques retenues</p>
          <div className="er-facts">
            {data.property.facts.map((f) => (
              <div className="er-fact" key={f.key}>
                <span>{f.label}</span>
                <span className={f.value === null ? "er-na" : ""}>{f.value ?? UNKNOWN}</span>
              </div>
            ))}
          </div>

          {data.property.amenities.length > 0 && (
            <>
              <h3 className="er-h2">Équipements</h3>
              <div className="er-tags">
                {data.property.amenities.slice(0, 16).map((a) => <span className="er-tag" key={a}>{a}</span>)}
              </div>
            </>
          )}

          {data.property.strengths.length > 0 && (
            <>
              <h3 className="er-h2">Points forts</h3>
              <ul className="er-list">
                {data.property.strengths.slice(0, 4).map((s) => <li key={s}>{s}</li>)}
              </ul>
            </>
          )}

          {galleryPhotos.length > 0 && (
            <>
              <h3 className="er-h2">Le logement en images</h3>
              <Gallery photos={galleryPhotos} urls={photoUrls} />
            </>
          )}
        </>
      ))}

      {/* ── Localisation ───────────────────────────────────────── */}
      {p("location", "Localisation", (
        <>
          <p className="er-eyebrow">Emplacement</p>
          <h2 className="er-title">Localisation</h2>
          <p className="er-lead">
            {[data.location.address, data.location.district, data.location.city].filter(Boolean).join(" · ") || UNKNOWN}
          </p>

          {data.location.distances.length > 0 && (
            <>
              <h3 className="er-h2">Distances clés</h3>
              <div className="er-facts">
                {data.location.distances.map((d) => (
                  <div className="er-fact" key={d.label}><span>{d.label}</span><span>{d.value}</span></div>
                ))}
              </div>
            </>
          )}

          {data.location.pois.length > 0 && (
            <>
              <h3 className="er-h2">Points d'intérêt à proximité</h3>
              <div className="er-facts">
                {data.location.pois.slice(0, 10).map((poi) => (
                  <div className="er-fact" key={`${poi.name}-${poi.category}`}>
                    <span>{poi.category} — {poi.name}</span>
                    <span className={poi.distance_m === null ? "er-na" : "er-num"}>
                      {poi.distance_m !== null ? formatDistance(poi.distance_m) : UNKNOWN}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {data.location.notes.length > 0 && (
            <>
              <h3 className="er-h2">Environnement</h3>
              <ul className="er-list">{data.location.notes.slice(0, 5).map((n) => <li key={n}>{n}</li>)}</ul>
            </>
          )}

          {data.location.nuisances.length > 0 && (
            <div className="er-note">
              <div className="er-small" style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}>Points à vérifier sur place</div>
              <ul className="er-list er-plain">
                {data.location.nuisances.slice(0, 4).map((n) => <li key={n} className="er-small">{n}</li>)}
              </ul>
            </div>
          )}
        </>
      ))}

      {/* ── Le marché local ────────────────────────────────────── */}
      {p("market", "Le marché local", (
        <>
          <p className="er-eyebrow">Contexte</p>
          <h2 className="er-title">Le marché local</h2>

          <div className="er-kpis">
            <div className="er-kpi">
              <div className="er-kpi-label">Prix moyen observé</div>
              <div className={`er-kpi-value ${data.market.adr === null ? "er-na" : ""}`}>
                {data.market.adr !== null ? formatEur(data.market.adr) : UNKNOWN}
              </div>
            </div>
            <div className="er-kpi">
              <div className="er-kpi-label">Occupation moyenne</div>
              <div className={`er-kpi-value ${data.market.occupancy_pct === null ? "er-na" : ""}`}>
                {data.market.occupancy_pct !== null ? formatPct(data.market.occupancy_pct) : UNKNOWN}
              </div>
            </div>
            <div className="er-kpi">
              <div className="er-kpi-label">Logements comparés</div>
              <div className="er-kpi-value">{data.market.comparables_count}</div>
            </div>
          </div>

          {monthly.length >= 4 && (
            <div className="er-chart">
              <h3 className="er-h2">Saisonnalité observée</h3>
              <div className="er-chart-unit">Revenu mensuel de référence · euros</div>
              <div className="er-bars">
                {monthly.map((m) => (
                  <div key={m.month} className="er-bar" style={{ height: `${Math.max(2, (m.revenue / maxMonthly) * 100)}%` }} />
                ))}
              </div>
              <div className="er-bar-labels">
                {monthly.map((m) => <span key={m.month}>{m.month.slice(0, 3)}</span>)}
              </div>
            </div>
          )}

          {data.market.context.length > 0 && (
            <>
              <h3 className="er-h2">Ce que dit le marché</h3>
              <ul className="er-list">{data.market.context.slice(0, 6).map((c) => <li key={c}>{c}</li>)}</ul>
            </>
          )}

          <div className="er-note"><p className="er-small">{data.comparables.disclaimer}</p></div>
        </>
      ))}

      {/* ── Comparables ────────────────────────────────────────── */}
      {p("comparables", "Les biens comparables", (
        <>
          <p className="er-eyebrow">Références</p>
          <h2 className="er-title">Les biens comparables</h2>
          <p className="er-lead">
            Les logements retenus présentent une configuration, une localisation et des prestations proches du vôtre.
          </p>

          {data.comparables.market.length > 0 && (
            <>
              <h3 className="er-h2">Données de marché</h3>
              <ComparablesTable rows={data.comparables.market.slice(0, 6)} />
            </>
          )}

          {data.comparables.online.length > 0 && (
            <>
              <h3 className="er-h2">Annonces observées en ligne</h3>
              <ComparablesTable rows={data.comparables.online.slice(0, 6)} />
            </>
          )}

          <div className="er-spacer" />
          <div className="er-note"><p className="er-small">{data.conclusion.comparables_disclaimer}</p></div>
        </>
      ))}

      {/* ── Stratégie tarifaire ────────────────────────────────── */}
      {p("pricing", "Notre stratégie tarifaire", (
        <>
          <p className="er-eyebrow">Tarification</p>
          <h2 className="er-title">Notre stratégie tarifaire</h2>
          <p className="er-lead">{data.pricing.explanation}</p>

          <div className="er-seasons">
            {data.pricing.seasons.map((s) => <SeasonCard key={s.key} s={s} />)}
          </div>

          <h3 className="er-h2">Détail par saison</h3>
          <table className="er-table">
            <colgroup>
              <col style={{ width: "34%" }} /><col /><col /><col />
            </colgroup>
            <thead>
              <tr>
                <th>Saison</th>
                <th className="er-num">Nuits commercialisables</th>
                <th className="er-num">Nuits louées estimées</th>
                <th className="er-num">Revenu estimé</th>
              </tr>
            </thead>
            <tbody>
              {data.pricing.seasons.map((s) => (
                <tr key={s.key}>
                  <td>{s.label}</td>
                  <td className="er-num">{s.nights_sellable !== null ? s.nights_sellable : <span className="er-na">{UNKNOWN}</span>}</td>
                  <td className="er-num">{s.nights_booked !== null ? Math.round(s.nights_booked) : <span className="er-na">{UNKNOWN}</span>}</td>
                  <td className="er-num">{s.revenue !== null ? formatEur(s.revenue) : <span className="er-na">{UNKNOWN}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ))}

      {/* ── Projection annuelle ────────────────────────────────── */}
      {p("projection", "Projection annuelle", (
        <>
          <p className="er-eyebrow">Douze mois</p>
          <h2 className="er-title">Projection annuelle</h2>

          <div className="er-hero-kpi">
            <div className="er-kpi-label">Potentiel locatif annuel</div>
            <div className={`er-kpi-value ${data.projection.annual_revenue === null ? "er-na" : ""}`}>
              {data.projection.annual_revenue !== null ? formatEur(data.projection.annual_revenue) : UNKNOWN}
            </div>
          </div>

          <table className="er-table">
            <colgroup><col style={{ width: "30%" }} /><col /><col /><col /><col /></colgroup>
            <thead>
              <tr>
                <th>Période</th>
                <th className="er-num">Nuits louées</th>
                <th className="er-num">Occupation</th>
                <th className="er-num">Prix moyen</th>
                <th className="er-num">Revenu</th>
              </tr>
            </thead>
            <tbody>
              {projRows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td className="er-num">{Math.round(r.nights)}</td>
                  <td className="er-num">{formatPct(r.occupancy_pct)}</td>
                  <td className="er-num">{formatEur(r.adr)}</td>
                  <td className="er-num">{formatEur(r.revenue)}</td>
                </tr>
              ))}
              <tr className="er-total">
                <td>Total annuel</td>
                <td className="er-num">{data.projection.nights_booked !== null ? Math.round(data.projection.nights_booked) : "—"}</td>
                <td className="er-num">{formatPct(data.projection.annual_occupancy_pct)}</td>
                <td className="er-num">{formatEur(data.projection.adr_weighted)}</td>
                <td className="er-num">{formatEur(data.projection.annual_revenue)}</td>
              </tr>
            </tbody>
          </table>

          {projRows.length >= 2 && (
            <div className="er-hbars">
              <h3 className="er-h2">Répartition du revenu par saison</h3>
              <div className="er-chart-unit">Revenu estimé · euros</div>
              {projRows.map((r) => (
                <div className="er-hbar" key={`bar-${r.label}`}>
                  <div className="er-hbar-label">{r.label}</div>
                  <div className="er-hbar-track">
                    <div className="er-hbar-fill" style={{ width: `${Math.max(1, (r.revenue / maxProjRevenue) * 100)}%` }} />
                  </div>
                  <div className="er-hbar-value">{formatEur(r.revenue)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="er-spacer" />
          <div className="er-note"><p className="er-small">{data.conclusion.disclaimer}</p></div>
        </>
      ))}

      {/* ── Positionnement ─────────────────────────────────────── */}
      {p("positioning", "Positionnement du bien", (
        <>
          <p className="er-eyebrow">Marché</p>
          <h2 className="er-title">Positionnement du logement</h2>
          {data.positioning.label && <p className="er-subtitle">{data.positioning.label}</p>}

          {priceAxis !== null && (
            <div className="er-axis">
              <div className="er-axis-title">Positionnement prix</div>
              <div className="er-axis-line"><div className="er-axis-dot" style={{ left: `${priceAxis}%` }} /></div>
              <div className="er-axis-ends"><span>Accessible</span><span>Premium</span></div>
            </div>
          )}

          {data.positioning.advantages.length > 0 && (
            <>
              <h3 className="er-h2">Vos avantages concurrentiels</h3>
              <ul className="er-list">{data.positioning.advantages.slice(0, 6).map((a) => <li key={a}>{a}</li>)}</ul>
            </>
          )}

          {data.positioning.differentiators.length > 0 && (
            <>
              <h3 className="er-h2">Ce qui distingue votre logement</h3>
              <ul className="er-list">{data.positioning.differentiators.slice(0, 5).map((a) => <li key={a}>{a}</li>)}</ul>
            </>
          )}

          {(data.positioning.target_primary || data.positioning.target_secondary.length > 0) && (
            <>
              <h3 className="er-h2">Clientèle cible</h3>
              <p className="er-lead">
                {[data.positioning.target_primary, ...data.positioning.target_secondary].filter(Boolean).join(" · ")}
              </p>
            </>
          )}

          {data.positioning.usp.length > 0 && (
            <>
              <h3 className="er-h2">Proposition de valeur</h3>
              <ul className="er-list">{data.positioning.usp.slice(0, 4).map((u) => <li key={u}>{u}</li>)}</ul>
            </>
          )}
        </>
      ))}

      {/* ── Recommandations ────────────────────────────────────── */}
      {p("recommendations", "Nos recommandations", (
        <>
          <p className="er-eyebrow">Plan d'action</p>
          <h2 className="er-title">Nos recommandations</h2>
          <p className="er-lead">
            Ces actions visent à renforcer l'attractivité du logement et la régularité de ses réservations.
          </p>
          <div className="er-recos">
            {data.recommendations.slice(0, 8).map((r, i) => (
              <div className="er-reco" key={`${r.label}-${i}`}>
                <div className="er-reco-num">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div className="er-reco-prio">{PRIORITY_LABEL[r.priority] ?? "Priorité moyenne"}</div>
                  <div className="er-reco-label">{r.label}</div>
                  {r.rationale && <div className="er-reco-why"><b>Pourquoi :</b> {r.rationale}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      ))}

      {/* ── Méthode ────────────────────────────────────────────── */}
      {p("method", "Notre méthode", (
        <>
          <p className="er-eyebrow">Savoir-faire</p>
          <h2 className="er-title">Notre méthode</h2>
          <p className="er-lead">
            De l'estimation à la mise en location, chaque étape est prise en charge par {data.meta.brand}.
          </p>
          <div className="er-steps">
            {data.method.map((m) => (
              <div className="er-step" key={m.step}>
                <div className="er-step-num">{m.step}</div>
                <div className="er-step-label">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="er-spacer" />
          <div className="er-note"><p className="er-small">{data.conclusion.disclaimer}</p></div>
        </>
      ))}

      {/* ── Et maintenant ? ────────────────────────────────────── */}
      {p("conclusion", "Et maintenant ?", (
        <>
          <p className="er-eyebrow">Prochaines étapes</p>
          <h2 className="er-title">Et maintenant ?</h2>
          <div className="er-steps er-steps-1">
            {data.conclusion.steps.map((s, i) => (
              <div className="er-step" key={s}>
                <div className="er-step-num">{String(i + 1).padStart(2, "0")}</div>
                <div className="er-step-label">{s}</div>
              </div>
            ))}
          </div>
          <h3 className="er-h2">Nous contacter</h3>
          <div className="er-facts er-facts-1" style={{ maxWidth: "110mm" }}>
            {[
              ["Agence", data.conclusion.agency.name ?? data.meta.brand],
              ["Adresse", [data.conclusion.agency.address, data.conclusion.agency.city].filter(Boolean).join(", ") || null],
              ["Téléphone", data.conclusion.agency.phone],
              ["E-mail", data.conclusion.agency.email],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div className="er-fact" key={String(k)}><span>{k}</span><span>{v}</span></div>
            ))}
          </div>
          <div className="er-spacer" />
          <div className="er-note">
            <p className="er-small">{data.conclusion.disclaimer}</p>
            <p className="er-small" style={{ marginTop: "2mm" }}>{data.conclusion.comparables_disclaimer}</p>
          </div>
        </>
      ))}
    </div>
  );
}
