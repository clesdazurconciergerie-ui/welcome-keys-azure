// MODULE — Estimation locative · document du rapport propriétaire (A4 portrait).
// Rendu pur : aucune donnée n'est calculée ici, tout vient de `EstimationReportData`.
import { Fragment, type ReactNode } from "react";
import "@/styles/estimation-report.css";
import {
  formatDateFr, formatDistance, formatEur, formatPct, UNAVAILABLE, UNKNOWN,
  type EstimationReportData, type ReportPageKey, type ReportSeason, type ReportComparable,
} from "@/lib/estimation-locative/report-data";

interface Props {
  data: EstimationReportData;
  /** URL résolue (signée ou data-url) par identifiant de photo. */
  photoUrls: Record<string, string>;
  preview?: boolean;
}

const NA = <span className="er-na">{UNAVAILABLE}</span>;

function Page({ data, index, total, title, children, className }: {
  data: EstimationReportData; index: number; total: number;
  title?: string; children: ReactNode; className?: string;
}) {
  return (
    <section className={`er-page ${className ?? ""}`}>
      {title && (
        <div className="er-head">
          <span>{title}</span>
          <span>{data.meta.reference}</span>
        </div>
      )}
      {children}
      <div className="er-foot">
        <span>{data.meta.brand} — Estimation locative</span>
        <span>{index} / {total}</span>
      </div>
    </section>
  );
}

const SeasonBlock = ({ s }: { s: ReportSeason }) => (
  <div className="er-season">
    <div className="er-season-label">{s.label}</div>
    <div className="er-season-price">
      {s.price_recommended !== null ? `${formatEur(s.price_recommended)} / nuit` : UNAVAILABLE}
    </div>
    <div className="er-season-range">
      {s.price_min !== null && s.price_max !== null
        ? `Fourchette conseillée ${formatEur(s.price_min)} – ${formatEur(s.price_max)}`
        : "Fourchette non disponible"}
      {s.occupancy_pct !== null ? ` · Occupation estimée ${formatPct(s.occupancy_pct)}` : ""}
    </div>
  </div>
);

const CompRow = ({ c }: { c: ReportComparable }) => (
  <div className="er-comp">
    <div className="er-comp-top">
      <div className="er-comp-name">{c.name ?? "Logement comparable"}</div>
      <div className="er-comp-price">
        {c.displayed_price !== null ? `${formatEur(c.displayed_price)} / nuit affichés` : UNAVAILABLE}
      </div>
    </div>
    <div className="er-small">
      {[
        c.location,
        c.bedrooms !== null ? `${c.bedrooms} chambres` : null,
        c.capacity !== null ? `${c.capacity} personnes` : null,
        ...c.highlights,
        c.similarity_label,
        c.platform,
        c.observed_at ? `observé le ${formatDateFr(c.observed_at)}` : null,
      ].filter(Boolean).join(" · ")}
    </div>
  </div>
);

export default function OwnerReportDocument({ data, photoUrls, preview }: Props) {
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

  const maxMonthly = Math.max(1, ...data.market.monthly_revenue.map((m) => m.revenue));

  return (
    <div id="estimation-report" className={`er-doc ${preview ? "er-preview" : ""}`}>
      {/* ── Couverture ─────────────────────────────────────────── */}
      <section className="er-page er-cover">
        <div className="er-cover-media">
          {data.cover.photo && photoUrls[data.cover.photo.id] && (
            <img src={photoUrls[data.cover.photo.id]} alt={data.meta.address ?? "Logement estimé"} />
          )}
        </div>
        <div className="er-cover-body">
          <div className="er-cover-brand">{data.meta.brand}</div>
          <div className="er-cover-rule" />
          <h1 className="er-cover-title">Estimation locative</h1>
          <p className="er-lead" style={{ marginTop: "4mm" }}>
            {data.meta.address ?? data.meta.property_title ?? "Logement"}
            {data.meta.city ? ` — ${data.meta.city}` : ""}
          </p>
          <div className="er-cover-meta">
            <div>
              {data.meta.owner_name && <div>Préparé pour {data.meta.owner_name}</div>}
              <div className="er-small">Référence {data.meta.reference}</div>
            </div>
            <div className="er-small">{data.meta.date_label}</div>
          </div>
        </div>
      </section>

      {/* ── Synthèse ───────────────────────────────────────────── */}
      {p("synthesis", "Votre potentiel locatif", (
        <>
          <h2 className="er-title">Votre potentiel locatif</h2>
          <p className="er-lead">{data.synthesis.explanation}</p>
          <div className="er-kpis">
            <div className="er-kpi">
              <div className="er-kpi-label">Revenu annuel estimé</div>
              <div className={`er-kpi-value ${data.synthesis.annual_revenue === null ? "er-na" : ""}`}>
                {formatEur(data.synthesis.annual_revenue)}
              </div>
            </div>
            <div className="er-kpi">
              <div className="er-kpi-label">Taux d'occupation</div>
              <div className={`er-kpi-value ${data.synthesis.annual_occupancy_pct === null ? "er-na" : ""}`}>
                {formatPct(data.synthesis.annual_occupancy_pct)}
              </div>
            </div>
            <div className="er-kpi">
              <div className="er-kpi-label">Prix moyen à la nuit</div>
              <div className={`er-kpi-value ${data.synthesis.adr_weighted === null ? "er-na" : ""}`}>
                {formatEur(data.synthesis.adr_weighted)}
              </div>
            </div>
          </div>
          <h3 className="er-h2">Vos tarifs par saison</h3>
          {data.synthesis.seasons.map((s) => <SeasonBlock key={s.key} s={s} />)}
          {data.synthesis.takeaways.length > 0 && (
            <>
              <h3 className="er-h2">À retenir</h3>
              <ul className="er-list">
                {data.synthesis.takeaways.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </>
          )}
        </>
      ))}

      {/* ── Le logement ────────────────────────────────────────── */}
      {p("property", "Le logement", (
        <>
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
                {data.property.amenities.slice(0, 18).map((a) => <span className="er-tag" key={a}>{a}</span>)}
              </div>
            </>
          )}
          {data.property.strengths.length > 0 && (
            <>
              <h3 className="er-h2">Points forts</h3>
              <ul className="er-list">
                {data.property.strengths.slice(0, 5).map((s) => <li key={s}>{s}</li>)}
              </ul>
            </>
          )}
          {data.property.photos.length > 0 && (
            <div className="er-gallery">
              {data.property.photos.filter((ph) => photoUrls[ph.id]).map((ph) => (
                <figure key={ph.id}><img src={photoUrls[ph.id]} alt={ph.category ?? "Photo du logement"} /></figure>
              ))}
            </div>
          )}
        </>
      ))}

      {/* ── Localisation ───────────────────────────────────────── */}
      {p("location", "Localisation", (
        <>
          <h2 className="er-title">Localisation</h2>
          <p className="er-lead">
            {[data.location.address, data.location.district, data.location.city].filter(Boolean).join(" · ") || UNAVAILABLE}
          </p>
          {data.location.distances.length > 0 && (
            <>
              <h3 className="er-h2">Distances</h3>
              <div className="er-facts">
                {data.location.distances.map((d) => (
                  <div className="er-fact" key={d.label}><span>{d.label}</span><span>{d.value}</span></div>
                ))}
              </div>
            </>
          )}
          {data.location.pois.length > 0 && (
            <>
              <h3 className="er-h2">À proximité</h3>
              <ul className="er-list">
                {data.location.pois.slice(0, 10).map((poi) => (
                  <li key={`${poi.name}-${poi.category}`}>
                    {poi.name}
                    <span className="er-small"> — {poi.category}{poi.distance_m !== null ? ` · ${formatDistance(poi.distance_m)}` : ""}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {data.location.notes.length > 0 && (
            <>
              <h3 className="er-h2">Environnement</h3>
              <ul className="er-list">{data.location.notes.slice(0, 6).map((n) => <li key={n}>{n}</li>)}</ul>
            </>
          )}
          {data.location.nuisances.length > 0 && (
            <div className="er-note">
              <div className="er-small">Points à vérifier sur place</div>
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
          <h2 className="er-title">Le marché local</h2>
          <div className="er-kpis">
            <div className="er-kpi">
              <div className="er-kpi-label">Prix moyen observé</div>
              <div className={`er-kpi-value ${data.market.adr === null ? "er-na" : ""}`}>{formatEur(data.market.adr)}</div>
            </div>
            <div className="er-kpi">
              <div className="er-kpi-label">Occupation moyenne</div>
              <div className={`er-kpi-value ${data.market.occupancy_pct === null ? "er-na" : ""}`}>{formatPct(data.market.occupancy_pct)}</div>
            </div>
            <div className="er-kpi">
              <div className="er-kpi-label">Logements comparés</div>
              <div className="er-kpi-value">{data.market.comparables_count}</div>
            </div>
          </div>
          {data.market.monthly_revenue.length > 0 && (
            <>
              <h3 className="er-h2">Saisonnalité observée</h3>
              <div className="er-bars">
                {data.market.monthly_revenue.map((m) => (
                  <div key={m.month} className="er-bar" style={{ height: `${Math.max(4, (m.revenue / maxMonthly) * 100)}%` }} />
                ))}
              </div>
              <div className="er-bar-labels">
                {data.market.monthly_revenue.map((m) => <span key={m.month}>{m.month.slice(0, 3)}</span>)}
              </div>
            </>
          )}
          <h3 className="er-h2">Ce que dit le marché</h3>
          {data.market.context.length > 0
            ? <ul className="er-list">{data.market.context.map((c) => <li key={c}>{c}</li>)}</ul>
            : <p className="er-small">{UNAVAILABLE}</p>}
          <div className="er-note">
            <p className="er-small">{data.comparables.disclaimer}</p>
          </div>
        </>
      ))}

      {/* ── Comparables ────────────────────────────────────────── */}
      {p("comparables", "Les biens comparables", (
        <>
          <h2 className="er-title">Les biens comparables</h2>
          <p className="er-lead">
            Les logements retenus présentent une configuration, une localisation et des prestations proches du vôtre.
          </p>
          {data.comparables.market.length > 0 && (
            <>
              <h3 className="er-h2">Données de marché</h3>
              {data.comparables.market.slice(0, 6).map((c) => <CompRow key={c.id} c={c} />)}
            </>
          )}
          {data.comparables.online.length > 0 && (
            <>
              <h3 className="er-h2">Annonces observées en ligne</h3>
              {data.comparables.online.slice(0, 6).map((c) => <CompRow key={c.id} c={c} />)}
            </>
          )}
          <div className="er-note"><p className="er-small">{data.conclusion.comparables_disclaimer}</p></div>
        </>
      ))}

      {/* ── Stratégie tarifaire ────────────────────────────────── */}
      {p("pricing", "Notre stratégie tarifaire", (
        <>
          <h2 className="er-title">Notre stratégie tarifaire</h2>
          <p className="er-lead">{data.pricing.explanation}</p>
          {data.pricing.seasons.map((s) => (
            <Fragment key={s.key}>
              <SeasonBlock s={s} />
              <p className="er-small" style={{ marginTop: "-2mm" }}>
                {s.nights_sellable !== null ? `${s.nights_sellable} nuits commercialisables` : ""}
                {s.nights_booked !== null ? ` · ${s.nights_booked} nuits louées estimées` : ""}
                {s.revenue !== null ? ` · ${formatEur(s.revenue)} de revenu estimé` : ""}
              </p>
            </Fragment>
          ))}
        </>
      ))}

      {/* ── Projection annuelle ────────────────────────────────── */}
      {p("projection", "Projection annuelle", (
        <>
          <h2 className="er-title">Projection annuelle</h2>
          <table className="er-table">
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
              {data.projection.rows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td className="er-num">{Math.round(r.nights)}</td>
                  <td className="er-num">{formatPct(r.occupancy_pct)}</td>
                  <td className="er-num">{formatEur(r.adr)}</td>
                  <td className="er-num">{formatEur(r.revenue)}</td>
                </tr>
              ))}
              <tr>
                <td><strong>Total annuel</strong></td>
                <td className="er-num">{data.projection.nights_booked !== null ? Math.round(data.projection.nights_booked) : "—"}</td>
                <td className="er-num">{formatPct(data.projection.annual_occupancy_pct)}</td>
                <td className="er-num">{formatEur(data.projection.adr_weighted)}</td>
                <td className="er-num"><strong>{formatEur(data.projection.annual_revenue)}</strong></td>
              </tr>
            </tbody>
          </table>
          <div className="er-note"><p className="er-small">{data.conclusion.disclaimer}</p></div>
        </>
      ))}

      {/* ── Positionnement ─────────────────────────────────────── */}
      {p("positioning", "Positionnement du bien", (
        <>
          <h2 className="er-title">Positionnement du bien</h2>
          {data.positioning.label && (
            <p className="er-subtitle" style={{ marginBottom: "4mm" }}>{data.positioning.label}</p>
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
              <ul className="er-list">{data.positioning.differentiators.slice(0, 6).map((a) => <li key={a}>{a}</li>)}</ul>
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
        </>
      ))}

      {/* ── Recommandations ────────────────────────────────────── */}
      {p("recommendations", "Nos recommandations", (
        <>
          <h2 className="er-title">Nos recommandations</h2>
          <p className="er-lead">
            Ces actions visent à renforcer l'attractivité du logement et son potentiel de revenus.
          </p>
          <table className="er-table" style={{ marginTop: "5mm" }}>
            <thead><tr><th>Action</th><th>Pourquoi</th><th>Priorité</th></tr></thead>
            <tbody>
              {data.recommendations.slice(0, 10).map((r, i) => (
                <tr key={`${r.label}-${i}`}>
                  <td>{r.label}</td>
                  <td>{r.rationale ?? "—"}</td>
                  <td>{r.priority === "high" ? "Élevée" : r.priority === "low" ? "Faible" : "Moyenne"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ))}

      {/* ── Méthode ────────────────────────────────────────────── */}
      {p("method", "Notre méthode", (
        <>
          <h2 className="er-title">Notre méthode</h2>
          <p className="er-lead">
            De l'estimation à la mise en location, chaque étape est prise en charge par {data.meta.brand}.
          </p>
          <div className="er-steps" style={{ marginTop: "6mm" }}>
            {data.method.map((m) => (
              <div className="er-step" key={m.step}>
                <div className="er-step-num">{m.step}</div>
                <div>{m.label}</div>
              </div>
            ))}
          </div>
        </>
      ))}

      {/* ── Et maintenant ? ────────────────────────────────────── */}
      {p("conclusion", "Et maintenant ?", (
        <>
          <h2 className="er-title">Et maintenant ?</h2>
          <div className="er-steps" style={{ marginTop: "4mm" }}>
            {data.conclusion.steps.map((s, i) => (
              <div className="er-step" key={s}>
                <div className="er-step-num">{String(i + 1).padStart(2, "0")}</div>
                <div>{s}</div>
              </div>
            ))}
          </div>
          <h3 className="er-h2">Nous contacter</h3>
          <p className="er-lead">
            {[data.conclusion.agency.name ?? data.meta.brand, data.conclusion.agency.address,
              data.conclusion.agency.city, data.conclusion.agency.phone, data.conclusion.agency.email]
              .filter(Boolean).join(" · ")}
          </p>
          <div className="er-note">
            <p className="er-small">{data.conclusion.disclaimer}</p>
            <p className="er-small" style={{ marginTop: "2mm" }}>{data.conclusion.comparables_disclaimer}</p>
          </div>
        </>
      ))}
    </div>
  );
}
