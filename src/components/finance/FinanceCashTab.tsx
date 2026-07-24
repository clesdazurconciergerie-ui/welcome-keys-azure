import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useCashIncomes } from "@/hooks/useCashIncomes";
import { useProperties } from "@/hooks/useProperties";
import { formatEUR } from "@/lib/finance-utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categoryLabels: Record<string, string> = {
  rental: "Location", cleaning: "Ménage", service: "Prestation",
  tip: "Pourboire", deposit: "Caution", other: "Autre",
};

export function FinanceCashTab() {
  const { incomes, loading, addIncome, deleteIncome } = useCashIncomes();
  const { properties } = useProperties();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("other");
  const [propertyId, setPropertyId] = useState("none");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setAmount(""); setDescription(""); setIncomeDate(new Date().toISOString().slice(0, 10));
    setCategory("other"); setPropertyId("none"); setNotes("");
  };

  const handleAdd = async () => {
    const val = parseFloat(amount);
    if (!val || !description.trim()) return;
    await addIncome({
      amount: val,
      description: description.trim(),
      income_date: incomeDate,
      category,
      property_id: propertyId !== "none" ? propertyId : undefined,
      notes: notes || undefined,
    });
    resetForm();
    setAddOpen(false);
  };

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mt-8 space-y-12 animate-fade-in">
      {/* Header + total */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-foreground/10 pb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Encaissements espèces</p>
          <p className="text-5xl font-light tracking-tight tabular-nums">{formatEUR(total)}</p>
          <div className="mt-3 w-8 h-px bg-foreground/60" />
          <p className="mt-3 text-[11px] text-muted-foreground font-mono">
            {incomes.length} encaissement{incomes.length > 1 ? "s" : ""} enregistré{incomes.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="group inline-flex items-center gap-2 h-9 px-4 text-[11px] uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90 duration-300" strokeWidth={1.5} />
          Ajouter
        </button>
      </div>

      {/* List */}
      {incomes.length === 0 ? (
        <p className="text-center py-20 text-[11px] uppercase tracking-widest text-muted-foreground">
          Aucun encaissement enregistré
        </p>
      ) : (
        <ul>
          {incomes.map((inc, i) => {
            const prop = properties.find(p => p.id === inc.property_id);
            return (
              <li
                key={inc.id}
                className="group flex items-center justify-between gap-4 py-4 border-b border-foreground/10 hover:pl-2 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms`, animationFillMode: "backwards" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm truncate">{inc.description}</p>
                    <span className="text-[9px] px-2 py-0.5 uppercase tracking-widest border border-foreground/20 text-muted-foreground">
                      {categoryLabels[inc.category || "other"] || inc.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate font-mono mt-1">
                    {format(new Date(inc.income_date), "dd MMM yyyy", { locale: fr })}
                    {prop && <span> · {prop.name}</span>}
                    {inc.notes && <span> · {inc.notes}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-mono tabular-nums">+ {formatEUR(Number(inc.amount))}</span>
                  <button
                    onClick={() => setDeleteId(inc.id)}
                    className="opacity-40 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel encaissement espèces</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Montant (€) *</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Description *</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Paiement ménage en espèces" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={incomeDate} onChange={e => setIncomeDate(e.target.value)} />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {properties.length > 0 && (
              <div>
                <Label>Bien (optionnel)</Label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notes (optionnel)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Remarques..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setAddOpen(false); }}>Annuler</Button>
            <Button onClick={handleAdd} disabled={!amount || !description.trim()}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet encaissement ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteIncome(deleteId); setDeleteId(null); }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
