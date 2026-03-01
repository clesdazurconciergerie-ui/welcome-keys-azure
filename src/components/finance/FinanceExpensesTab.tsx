import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useExpenses, expenseCategories } from "@/hooks/useExpenses";
import { useProperties } from "@/hooks/useProperties";
import { Plus, Receipt, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function FinanceExpensesTab() {
  const { expenses, loading, createExpense, deleteExpense } = useExpenses();
  const { properties } = useProperties();
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("other");
  const [propId, setPropId] = useState("none");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `expenses/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("property-files").upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("property-files").getPublicUrl(path);
      setFileUrl(publicUrl);
    }
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!desc || !amount) return;
    await createExpense({
      description: desc,
      amount: parseFloat(amount),
      category: cat,
      property_id: propId === "none" ? null : propId,
      expense_date: date,
      file_url: fileUrl,
    });
    setDesc(""); setAmount(""); setCat("other"); setPropId("none"); setFileUrl(null);
    setOpen(false);
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dépenses</h2>
          <p className="text-sm text-muted-foreground">Total : {totalExpenses.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))]">
              <Plus className="h-4 w-4" />Ajouter une dépense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>Description</Label><Input value={desc} onChange={e => setDesc(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Montant (€)</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              </div>
              <div><Label>Catégorie</Label>
                <Select value={cat} onValueChange={setCat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{expenseCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Bien (optionnel)</Label>
                <Select value={propId} onValueChange={setPropId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun (général)</SelectItem>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Justificatif</Label>
                <label className={cn("relative inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-9 px-3 cursor-pointer border border-input bg-background hover:bg-accent mt-1", uploading && "pointer-events-none opacity-50")}>
                  <Upload className="h-4 w-4" />{fileUrl ? "Fichier uploadé ✓" : "Joindre un fichier"}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </label>
              </div>
              <Button onClick={handleCreate} disabled={!desc || !amount} className="w-full">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Chargement...</p> : expenses.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">Aucune dépense enregistrée</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {expenses.map(exp => (
            <Card key={exp.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Receipt className="h-5 w-5 text-red-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{exp.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[9px]">{expenseCategories.find(c => c.value === exp.category)?.label || exp.category}</Badge>
                      <span>{format(new Date(exp.expense_date), "dd/MM/yyyy")}</span>
                      {exp.property && <span>• {(exp.property as any).name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-red-600">-{Number(exp.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteExpense(exp.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
