import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { OwnerFormData } from "@/hooks/useOwners";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OwnerFormData) => Promise<any>;
}

interface BookletOption {
  id: string;
  property_name: string;
}

export function CreateOwnerDialog({ open, onOpenChange, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [booklets, setBooklets] = useState<BookletOption[]>([]);
  const [form, setForm] = useState<OwnerFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    notes: "",
    booklet_ids: [],
  });

  useEffect(() => {
    if (open) {
      // Fetch user's booklets
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("booklets")
          .select("id, property_name")
          .eq("user_id", user.id)
          .order("property_name");
        setBooklets(data || []);
      })();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email) return;
    setLoading(true);
    const result = await onSubmit(form);
    setLoading(false);
    if (result) {
      setForm({ first_name: "", last_name: "", email: "", phone: "", notes: "", booklet_ids: [] });
      onOpenChange(false);
    }
  };

  const toggleBooklet = (id: string) => {
    setForm(prev => ({
      ...prev,
      booklet_ids: prev.booklet_ids?.includes(id)
        ? prev.booklet_ids.filter(b => b !== id)
        : [...(prev.booklet_ids || []), id],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un compte propriétaire</DialogTitle>
        </DialogHeader>
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
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required maxLength={255} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} maxLength={20} />
          </div>

          {booklets.length > 0 && (
            <div className="space-y-2">
              <Label>Logement(s) associé(s)</Label>
              <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-3">
                {booklets.map(b => (
                  <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.booklet_ids?.includes(b.id)}
                      onCheckedChange={() => toggleBooklet(b.id)}
                    />
                    {b.property_name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes internes</Label>
            <Textarea id="notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} maxLength={1000} placeholder="Notes visibles uniquement par la conciergerie" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={loading} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer le compte
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
