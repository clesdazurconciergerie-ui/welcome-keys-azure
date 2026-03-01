import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExpenses, expenseCategories } from "@/hooks/useExpenses";
import { useVendorPayments } from "@/hooks/useVendorPayments";
import { useProperties } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { Plus, Receipt, Trash2, Upload, Users, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatEUR, expenseStatusLabels, expenseStatusColors } from "@/lib/finance-utils";

export function FinanceExpensesTab() {
  const { expenses, loading: eLoading, createExpense, updateExpenseStatus, deleteExpense } = useExpenses();
  const { payments: vendorPayments, loading: vpLoading, create: createVP, updateStatus: updateVPStatus, remove: removeVP } = useVendorPayments();
  const { properties } = useProperties();
  const { owners } = useOwners();
  const { providers: serviceProviders } = useServiceProviders();

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

  const totalExpenses = expenses.filter(e => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
  const totalVP = vendorPayments.filter(vp => vp.status === "paid").reduce((s, vp) => s + Number(vp.amount), 0);
  const grandTotal = totalExpenses + totalVP;

  return (
    <div className="space-y-6 mt-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Dépenses (payées)</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatEUR(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Prestataires (payés)</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatEUR(totalVP)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total dépenses</p>
            <p className="text-xl font-bold mt-1">{formatEUR(grandTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList>
          <TabsTrigger value="expenses" className="gap-2"><Receipt className="h-4 w-4" />Dépenses</TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2"><Users className="h-4 w-4" />Prestataires</TabsTrigger>
        </TabsList>

        {/* Manual Expenses */}
        <TabsContent value="expenses">
          <div className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={expOpen} onOpenChange={setExpOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" />Nouvelle dépense</Button>
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
            </div>

            {eLoading ? <p className="text-sm text-muted-foreground">Chargement...</p> : expenses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">Aucune dépense enregistrée</p>
                  <Button className="mt-3 gap-2" variant="outline" onClick={() => setExpOpen(true)}>
                    <Plus className="h-4 w-4" />Ajouter une dépense
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {expenses.map(exp => (
                  <Card key={exp.id} className="hover:shadow-sm transition-shadow">
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
                        <p className="text-sm font-bold text-red-500">-{formatEUR(Number(exp.amount))}</p>
                        <Badge className={`text-[10px] ${expenseStatusColors[exp.status] || ""}`}>
                          {expenseStatusLabels[exp.status] || exp.status}
                        </Badge>
                        {exp.status === "to_pay" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateExpenseStatus(exp.id, "paid")}>
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteExpense(exp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Vendor Payments */}
        <TabsContent value="vendors">
          <div className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={vpOpen} onOpenChange={setVpOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" />Paiement prestataire</Button>
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

            {vpLoading ? <p className="text-sm text-muted-foreground">Chargement...</p> : vendorPayments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">Aucun paiement prestataire</p>
                  <Button className="mt-3 gap-2" variant="outline" onClick={() => setVpOpen(true)}>
                    <Plus className="h-4 w-4" />Ajouter un paiement
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {vendorPayments.map(vp => (
                  <Card key={vp.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Users className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{vp.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {vp.provider && <span>{(vp.provider as any).first_name} {(vp.provider as any).last_name}</span>}
                            <span>{format(new Date(vp.date), "dd/MM/yyyy")}</span>
                            {vp.property && <span>• {(vp.property as any).name}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-red-500">-{formatEUR(Number(vp.amount))}</p>
                        <Badge className={`text-[10px] ${expenseStatusColors[vp.status] || ""}`}>
                          {expenseStatusLabels[vp.status] || vp.status}
                        </Badge>
                        {vp.status === "to_pay" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateVPStatus(vp.id, "paid")}>
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeVP(vp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
