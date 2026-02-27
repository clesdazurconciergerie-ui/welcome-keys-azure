import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";
import type { OwnerFormData } from "@/hooks/useOwners";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OwnerFormData) => Promise<any>;
}

interface PropertyOption {
  id: string;
  name: string;
}

export function CreateOwnerDialog({ open, onOpenChange, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [form, setForm] = useState<OwnerFormData>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    notes: "",
    property_ids: [],
  });

  useEffect(() => {
    if (open) {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await (supabase as any)
          .from("properties")
          .select("id, name")
          .eq("user_id", user.id)
          .order("name");
        setProperties(data || []);
      })();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.password) return;
    if (form.password.length < 6) return;
    if (!form.property_ids?.length) return;
    setLoading(true);
    const result = await onSubmit(form);
    setLoading(false);
    if (result) {
      setForm({ first_name: "", last_name: "", email: "", password: "", phone: "", notes: "", property_ids: [] });
      onOpenChange(false);
    }
  };

  const toggleProperty = (id: string) => {
    setForm(prev => ({
      ...prev,
      property_ids: prev.property_ids?.includes(id)
        ? prev.property_ids.filter(b => b !== id)
        : [...(prev.property_ids || []), id],
    }));
  };

  const noProperties = properties.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un compte propriétaire</DialogTitle>
          <DialogDescription>Le propriétaire pourra se connecter avec son email et le mot de passe que vous définissez.</DialogDescription>
        </DialogHeader>

        {noProperties ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-2">Vous devez d'abord créer au moins un bien avant de pouvoir ajouter un propriétaire.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input id="first_name" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} required maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Nom *</Label>
                <Input id="last_name" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} required maxLength={100} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (identifiant de connexion) *</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  minLength={6}
                  maxLength={72}
                  placeholder="Min. 6 caractères"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && form.password.length < 6 && (
                <p className="text-xs text-destructive">Minimum 6 caractères</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} maxLength={20} />
            </div>

            <div className="space-y-2">
              <Label>Bien(s) associé(s) *</Label>
              <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-3">
                {properties.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.property_ids?.includes(p.id)}
                      onCheckedChange={() => toggleProperty(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              {!form.property_ids?.length && (
                <p className="text-xs text-destructive">Sélectionnez au moins un bien</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes internes</Label>
              <Textarea id="notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} maxLength={1000} placeholder="Notes visibles uniquement par la conciergerie" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={loading || !form.property_ids?.length || form.password.length < 6} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer le compte
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
