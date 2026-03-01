import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUnifiedExpenses, type UnifiedExpense } from "@/hooks/useUnifiedExpenses";
import { expenseCategories } from "@/hooks/useExpenses";
import { useProperties } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { Plus, Receipt, Trash2, Upload, Users, CheckCircle, Wrench, HardHat } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatEUR, expenseStatusLabels, expenseStatusColors } from "@/lib/finance-utils";

const typeLabels: Record<string, string> = {
  expense: "Dépense",
  vendor_payment: "Prestataire",
  intervention: "Intervention",
};

const typeIcons: Record<string, React.ReactNode> = {
  expense: <Receipt className="h-4 w-4 text-red-400" />,
  vendor_payment: <Users className="h-4 w-4 text-primary" />,
  intervention: <HardHat className="h-4 w-4 text-amber-500" />,
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

  // Filter state
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

  // Filter
  const filtered = unified.filter(u => {
    if (filterType !== "all" && u.type !== filterType) return false;
    if (filterStatus !== "all" && u.status !== filterStatus) return false;
    return true;
  });

  const handleStatusChange = (item: UnifiedExpense) => {
    if (item.type === "expense") {
      const src = item._source as any;
      updateExpenseStatus(src.id, "paid");
    } else if (item.type === "vendor_payment") {
      const src = item._source as any;
      updateVPStatus(src.id, "paid");
    }
    // interventions are already paid
  };

  const handleDelete = (item: UnifiedExpense) => {
    if (item.type === "expense") {
      const src = item._source as any;
      deleteExpense(src.id);
    } else if (item.type === "vendor_payment") {
      const src = item._source as any;
      removeVP(src.id);
    }
    // interventions can't be deleted from here
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Dépenses manuelles</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatEUR(paidByType.expense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Prestataires</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatEUR(paidByType.vendor_payment)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Interventions</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatEUR(paidByType.intervention)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total payé</p>
            <p className="text-xl font-bold mt-1">{formatEUR(totalPaid)}</p>
            {totalToPay > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">À payer: {formatEUR(totalToPay)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="expense">Dépenses</SelectItem>
              <SelectItem value="vendor_payment">Prestataires</SelectItem>
              <SelectItem value="intervention">Interventions</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="to_pay">À payer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* New Expense */}
          <Dialog open={expOpen} onOpenChange={setExpOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 h-9"><Plus className="h-4 w-4" />Dépense</Button>
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

          {/* New VP */}
          <Dialog open={vpOpen} onOpenChange={setVpOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-9"><Plus className="h-4 w-4" />Paiement prestataire</Button>
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

      {/* Unified List */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucune dépense trouvée</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setExpOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />Dépense
              </Button>
              <Button variant="outline" size="sm" onClick={() => setVpOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />Paiement
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {typeIcons[item.type]}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <Badge variant="outline" className="text-[9px]">{typeLabels[item.type]}</Badge>
                      <span>{format(new Date(item.date), "dd/MM/yyyy")}</span>
                      {item.provider_name && <span>• {item.provider_name}</span>}
                      {item.property_name && <span>• {item.property_name}</span>}
                      {item.category && item.type === "expense" && (
                        <Badge variant="outline" className="text-[9px]">
                          {expenseCategories.find(c => c.value === item.category)?.label || item.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-sm font-bold text-red-500">-{formatEUR(item.amount)}</p>
                  <Badge className={`text-[10px] ${expenseStatusColors[item.status] || ""}`}>
                    {expenseStatusLabels[item.status] || item.status}
                  </Badge>
                  {item.status === "to_pay" && item.type !== "intervention" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStatusChange(item)} title="Marquer payé">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </Button>
                  )}
                  {item.type !== "intervention" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item)} title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
