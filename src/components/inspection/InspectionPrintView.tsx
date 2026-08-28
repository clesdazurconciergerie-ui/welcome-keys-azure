// MODULE — Template PDF professionnel d'un état des lieux
import {
  ZONE_LABEL, ISSUE_CATEGORY_LABEL, ISSUE_SEVERITY_LABEL, INSPECTION_TYPE_LABEL,
} from "@/lib/inspection-zones";

interface Props {
  inspection: any;
  zones: any[];
  issues: any[];
  photos: any[];
  conciergeSignature?: string | null;
  guestSignature?: string | null;
  companyName?: string;
  logoUrl?: string | null;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export function InspectionPrintView({
  inspection, zones, issues, photos, conciergeSignature, guestSignature,
  companyName = "Azurkeys Properties", logoUrl,
}: Props) {
  const stay = inspection.booking
    ? `${fmt(inspection.booking.check_in)} → ${fmt(inspection.booking.check_out)}`
    : "—";

  return (
    <div
      id="inspection-print-view"
      style={{ width: "794px", background: "#ffffff", color: "#09090B", padding: "32px", fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <header style={{ borderBottom: "1px solid #09090B", paddingBottom: 12, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: 40, marginBottom: 8 }} />}
          <div style={{ fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase" }}>{companyName}</div>
          <div style={{ fontSize: 11, color: "#555" }}>Rapport d'état des lieux</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11 }}>
          <div><strong>Réf.</strong> {inspection.reference ?? "—"}</div>
          <div>{INSPECTION_TYPE_LABEL[inspection.inspection_type] ?? inspection.inspection_type}</div>
          <div>{fmt(inspection.official_date)}</div>
        </div>
      </header>

      <section style={{ marginBottom: 20 }}>
        <SectionTitle>Informations</SectionTitle>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <tbody>
            <Tr label="Bien" value={inspection.property?.name ?? "—"} />
            <Tr label="Adresse" value={[inspection.property?.address, inspection.property?.city].filter(Boolean).join(", ") || "—"} />
            <Tr label="Voyageur" value={inspection.guest_name ?? inspection.booking?.guest_name ?? "—"} />
            <Tr label="Séjour" value={stay} />
            <Tr label="Réalisé par" value={inspection.inspector_name ?? "—"} />
            <Tr label="Créé le" value={new Date(inspection.actual_created_at ?? inspection.created_at).toLocaleString("fr-FR")} />
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 20 }}>
        <SectionTitle>État des zones</SectionTitle>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} style={{ borderBottom: "1px solid #E5E5E5" }}>
                <td style={{ padding: "6px 0" }}>{ZONE_LABEL[z.zone_key] ?? z.zone_label}</td>
                <td style={{ padding: "6px 0", textAlign: "right" }}>
                  {z.status === "ok" ? "✓ Conforme" : z.status === "issue" ? "⚠ Problème signalé" : "• Non contrôlée"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {zones.filter((z) => z.note).map((z) => (
          <p key={`n-${z.id}`} style={{ fontSize: 11, marginTop: 6 }}>
            <strong>{ZONE_LABEL[z.zone_key] ?? z.zone_label} :</strong> {z.note}
          </p>
        ))}
      </section>

      <section style={{ marginBottom: 20 }}>
        <SectionTitle>Anomalies ({issues.length})</SectionTitle>
        {issues.length === 0 ? (
          <p style={{ fontSize: 12 }}>Aucune anomalie constatée.</p>
        ) : (
          issues.map((i) => (
            <div key={i.id} style={{ border: "1px solid #09090B", padding: 8, marginBottom: 6, fontSize: 11 }}>
              <strong>{ZONE_LABEL[i.zone_key] ?? i.zone_key}</strong>{" — "}
              {ISSUE_CATEGORY_LABEL[i.category] ?? i.category} · Niveau : {ISSUE_SEVERITY_LABEL[i.severity] ?? i.severity}
              {i.comment && <div style={{ marginTop: 4 }}>{i.comment}</div>}
            </div>
          ))
        )}
      </section>

      {photos.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <SectionTitle>Photos jointes ({photos.filter((p) => p.media_type !== "video").length})</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {photos.filter((p) => p.media_type !== "video").map((p) => (
              <figure key={p.id} style={{ width: 170, margin: 0 }}>
                <img src={p.file_url} alt="" crossOrigin="anonymous" style={{ width: 170, height: 120, objectFit: "cover", border: "1px solid #E5E5E5" }} />
                <figcaption style={{ fontSize: 9, color: "#555" }}>
                  {ZONE_LABEL[p.zone_key ?? ""] ?? p.zone_key ?? ""} · {new Date(p.created_at).toLocaleString("fr-FR")}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {(inspection.general_notes || inspection.notes) && (
        <section style={{ marginBottom: 20 }}>
          <SectionTitle>Notes générales</SectionTitle>
          <p style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{inspection.general_notes || inspection.notes}</p>
        </section>
      )}

      <section style={{ pageBreakInside: "avoid" }}>
        <SectionTitle>Signatures</SectionTitle>
        <p style={{ fontSize: 11, marginBottom: 10 }}>
          Les parties reconnaissent avoir pris connaissance de l'état du logement et des éventuelles observations indiquées ci-dessus.
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          <SignBlock title="Conciergerie" name={inspection.concierge_signer_name ?? inspection.inspector_name} src={conciergeSignature} />
          <SignBlock title="Voyageur" name={inspection.guest_signer_name ?? inspection.guest_name} src={guestSignature} />
        </div>
        <p style={{ fontSize: 10, color: "#555", marginTop: 10 }}>
          Signé le {inspection.signed_at ? new Date(inspection.signed_at).toLocaleString("fr-FR") : new Date().toLocaleString("fr-FR")}
        </p>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", borderBottom: "1px solid #09090B", paddingBottom: 4, marginBottom: 10 }}>
      {children}
    </h2>
  );
}

function Tr({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: "1px solid #E5E5E5" }}>
      <td style={{ padding: "5px 0", color: "#555", width: "35%" }}>{label}</td>
      <td style={{ padding: "5px 0" }}>{value}</td>
    </tr>
  );
}

function SignBlock({ title, name, src }: { title: string; name?: string | null; src?: string | null }) {
  return (
    <div style={{ flex: 1, border: "1px solid #09090B", padding: 8 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{title}</div>
      {src ? (
        <img src={src} alt="" crossOrigin="anonymous" style={{ width: "100%", height: 70, objectFit: "contain" }} />
      ) : (
        <div style={{ height: 70 }} />
      )}
      <div style={{ fontSize: 11, borderTop: "1px solid #E5E5E5", paddingTop: 4 }}>{name ?? "—"}</div>
    </div>
  );
}
