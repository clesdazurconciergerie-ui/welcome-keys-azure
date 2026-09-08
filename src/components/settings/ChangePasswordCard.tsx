import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Loader2, Eye, EyeOff } from "lucide-react";

/**
 * Changement de mot de passe pour un utilisateur déjà connecté.
 * Aucun e-mail, aucune redirection externe : la modification est immédiate.
 */
const ChangePasswordCard = () => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (next !== confirm) {
      toast.error("Les deux nouveaux mots de passe ne sont pas identiques");
      return;
    }
    if (next === current) {
      toast.error("Le nouveau mot de passe doit être différent de l'actuel");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: next,
        // Requis par Supabase pour un changement effectué depuis une session active
        ...(current ? ({ current_password: current } as any) : {}),
      } as any);
      if (error) throw error;

      toast.success("Mot de passe modifié. Il est actif immédiatement.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (/current password/i.test(msg) || /invalid/i.test(msg)) {
        toast.error("Mot de passe actuel incorrect");
      } else if (/should be different/i.test(msg)) {
        toast.error("Le nouveau mot de passe doit être différent de l'actuel");
      } else {
        toast.error(msg || "Modification impossible");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="w-5 h-5 text-primary" />
          Mot de passe
        </CardTitle>
        <CardDescription>
          Modifiez votre mot de passe directement, sans e-mail ni lien externe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="cp-current">Mot de passe actuel</Label>
            <Input
              id="cp-current"
              type={show ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-next">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="cp-next"
                type={show ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={show ? "Masquer" : "Afficher"}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-confirm">Confirmer le nouveau mot de passe</Label>
            <Input
              id="cp-confirm"
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              minLength={8}
              required
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Modification...
              </>
            ) : (
              "Modifier le mot de passe"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
