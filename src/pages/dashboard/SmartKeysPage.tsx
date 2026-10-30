// MODULE 4 — Page Smart Keys
import { useState } from "react";
import { useSmartLockProviders, useSmartLocks, useSmartLockCodes, type LockProvider } from "@/hooks/useSmartLocks";
import { useProperties } from "@/hooks/useProperties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { KeyRound, Plus, Battery, Trash2, Lock, Smartphone } from "lucide-react";

const PROVIDERS: { value: LockProvider; label: string }[] = [
  { value: "igloohome", label: "Igloohome" },
  { value: "nuki", label: "Nuki" },
  { value: "ttlock", label: "TTLock" },
  { value: "manual", label: "Saisie manuelle" },
];

export default function SmartKeysPage() {
  const { providers, create: createProvider } = useSmartLockProviders();
  const { locks, isLoading, create: createLock, remove: removeLock } = useSmartLocks();
  const { codes, generate, revoke } = useSmartLockCodes();
  const { properties } = useProperties();
  const [providerOpen, setProviderOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  const [providerForm, setProviderForm] = useState<{ provider: LockProvider; account_label: string }>({ provider: "igloohome", account_label: "" });
  const [lockForm, setLockForm] = useState<any>({ device_name: "", device_type: "smart_lock" });
  const [codeForm, setCodeForm] = useState<any>({ valid_from: "", valid_until: "" });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            Smart Keys — Serrures connectées
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Igloohome, Nuki, TTLock — codes d'accès générés par réservation.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={providerOpen} onOpenChange={setProviderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Smartphone className="h-4 w-4 mr-1" /> Connecter compte</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Connecter un compte serrure</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Fournisseur</Label>
                  <Select value={providerForm.provider} onValueChange={(v: LockProvider) => setProviderForm({ ...providerForm, provider: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Étiquette du compte</Label>
                  <Input value={providerForm.account_label} onChange={(e) => setProviderForm({ ...providerForm, account_label: e.target.value })} placeholder="Ex: Mon compte Igloohome" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Les credentials seront stockés en Vault sécurisé. Configuration OAuth disponible prochainement.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => { createProvider(providerForm); setProviderOpen(false); }}>Connecter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={lockOpen} onOpenChange={setLockOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Ajouter serrure</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle serrure</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nom</Label><Input value={lockForm.device_name} onChange={(e) => setLockForm({ ...lockForm, device_name: e.target.value })} placeholder="Ex: Porte d'entrée Villa A" /></div>
                <div>
                  <Label>Bien associé</Label>
                  <Select value={lockForm.property_id ?? ""} onValueChange={(v) => setLockForm({ ...lockForm, property_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{properties?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Compte (optionnel)</Label>
                  <Select value={lockForm.provider_id ?? ""} onValueChange={(v) => setLockForm({ ...lockForm, provider_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Manuel" /></SelectTrigger>
                    <SelectContent>{providers.map(p => <SelectItem key={p.id} value={p.id}>{p.account_label ?? p.provider}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { createLock(lockForm); setLockOpen(false); setLockForm({ device_name: "", device_type: "smart_lock" }); }}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10"><Lock className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{locks.length}</p><p className="text-xs text-muted-foreground">Serrures</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10"><KeyRound className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold">{codes.filter(c => c.status === "active").length}</p><p className="text-xs text-muted-foreground">Codes actifs</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-500/10"><Smartphone className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold">{providers.filter(p => p.is_connected).length}</p><p className="text-xs text-muted-foreground">Comptes connectés</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Mes serrures</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p>
            : locks.length === 0 ? (
              <div className="text-center py-12">
                <Lock className="h-12 w-12 text-primary/40 mx-auto mb-3" />
                <p className="font-semibold">Aucune serrure configurée</p>
                <p className="text-sm text-muted-foreground mt-1">Connectez votre compte Igloohome ou Nuki pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {locks.map((l) => (
                  <div key={l.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{l.device_name}</span>
                        {l.battery_level !== null && (
                          <Badge variant="outline" className="gap-1"><Battery className="h-3 w-3" /> {l.battery_level}%</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {properties?.find(p => p.id === l.property_id)?.name ?? "Aucun bien"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setCodeForm({ ...codeForm, lock_id: l.id })}>Générer code</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Générer un code PIN</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div><Label>Nom voyageur</Label><Input value={codeForm.guest_name ?? ""} onChange={(e) => setCodeForm({ ...codeForm, guest_name: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label>Valide du</Label><Input type="datetime-local" value={codeForm.valid_from} onChange={(e) => setCodeForm({ ...codeForm, valid_from: e.target.value })} /></div>
                              <div><Label>Au</Label><Input type="datetime-local" value={codeForm.valid_until} onChange={(e) => setCodeForm({ ...codeForm, valid_until: e.target.value })} /></div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => { generate(codeForm); setCodeOpen(false); }}>Générer</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" onClick={() => removeLock(l.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      {codes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Codes récents</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {codes.slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-lg font-bold">{c.pin_code}</code>
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.guest_name ?? "Sans nom"} • {new Date(c.valid_from).toLocaleString("fr-FR")} → {new Date(c.valid_until).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  {c.status === "active" && (
                    <Button variant="ghost" size="sm" onClick={() => revoke(c.id)}>Révoquer</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
