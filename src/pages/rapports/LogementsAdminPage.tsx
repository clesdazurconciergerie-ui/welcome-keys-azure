import { useState } from "react";
import { useAzurkeysProperties, type AzurkeysProperty } from "@/hooks/useAzurkeysProperties";
import { Loader2, Plus, Pencil, Trash2, Power, X } from "lucide-react";

type FormState = { nom: string; ville: string; proprietaire: string };
const empty: FormState = { nom: "", ville: "Saint-Raphaël", proprietaire: "" };

export default function LogementsAdminPage() {
  const { properties, isLoading, error, create, update, remove, toggleActive } = useAzurkeysProperties();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AzurkeysProperty | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (p: AzurkeysProperty) => {
    setEditing(p);
    setForm({ nom: p.nom, ville: p.ville, proprietaire: p.proprietaire ?? "" });
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    const res = editing
      ? await update(editing.id, {
          nom: form.nom.trim(),
          ville: form.ville.trim() || "Saint-Raphaël",
          proprietaire: form.proprietaire.trim() || null,
        })
      : await create({
          nom: form.nom.trim(),
          ville: form.ville.trim() || "Saint-Raphaël",
          proprietaire: form.proprietaire.trim() || null,
        });
    setSaving(false);
    if (res) close();
  };

  const confirmDelete = async (p: AzurkeysProperty) => {
    if (!window.confirm(`Supprimer définitivement « ${p.nom} » ?`)) return;
    await remove(p.id);
  };

  return (
    <div className="azurkeys-scope max-w-6xl mx-auto px-6 py-12 space-y-10">
      <header className="flex items-end justify-between gap-6 pb-6 border-b border-[hsl(var(--az-line))]">
        <div>
          <p className="az-eyebrow mb-2">Portefeuille</p>
          <h1 className="font-display text-4xl md:text-5xl">Gestion des logements</h1>
          <p className="font-body text-[13px] text-[hsl(var(--az-muted))] mt-3">
            {isLoading ? "Chargement…" : `${properties.length} logement${properties.length > 1 ? "s" : ""} · ${properties.filter(p => p.active).length} actif${properties.filter(p => p.active).length > 1 ? "s" : ""}`}
          </p>
        </div>
        <button className="az-btn-primary" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Ajouter
        </button>
      </header>

      {error && (
        <div className="az-card p-6 font-body text-[13px] text-[hsl(var(--az-muted))]">
          Erreur : {error}. Vérifiez que les tables ont bien été créées via <code>docs/azurkeys-report-schema.sql</code>.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--az-muted))]" />
        </div>
      ) : (
        <div className="az-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(var(--az-line))]">
                {["Logement", "Ville", "Propriétaire", "Statut", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left font-body text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--az-muted))] px-5 py-4 font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-b border-[hsl(var(--az-line))] last:border-0 group hover:bg-[hsl(var(--az-sand))]/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-display text-lg">{p.nom}</div>
                    <div className="font-body text-[11px] text-[hsl(var(--az-muted))] tracking-wide">{p.slug}</div>
                  </td>
                  <td className="px-5 py-4 font-body text-[13px]">{p.ville}</td>
                  <td className="px-5 py-4 font-body text-[13px] text-[hsl(var(--az-muted))]">
                    {p.proprietaire || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        p.active
                          ? "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-[hsl(var(--az-ink))]"
                          : "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-[hsl(var(--az-muted))]"
                      }
                    >
                      <span
                        className={
                          "w-1.5 h-1.5 rounded-full " +
                          (p.active ? "bg-[hsl(var(--az-gold))]" : "bg-[hsl(var(--az-sand-deep))]")
                        }
                      />
                      {p.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleActive(p.id, !p.active)}
                        className="p-2 rounded-full hover:bg-[hsl(var(--az-sand))] text-[hsl(var(--az-muted))] hover:text-[hsl(var(--az-ink))]"
                        title={p.active ? "Désactiver" : "Réactiver"}
                      >
                        <Power className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 rounded-full hover:bg-[hsl(var(--az-sand))] text-[hsl(var(--az-muted))] hover:text-[hsl(var(--az-ink))]"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                      <button
                        onClick={() => confirmDelete(p)}
                        className="p-2 rounded-full hover:bg-[hsl(var(--az-sand))] text-[hsl(var(--az-muted))] hover:text-red-700"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {properties.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center font-body text-[13px] text-[hsl(var(--az-muted))]">
                    Aucun logement pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 azurkeys-scope" onClick={close}>
          <div
            className="bg-[hsl(var(--az-surface))] max-w-md w-full rounded-sm border border-[hsl(var(--az-line))] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[hsl(var(--az-line))]">
              <div>
                <p className="az-eyebrow mb-1">{editing ? "Modification" : "Nouveau"}</p>
                <h2 className="font-display text-2xl">{editing ? "Modifier le logement" : "Ajouter un logement"}</h2>
              </div>
              <button onClick={close} className="p-1.5 rounded-full hover:bg-[hsl(var(--az-sand))]">
                <X className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-5">
              <div>
                <label className="az-label">Nom du logement</label>
                <input
                  autoFocus
                  className="az-input"
                  value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="az-label">Ville</label>
                <input
                  className="az-input"
                  value={form.ville}
                  onChange={(e) => setForm((f) => ({ ...f, ville: e.target.value }))}
                />
              </div>
              <div>
                <label className="az-label">Propriétaire (optionnel)</label>
                <input
                  className="az-input"
                  value={form.proprietaire}
                  onChange={(e) => setForm((f) => ({ ...f, proprietaire: e.target.value }))}
                  placeholder="Nom du propriétaire"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={close} className="az-btn-ghost">
                  Annuler
                </button>
                <button type="submit" className="az-btn-primary" disabled={saving}>
                  {saving ? "…" : editing ? "Enregistrer" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
