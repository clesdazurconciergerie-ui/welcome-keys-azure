// MODULE — Page de gestion des templates de checklists états des lieux
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, Building2 } from "lucide-react";
import {
  useInspectionTemplates, DEFAULT_ROOMS, PROPERTY_TYPES,
  type InspectionTemplate, type ChecklistRoom,
} from "@/hooks/useInspectionTemplates";
import SEOHead from "@/components/SEOHead";

export default function InspectionTemplatesPage() {
  const { list, upsert, remove } = useInspectionTemplates();
  const [editing, setEditing] = useState<Partial<InspectionTemplate> | null>(null);

  const startNew = () =>
    setEditing({ name: "", property_type: "apartment", description: "", rooms: DEFAULT_ROOMS, is_default: false });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <SEOHead title="Modèles d'états des lieux — Welkom" description="Gérer les checklists par type de bien" />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modèles de checklist</h1>
          <p className="text-sm text-muted-foreground">
            Définissez vos pièces et items par type de bien pour accélérer les états des lieux.
          </p>
        </div>
        <Button onClick={startNew} className="bg-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> Nouveau modèle
        </Button>
      </header>

      {list.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (list.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun modèle encore. Créez-en un pour gagner du temps lors de chaque état des lieux.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.data!.map((t) => {
            const itemsCount = t.rooms.reduce((s, r) => s + (r.items?.length ?? 0), 0);
            return (
              <Card key={t.id}>
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {t.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline">{PROPERTY_TYPES[t.property_type] ?? t.property_type}</Badge>
                      {t.is_default && (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                          Par défaut
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      if (confirm("Supprimer ce modèle ?")) remove.mutate(t.id);
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {t.description && (
                    <p className="text-sm text-muted-foreground mb-2">{t.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t.rooms.length} pièce{t.rooms.length > 1 ? "s" : ""} · {itemsCount} item{itemsCount > 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TemplateEditor
        value={editing}
        onClose={() => setEditing(null)}
        onSave={async (v) => {
          await upsert.mutateAsync(v as any);
          setEditing(null);
        }}
        saving={upsert.isPending}
      />
    </div>
  );
}

function TemplateEditor({
  value, onClose, onSave, saving,
}: {
  value: Partial<InspectionTemplate> | null;
  onClose: () => void;
  onSave: (v: Partial<InspectionTemplate>) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Partial<InspectionTemplate> | null>(value);

  // Sync when value changes
  if (value && draft?.id !== value.id && !draft?.name) {
    // initial open
  }

  // Use a key-based remount via wrapper
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {value && (
          <EditorBody
            initial={value}
            onCancel={onClose}
            onSave={onSave}
            saving={saving}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditorBody({
  initial, onCancel, onSave, saving,
}: {
  initial: Partial<InspectionTemplate>;
  onCancel: () => void;
  onSave: (v: Partial<InspectionTemplate>) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [propertyType, setPropertyType] = useState(initial.property_type ?? "apartment");
  const [description, setDescription] = useState(initial.description ?? "");
  const [isDefault, setIsDefault] = useState(initial.is_default ?? false);
  const [rooms, setRooms] = useState<ChecklistRoom[]>(initial.rooms ?? DEFAULT_ROOMS);

  const updateRoom = (idx: number, patch: Partial<ChecklistRoom>) => {
    setRooms((rs) => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };
  const addRoom = () => setRooms((rs) => [...rs, { name: "Nouvelle pièce", items: [] }]);
  const removeRoom = (idx: number) => setRooms((rs) => rs.filter((_, i) => i !== idx));
  const addItem = (rIdx: number) => updateRoom(rIdx, { items: [...rooms[rIdx].items, { name: "" }] });
  const updateItem = (rIdx: number, iIdx: number, name: string) => {
    const items = rooms[rIdx].items.map((it, i) => i === iIdx ? { ...it, name } : it);
    updateRoom(rIdx, { items });
  };
  const removeItem = (rIdx: number, iIdx: number) => {
    updateRoom(rIdx, { items: rooms[rIdx].items.filter((_, i) => i !== iIdx) });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial.id ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nom du modèle</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Studio standard" />
          </div>
          <div>
            <Label>Type de bien</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROPERTY_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Description (optionnel)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Définir comme modèle par défaut pour ce type de bien
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Pièces & items</h3>
            <Button type="button" size="sm" variant="outline" onClick={addRoom}>
              <Plus className="h-3 w-3 mr-1" /> Pièce
            </Button>
          </div>
          {rooms.map((room, rIdx) => (
            <div key={rIdx} className="border rounded-lg p-3 space-y-2 bg-secondary/30">
              <div className="flex items-center gap-2">
                <Input
                  value={room.name}
                  onChange={(e) => updateRoom(rIdx, { name: e.target.value })}
                  className="font-medium"
                />
                <Button size="icon" variant="ghost" onClick={() => removeRoom(rIdx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-1 pl-2">
                {room.items.map((it, iIdx) => (
                  <div key={iIdx} className="flex items-center gap-2">
                    <Input
                      value={it.name}
                      onChange={(e) => updateItem(rIdx, iIdx, e.target.value)}
                      placeholder="Item à vérifier"
                      className="h-8"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeItem(rIdx, iIdx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="ghost" onClick={() => addItem(rIdx)}>
                  <Plus className="h-3 w-3 mr-1" /> Item
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          onClick={() => onSave({ id: initial.id, name, property_type: propertyType, description, is_default: isDefault, rooms })}
          disabled={saving || !name.trim()}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </>
  );
}
