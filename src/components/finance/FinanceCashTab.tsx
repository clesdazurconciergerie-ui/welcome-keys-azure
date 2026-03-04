import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Banknote, Loader2 } from "lucide-react";
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
  const [propertyId, setPropertyId] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setAmount(""); setDescription(""); setIncomeDate(new Date().toISOString().slice(0, 10));
    setCategory("other"); setPropertyId(""); setNotes("");
  };

  const handleAdd = async () => {
    const val = parseFloat(amount);
    if (!val || !description.trim()) return;
    await addIncome({
      amount: val,
      description: description.trim(),
      income_date: incomeDate,
      category,
      property_id: propertyId || undefined,
      notes: notes || undefined,
    });
    resetForm();
    setAddOpen(false);
  };

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Encaissements espèces</h2>
          <p className="text-xs text-muted-foreground">Suivez vos revenus en espèces hors facturation</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {/* Total */}
      <Card>
        <CardContent className="p-5 flex items-center gap-3">
          <Banknote className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total encaissé</p>
            <p className="text-2xl font-bold text-emerald-600">{formatEUR(total)}</p>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {incomes.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
          Aucun encaissement enregistré
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-5 space-y-2">
            {incomes.map(inc => {
              const prop = properties.find(p => p.id === inc.property_id);
              return (
                <div key={inc.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{inc.description}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {categoryLabels[inc.category || "other"] || inc.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{format(new Date(inc.income_date), "dd MMM yyyy", { locale: fr })}</span>
                      {prop && <span>• {prop.name}</span>}
                      {inc.notes && <span>• {inc.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-emerald-600">+{formatEUR(Number(inc.amount))}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(inc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
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
                    <SelectItem value="">Aucun</SelectItem>
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

      {/* Delete dialog */}
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
