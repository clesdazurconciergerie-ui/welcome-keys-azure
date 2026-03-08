import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CalendarDays, BarChart3, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";
import BrandMark from "@/components/BrandMark";

/* ── Floating card with magnetic pull driven by normalized mouse coords ── */
const FloatingCard = ({
  children,
  className = "",
  delay = 0,
  orbit,
  nx,
  ny,
  magnetStrength = 35,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  orbit: { rx: number; ry: number; duration: number; phase: number; tilt: number };
  nx: MotionValue<number>;
  ny: MotionValue<number>;
  magnetStrength?: number;
}) => {
  // nx/ny are -1..1 normalized mouse coords; multiply by per-card strength
  const pullX = useTransform(nx, [-1, 0, 1], [-magnetStrength, 0, magnetStrength]);
  const pullY = useTransform(ny, [-1, 0, 1], [-magnetStrength, 0, magnetStrength]);
  const tiltY = useTransform(nx, [-1, 0, 1], [-8, 0, 8]);
  const tiltX = useTransform(ny, [-1, 0, 1], [8, 0, -8]);

  const sx = useSpring(pullX, { stiffness: 50, damping: 14 });
  const sy = useSpring(pullY, { stiffness: 50, damping: 14 });
  const sRotateX = useSpring(tiltX, { stiffness: 50, damping: 16 });
  const sRotateY = useSpring(tiltY, { stiffness: 50, damping: 16 });

  const { rx, ry, duration, phase, tilt } = orbit;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.4 + delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ x: sx, y: sy, rotateX: sRotateX, rotateY: sRotateY }}
      className={className}
    >
      <motion.div
        animate={{
          x: [0, rx * Math.cos(phase), -rx * 0.6, rx * 0.8 * Math.cos(phase + 1), 0],
          y: [0, -ry, ry * 0.5, -ry * 0.7, 0],
          rotate: [0, tilt, -tilt * 0.6, tilt * 0.4, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
/* ── Premium input wrapper ── */
const PremiumInput = ({
  hasError,
  children,
}: {
  hasError: boolean;
  children: React.ReactNode;
}) => (
  <motion.div
    animate={
      hasError
        ? { x: [0, -6, 6, -4, 4, -2, 2, 0] }
        : {}
    }
    transition={{ duration: 0.5, ease: "easeInOut" }}
    className="relative group"
  >
    {/* Focus glow ring */}
    <div
      className={`absolute -inset-px rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none ${
        hasError
          ? "bg-gradient-to-r from-red-500/30 via-red-400/20 to-red-500/30"
          : "bg-gradient-to-r from-[#C4A45B]/30 via-[#C4A45B]/15 to-[#C4A45B]/30"
      }`}
    />
    <div className="relative">
      {children}
    </div>
  </motion.div>
);

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [errorFields, setErrorFields] = useState<{ email?: boolean; password?: boolean }>({});

  const searchParams = new URLSearchParams(window.location.search);
  const isDemoMode = searchParams.get('mode') === 'demo';
  const [defaultTab] = useState(isDemoMode ? 'signup' : 'signin');

  // Normalized mouse position: -1 to 1 relative to panel center
  const nx = useMotionValue(0); // normalized X
  const ny = useMotionValue(0); // normalized Y
  const panelRef = useRef<HTMLDivElement>(null);

  // Background panel tilt (Layer 1: subtle ~3°)
  const panelRotateX = useSpring(
    useTransform(ny, [-1, 0, 1], [3, 0, -3]),
    { stiffness: 40, damping: 20 }
  );
  const panelRotateY = useSpring(
    useTransform(nx, [-1, 0, 1], [-3, 0, 3]),
    { stiffness: 40, damping: 20 }
  );
  // Content tilt (Layer 2: medium ~5°)
  const contentRotateX = useSpring(
    useTransform(ny, [-1, 0, 1], [5, 0, -5]),
    { stiffness: 50, damping: 18 }
  );
  const contentRotateY = useSpring(
    useTransform(nx, [-1, 0, 1], [-5, 0, 5]),
    { stiffness: 50, damping: 18 }
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Compute -1..1 from panel edges
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    nx.set(x);
    ny.set(y);
  }, [nx, ny]);

  const handleMouseLeave = useCallback(() => {
    nx.set(0);
    ny.set(0);
  }, [nx, ny]);

  // Clear error state when user types
  useEffect(() => {
    if (email) setErrorFields((prev) => ({ ...prev, email: false }));
  }, [email]);
  useEffect(() => {
    if (password) setErrorFields((prev) => ({ ...prev, password: false }));
  }, [password]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();

    const verified = searchParams.get('verified');
    if (verified === 'true') {
      toast.success(
        "✅ Ton email est confirmé ! Tu peux maintenant te connecter depuis n'importe quel appareil.",
        { duration: 5000 }
      );
      window.history.replaceState({}, '', '/auth');
    }
  }, [navigate]);

  const triggerError = (fields: { email?: boolean; password?: boolean }) => {
    setErrorFields(fields);
    setTimeout(() => setErrorFields({}), 2000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      triggerError({ email: !email, password: !password });
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      triggerError({ password: true });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?verified=true`,
        },
      });
      if (error) throw error;
      if (data.session) {
        if (isDemoMode) {
          try {
            toast.loading("Activation de votre démo gratuite...");
            const response = await supabase.functions.invoke('activate-demo', {
              headers: { Authorization: `Bearer ${data.session.access_token}` },
            });
            if (response.error) {
              console.error('Error activating demo:', response.error);
              toast.dismiss();
              toast.warning("Compte créé mais la démo n'a pas pu être activée");
              navigate("/dashboard");
              return;
            } else {
              toast.dismiss();
              toast.success("Démo activée ! Créez votre premier livret...", { duration: 2000 });
              setTimeout(() => { navigate("/booklets/new"); }, 1500);
              return;
            }
          } catch (demoError) {
            console.error('Demo activation error:', demoError);
            toast.dismiss();
            toast.warning("Compte créé mais la démo n'a pas pu être activée");
            navigate("/dashboard");
            return;
          }
        }
        toast.success("Compte créé avec succès ! Bienvenue sur MyWelkom.");
        navigate("/dashboard");
      } else {
        toast.success("Inscription réussie ! Vérifiez votre email pour confirmer votre compte.");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      triggerError({ email: true });
      if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
        toast.error("Cet email est déjà utilisé. Veuillez vous connecter.");
      } else {
        toast.error(error.message || "Une erreur est survenue lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) { toast.error("Veuillez saisir votre email"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth?verified=true` },
      });
      if (error) throw error;
      toast.success("Email de vérification renvoyé ! Vérifiez votre boîte mail.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Veuillez saisir votre email"); triggerError({ email: true }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Email de réinitialisation envoyé ! Vérifiez votre boîte mail.", { duration: 5000 });
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Veuillez remplir tous les champs"); triggerError({ email: !email, password: !password }); return; }
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')) {
          toast.error("Votre email n'est pas encore vérifié. Vérifiez votre boîte mail ou cliquez ci-dessous pour renvoyer l'email.", { duration: 5000 });
          triggerError({ email: true });
          setLoading(false);
          return;
        }
        if (error.message.includes('Invalid login credentials')) {
          toast.error("Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.", { duration: 5000 });
          triggerError({ email: true, password: true });
          setLoading(false);
          return;
        }
        throw error;
      }
      const { data: spRecord } = await (supabase as any).from('service_providers').select('id').eq('auth_user_id', data.user.id).eq('status', 'active').maybeSingle();
      const { data: ownerRecord } = await (supabase as any).from('owners').select('id').eq('auth_user_id', data.user.id).eq('status', 'active').maybeSingle();
      toast.success("Connexion réussie !");
      if (spRecord) { navigate("/prestataire"); return; }
      if (ownerRecord) { navigate("/proprietaire"); return; }
      const { data: userData } = await supabase.from('users').select('role, subscription_status').eq('id', data.user.id).single();
      const sp = new URLSearchParams(window.location.search);
      const next = sp.get('next');
      if (next === '/tarifs') {
        if (userData?.subscription_status !== 'active' || userData?.role === 'free') {
          const baseUrl = "https://buy.stripe.com/cNi5kDeMB6Cd8htgEQ5kk00";
          const url = new URL(baseUrl);
          url.searchParams.set('prefilled_email', data.user.email || '');
          url.searchParams.set('client_reference_id', data.user.id);
          window.location.href = url.toString();
          return;
        }
      }
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Signin error:", error);
      triggerError({ email: true, password: true });
      toast.error(error.message || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  const inputBase = "bg-white/5 border-white/10 text-white placeholder:text-white/30 transition-all duration-300 focus:border-[#C4A45B]/50 focus:ring-[#C4A45B]/20 focus:bg-white/[0.07] focus:shadow-[0_0_15px_-3px_rgba(196,164,91,0.15)] focus:-translate-y-px";
  const inputError = "border-red-500/50 bg-red-500/5 shadow-[0_0_12px_-3px_rgba(239,68,68,0.25)]";
  const labelClasses = "text-white/70 text-sm font-medium";

  const getInputClass = (field: 'email' | 'password', extra = "") =>
    `${inputBase} ${errorFields[field] ? inputError : ""} ${extra}`;

  return (
    <div className="min-h-screen flex bg-[#061452] relative overflow-hidden">
      {/* ── Left brand panel (hidden on mobile) ── */}
      <div
        ref={panelRef}
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background effects — Layer 0 (static) */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#061452] via-[#0a1f6b] to-[#061452]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C4A45B]/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#C4A45B]/5 rounded-full blur-[100px]" />
        </div>

        {/* Layer 1 — Background grid with subtle perspective tilt */}
        <motion.div
          className="absolute inset-0"
          style={{
            rotateX: panelRotateX,
            rotateY: panelRotateY,
            perspective: 1200,
            transformStyle: "preserve-3d",
          }}
        >
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          {/* Subtle dashboard silhouette */}
          <div className="absolute inset-12 rounded-2xl border border-white/[0.04] bg-white/[0.015]" style={{ transform: "translateZ(-40px)" }} />
        </motion.div>

        {/* Layer 2 — Content with medium perspective */}
        <motion.div
          className="relative z-10 max-w-md text-center"
          style={{
            rotateX: contentRotateX,
            rotateY: contentRotateY,
            perspective: 800,
            transformStyle: "preserve-3d",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <BrandMark variant="full" showIcon={true} light />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 text-xl text-white/60 font-light leading-relaxed"
          >
            La plateforme qui pilote<br />
            <span className="text-[#C4A45B] font-medium">votre conciergerie.</span>
          </motion.p>

          {/* Layer 3 — Floating product cards (strongest parallax) */}
          <div className="mt-16 relative h-52" style={{ transformStyle: "preserve-3d" }}>
            <FloatingCard delay={0} orbit={{ rx: 15, ry: 12, duration: 8, phase: 0, tilt: 2.5 }} className="absolute top-0 left-0" mouseX={mouseX} mouseY={mouseY}>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 shadow-lg" style={{ transform: "translateZ(30px)" }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C4A45B]/15">
                  <CalendarDays className="h-4 w-4 text-[#C4A45B]" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-white/80">12 réservations</p>
                  <p className="text-[10px] text-white/40">Cette semaine</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard delay={0.6} orbit={{ rx: -18, ry: 14, duration: 9.5, phase: 1.8, tilt: -3 }} className="absolute top-4 right-0" mouseX={mouseX} mouseY={mouseY}>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 shadow-lg" style={{ transform: "translateZ(20px)" }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-white/80">8 missions</p>
                  <p className="text-[10px] text-white/40">Terminées</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard delay={1.2} orbit={{ rx: 12, ry: -16, duration: 10.5, phase: 3.5, tilt: 2 }} className="absolute bottom-0 left-8" mouseX={mouseX} mouseY={mouseY}>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 shadow-lg" style={{ transform: "translateZ(25px)" }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-white/80">+35% revenus</p>
                  <p className="text-[10px] text-white/40">Ce trimestre</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard delay={1.8} orbit={{ rx: -14, ry: 10, duration: 11, phase: 5.2, tilt: -1.8 }} className="absolute bottom-4 right-4" mouseX={mouseX} mouseY={mouseY}>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 shadow-lg" style={{ transform: "translateZ(15px)" }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C4A45B]/15">
                  <Sparkles className="h-4 w-4 text-[#C4A45B]" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-white/80">98% satisfaction</p>
                  <p className="text-[10px] text-white/40">Voyageurs</p>
                </div>
              </div>
            </FloatingCard>
          </div>
        </motion.div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8 lg:w-1/2">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#C4A45B]/6 rounded-full blur-[150px] lg:hidden" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-center mb-8 lg:hidden">
            <BrandMark variant="full" showIcon={true} light />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/20 relative">
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-[#C4A45B]/40 to-transparent" />

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">
                {isDemoMode ? "Créer un compte démo" : "Accéder à MyWelkom"}
              </h1>
              <p className="mt-1 text-sm text-white/50">
                {isDemoMode
                  ? "Testez MyWelkom gratuitement pendant 30 jours"
                  : "Connectez-vous pour gérer votre conciergerie"}
              </p>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="flex w-full items-center mb-6 bg-white/5 border border-white/10 rounded-lg h-10 p-1 gap-0">
                <TabsTrigger value="signin" className="flex-1 h-full text-xs sm:text-sm text-white/60 data-[state=active]:bg-[#C4A45B]/15 data-[state=active]:text-[#C4A45B] data-[state=active]:shadow-none rounded-md transition-all">
                  Connexion
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1 h-full text-xs sm:text-sm text-white/60 data-[state=active]:bg-[#C4A45B]/15 data-[state=active]:text-[#C4A45B] data-[state=active]:shadow-none rounded-md transition-all">
                  {isDemoMode ? "Démo gratuite" : "Inscription"}
                </TabsTrigger>
              </TabsList>

              {/* ── Sign In ── */}
              <TabsContent value="signin">
                {!showForgotPassword ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="signin-email" className={labelClasses}>Email</Label>
                      <PremiumInput hasError={!!errorFields.email}>
                        <Input id="signin-email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required className={getInputClass('email')} />
                      </PremiumInput>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password" className={labelClasses}>Mot de passe</Label>
                        <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-[#C4A45B]/70 hover:text-[#C4A45B] transition-colors">
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <PremiumInput hasError={!!errorFields.password}>
                        <div className="relative">
                          <Input id="signin-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required className={getInputClass('password', 'pr-10')} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors" aria-label={showPassword ? "Masquer" : "Afficher"} tabIndex={-1}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </PremiumInput>
                    </div>
                    <Button type="submit" className="w-full h-11 bg-gradient-to-r from-[#C4A45B] to-[#d4b96b] text-[#061452] font-semibold hover:shadow-lg hover:shadow-[#C4A45B]/20 hover:-translate-y-0.5 transition-all duration-200" disabled={loading}>
                      {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion...</>) : "Se connecter"}
                    </Button>
                    <div className="text-center mt-3">
                      <button type="button" onClick={handleResendVerification} className="text-xs text-white/40 hover:text-white/60 transition-colors" disabled={loading}>
                        Email non reçu ? Renvoyer l'email de vérification
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="forgot-email" className={labelClasses}>Email</Label>
                      <PremiumInput hasError={!!errorFields.email}>
                        <Input id="forgot-email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required className={getInputClass('email')} />
                      </PremiumInput>
                      <p className="text-xs text-white/40">Nous vous enverrons un lien pour réinitialiser votre mot de passe</p>
                    </div>
                    <Button type="submit" className="w-full h-11 bg-gradient-to-r from-[#C4A45B] to-[#d4b96b] text-[#061452] font-semibold hover:shadow-lg hover:shadow-[#C4A45B]/20 hover:-translate-y-0.5 transition-all duration-200" disabled={loading}>
                      {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi...</>) : "Envoyer le lien"}
                    </Button>
                    <button type="button" onClick={() => setShowForgotPassword(false)} disabled={loading} className="w-full flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors py-2">
                      <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
                    </button>
                  </form>
                )}
              </TabsContent>

              {/* ── Sign Up ── */}
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className={labelClasses}>Email</Label>
                    <PremiumInput hasError={!!errorFields.email}>
                      <Input id="signup-email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required className={getInputClass('email')} />
                    </PremiumInput>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className={labelClasses}>Mot de passe</Label>
                    <PremiumInput hasError={!!errorFields.password}>
                      <div className="relative">
                        <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required className={getInputClass('password', 'pr-10')} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors" aria-label={showPassword ? "Masquer" : "Afficher"} tabIndex={-1}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </PremiumInput>
                    <p className="text-xs text-white/40">Minimum 6 caractères</p>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-[#C4A45B] to-[#d4b96b] text-[#061452] font-semibold hover:shadow-lg hover:shadow-[#C4A45B]/20 hover:-translate-y-0.5 transition-all duration-200" disabled={loading}>
                    {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isDemoMode ? "Création..." : "Inscription..."}</>) : (isDemoMode ? "🎬 Créer ma démo gratuite" : "Créer un compte")}
                  </Button>
                  {isDemoMode && (
                    <p className="text-xs text-center text-white/40 mt-3">
                      30 jours d'essai gratuit • 1 livret • Aucune carte requise
                    </p>
                  )}
                </form>
              </TabsContent>
            </Tabs>

            {/* Footer links */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center gap-3">
              <button onClick={() => navigate("/")} className="text-sm text-white/40 hover:text-white/60 transition-colors flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Retour à l'accueil
              </button>
              <p className="text-xs text-white/30">
                Vous avez un code ?{" "}
                <button onClick={() => navigate("/acces-livret")} className="text-[#C4A45B]/70 hover:text-[#C4A45B] transition-colors font-medium">
                  Accéder à un livret
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
