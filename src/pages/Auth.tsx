import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const redirectAuthenticatedUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [{ data: provider }, { data: owner }] = await Promise.all([
        supabase.from("service_providers").select("id")
          .eq("provider_user_id", session.user.id).eq("status", "active").maybeSingle(),
        supabase.from("owners").select("id")
          .eq("auth_user_id", session.user.id).eq("status", "active").maybeSingle(),
      ]);

      if (provider) navigate("/prestataire", { replace: true });
      else if (owner) navigate("/proprietaire", { replace: true });
      else navigate("/dashboard", { replace: true });
    };

    void redirectAuthenticatedUser();
  }, [navigate]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error("Renseignez votre email et votre mot de passe.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      const [{ data: provider }, { data: owner }] = await Promise.all([
        supabase.from("service_providers").select("id")
          .eq("provider_user_id", data.user.id).eq("status", "active").maybeSingle(),
        supabase.from("owners").select("id")
          .eq("auth_user_id", data.user.id).eq("status", "active").maybeSingle(),
      ]);

      toast.success("Connexion réussie");
      if (provider) navigate("/prestataire");
      else if (owner) navigate("/proprietaire");
      else navigate("/dashboard");
    } catch (error) {
      console.error("Signin error", error);
      const message = error instanceof Error ? error.message : "";
      toast.error(
        message.includes("Invalid login credentials")
          ? "Email ou mot de passe incorrect."
          : "Connexion impossible pour le moment."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) {
      toast.error("Renseignez votre email.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Le lien de réinitialisation a été envoyé.");
      setShowForgotPassword(false);
    } catch (error) {
      console.error("Password reset error", error);
      toast.error("Impossible d’envoyer le lien pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)]">
      <section className="relative hidden overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.10),transparent_35%)]" />
        <div className="relative"><BrandMark variant="full" showIcon light /></div>
        <div className="relative max-w-xl space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Espace de travail privé</p>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight">
            Pilotez votre conciergerie depuis un seul espace.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-white/55">
            Calendriers, opérations, propriétaires et finances restent réunis dans l’outil interne MyWelkom.
          </p>
          <div className="flex items-center gap-3 border-t border-white/10 pt-5 text-sm text-white/50">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            Accès réservé aux comptes créés par l’administrateur.
          </div>
        </div>
        <p className="relative text-xs text-white/30">MyWelkom · Clés d’Azur</p>
      </section>

      <section className="flex min-h-screen items-center justify-center p-5 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 lg:hidden"><BrandMark variant="full" showIcon light /></div>

          <div className="mb-8">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {showForgotPassword ? "Réinitialiser l’accès" : "Connexion"}
            </h2>
            <p className="mt-2 text-sm text-white/45">
              {showForgotPassword
                ? "Recevez un lien sécurisé par email."
                : "Accédez à votre espace conciergerie, propriétaire ou prestataire."}
            </p>
          </div>

          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-white/70">Email</Label>
                <Input id="forgot-email" type="email" autoComplete="email" value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 border-white/15 bg-white/[0.05] text-white placeholder:text-white/25 focus-visible:ring-white/30"
                  placeholder="votre@email.com" disabled={loading} required />
              </div>
              <Button type="submit" className="h-12 w-full bg-white text-black hover:bg-white/90" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Envoyer le lien
              </Button>
              <button type="button" onClick={() => setShowForgotPassword(false)}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-white/50 transition-colors hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à la connexion
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-white/70">Email</Label>
                <Input id="signin-email" type="email" autoComplete="email" value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 border-white/15 bg-white/[0.05] text-white placeholder:text-white/25 focus-visible:ring-white/30"
                  placeholder="votre@email.com" disabled={loading} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password" className="text-white/70">Mot de passe</Label>
                  <button type="button" onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-white/45 transition-colors hover:text-white">Mot de passe oublié ?</button>
                </div>
                <div className="relative">
                  <Input id="signin-password" type={showPassword ? "text" : "password"}
                    autoComplete="current-password" value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 border-white/15 bg-white/[0.05] pr-12 text-white placeholder:text-white/25 focus-visible:ring-white/30"
                    placeholder="••••••••" disabled={loading} required />
                  <button type="button" onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/35 transition-colors hover:text-white"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="h-12 w-full bg-white text-black hover:bg-white/90" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Se connecter
              </Button>
            </form>
          )}

          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/35">
            Vous avez un code voyageur ?{" "}
            <button onClick={() => navigate("/acces-livret")} className="text-white/70 hover:text-white">
              Ouvrir un livret
            </button>
          </div>
        </motion.div>
      </section>
    </main>
  );
};

export default Auth;
