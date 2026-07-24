import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUnifiedExpenses, type UnifiedExpense } from "@/hooks/useUnifiedExpenses";
import { expenseCategories } from "@/hooks/useExpenses";
import { useProperties } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { Plus, Trash2, Upload, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatEUR, expenseStatusLabels, expenseStatusColors } from "@/lib/finance-utils";

const typeLabels: Record<string, string> = {
  expense: "Dépense",
  vendor_payment: "Prestataire",
  mission: "Mission",
};

export function FinanceExpensesTab() {
  const {
    unified, loading, totalPaid, totalToPay, paidByType,
    createExpense, updateExpenseStatus, deleteExpense,
    createVP, updateVPStatus, removeVP,
  } = useUnifiedExpenses();
  const { properties } = useProperties();
  const { owners } = useOwners();
  const { providers: serviceProviders } = useServiceProviders();

  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Expense form
  const [expOpen, setExpOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("other");
  const [propId, setPropId] = useState("none");
  const [ownerId, setOwnerId] = useState("none");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [vatRate, setVatRate] = useState("0");
  const [expStatus, setExpStatus] = useState("paid");
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // VP form
  const [vpOpen, setVpOpen] = useState(false);
  const [vpDesc, setVpDesc] = useState("");
  const [vpAmount, setVpAmount] = useState("");
  const [vpDate, setVpDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [vpProvider, setVpProvider] = useState("none");
  const [vpPropId, setVpPropId] = useState("none");
  const [vpStatus, setVpStatus] = useState("to_pay");

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

  const handleCreateExpense = async () => {
    if (!desc || !amount) return;
    await createExpense({
      description: desc,
      amount: parseFloat(amount),
      category: cat,
      property_id: propId === "none" ? null : propId,
      owner_id: ownerId === "none" ? null : ownerId,
      expense_date: date,
      vat_rate: parseFloat(vatRate) || 0,
      status: expStatus,
      file_url: fileUrl,
    });
    setDesc(""); setAmount(""); setCat("other"); setPropId("none"); setOwnerId("none"); setFileUrl(null); setVatRate("0"); setExpStatus("paid");
    setExpOpen(false);
  };

  const handleCreateVP = async () => {
    if (!vpDesc || !vpAmount) return;
    await createVP({
      description: vpDesc,
      amount: parseFloat(vpAmount),
      date: vpDate,
      provider_id: vpProvider === "none" ? null : vpProvider,
      property_id: vpPropId === "none" ? null : vpPropId,
      status: vpStatus,
    });
    setVpDesc(""); setVpAmount(""); setVpProvider("none"); setVpPropId("none"); setVpStatus("to_pay");
    setVpOpen(false);
  };

  const filtered = unified.filter(u => {
    if (filterType !== "all" && u.type !== filterType) return false;
    if (filterStatus !== "all" && u.status !== filterStatus) return false;
    return true;
  });

  const handleStatusChange = (item: UnifiedExpense) => {
    if (item.type === "expense") updateExpenseStatus((item._source as any).id, "paid");
    else if (item.type === "vendor_payment") updateVPStatus((item._source as any).id, "paid");
  };

  const handleDelete = (item: UnifiedExpense) => {
    if (item.type === "expense") deleteExpense((item._source as any).id);
    else if (item.type === "vendor_payment") removeVP((item._source as any).id);
  };

  const summary = [
    { label: "Manuelles", value: paidByType.expense },
    { label: "Prestataires", value: paidByType.vendor_payment },
    { label: "Missions", value: paidByType.mission || 0 },
    { label: "Total payé", value: totalPaid, hint: totalToPay > 0 ? `À payer ${formatEUR(totalToPay)}` : undefined },
  ];

  return (
    <div className="mt-8 space-y-12 animate-fade-in">
      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
        {summary.map((s, i) => (
          <div
            key={s.label}
            className="group animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">{s.label}</p>
            <p className="text-3xl font-light tracking-tight tabular-nums transition-transform duration-300 group-hover:-translate-y-0.5">
              {formatEUR(s.value)}
            </p>
            <div className="mt-3 w-8 h-px bg-foreground/60 transition-all duration-500 group-hover:w-16" />
            {s.hint && <p className="mt-3 text-[11px] font-mono text-muted-foreground">{s.hint}</p>}
          </div>
        ))}
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/10 pb-4">
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 h-9 rounded-none border-0 border-b border-foreground/30 bg-transparent text-[11px] uppercase tracking-widest focus:ring-0 shadow-none">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="expense">Dépenses</SelectItem>
              <SelectItem value="vendor_payment">Prestataires</SelectItem>
              <SelectItem value="mission">Missions</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9 rounded-none border-0 border-b border-foreground/30 bg-transparent text-[11px] uppercase tracking-widest focus:ring-0 shadow-none">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="to_pay">À payer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={expOpen} onOpenChange={setExpOpen}>
            <DialogTrigger asChild>
              <button className="group inline-flex items-center gap-2 h-9 text-[11px] uppercase tracking-widest border-b border-foreground/30 hover:border-foreground transition-colors">
                <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90 duration-300" strokeWidth={1.5} />
                Dépense
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Description *</Label><Input value={desc} onChange={e => setDesc(e.target.value)} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Montant (€) *</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                  <div><Label>TVA (%)</Label><Input type="number" step="0.1" value={vatRate} onChange={e => setVatRate(e.target.value)} /></div>
                  <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Catégorie</Label>
                    <Select value={cat} onValueChange={setCat}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{expenseCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Statut</Label>
                    <Select value={expStatus} onValueChange={setExpStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to_pay">À payer</SelectItem>
                        <SelectItem value="paid">Payé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Bien (optionnel)</Label>
                    <Select value={propId} onValueChange={setPropId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun (général)</SelectItem>
                        {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Propriétaire (optionnel)</Label>
                    <Select value={ownerId} onValueChange={setOwnerId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.first_name} {o.last_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Justificatif</Label>
                  <label className={cn("relative inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium h-9 px-3 cursor-pointer border border-input bg-background hover:bg-accent mt-1", uploading && "pointer-events-none opacity-50")}>
                    <Upload className="h-4 w-4" />{fileUrl ? "Fichier uploadé ✓" : "Joindre un fichier"}
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload}
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                  </label>
                </div>
                <Button onClick={handleCreateExpense} disabled={!desc || !amount} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={vpOpen} onOpenChange={setVpOpen}>
            <DialogTrigger asChild>
              <button className="group inline-flex items-center gap-2 h-9 px-4 text-[11px] uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 transition-colors">
                <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90 duration-300" strokeWidth={1.5} />
                Paiement prestataire
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Paiement prestataire</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Description *</Label><Input value={vpDesc} onChange={e => setVpDesc(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Montant (€) *</Label><Input type="number" step="0.01" value={vpAmount} onChange={e => setVpAmount(e.target.value)} /></div>
                  <div><Label>Date</Label><Input type="date" value={vpDate} onChange={e => setVpDate(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Prestataire</Label>
                    <Select value={vpProvider} onValueChange={setVpProvider}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {serviceProviders.map(sp => <SelectItem key={sp.id} value={sp.id}>{sp.first_name} {sp.last_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Statut</Label>
                    <Select value={vpStatus} onValueChange={setVpStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to_pay">À payer</SelectItem>
                        <SelectItem value="paid">Payé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Bien (optionnel)</Label>
                  <Select value={vpPropId} onValueChange={setVpPropId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateVP} disabled={!vpDesc || !vpAmount} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Unified list */}
      {loading ? (
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground text-center py-16">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center animate-fade-in">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Aucune dépense trouvée</p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <button onClick={() => setExpOpen(true)} className="text-[11px] uppercase tracking-widest border-b border-foreground/30 hover:border-foreground pb-1">+ Dépense</button>
            <button onClick={() => setVpOpen(true)} className="text-[11px] uppercase tracking-widest border-b border-foreground/30 hover:border-foreground pb-1">+ Paiement</button>
          </div>
        </div>
      ) : (
        <ul>
          {filtered.map((item, i) => (
            <li
              key={item.id}
              className="group flex items-center justify-between gap-4 py-4 border-b border-foreground/10 hover:pl-2 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms`, animationFillMode: "backwards" }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm truncate">{item.description}</p>
                  <span className="text-[9px] px-2 py-0.5 uppercase tracking-widest border border-foreground/20 text-muted-foreground">
                    {typeLabels[item.type]}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate font-mono mt-1">
                  {format(new Date(item.date), "dd MMM yyyy", { locale: fr })}
                  {item.provider_name && <span> · {item.provider_name}</span>}
                  {item.property_name && <span> · {item.property_name}</span>}
                  {item.category && item.type === "expense" && (
                    <span> · {expenseCategories.find(c => c.value === item.category)?.label || item.category}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm font-mono tabular-nums">− {formatEUR(item.amount)}</span>
                <span className={`text-[9px] px-2 py-0.5 uppercase tracking-widest ${expenseStatusColors[item.status] || ""}`}>
                  {expenseStatusLabels[item.status] || item.status}
                </span>
                {item.status === "to_pay" && item.type !== "mission" && (
                  <button
                    onClick={() => handleStatusChange(item)}
                    title="Marquer payé"
                    className="opacity-40 hover:opacity-100 transition-opacity"
                  >
                    <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                )}
                {item.type !== "mission" && (
                  <button
                    onClick={() => handleDelete(item)}
                    title="Supprimer"
                    className="opacity-40 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
