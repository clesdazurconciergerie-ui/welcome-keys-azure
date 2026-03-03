import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import BrandMark from "@/components/BrandMark";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Check if demo mode is requested
  const searchParams = new URLSearchParams(window.location.search);
  const isDemoMode = searchParams.get('mode') === 'demo';
  const [defaultTab, setDefaultTab] = useState(isDemoMode ? 'signup' : 'signin');

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();

    // Check if user just verified their email
    const verified = searchParams.get('verified');
    if (verified === 'true') {
      toast.success(
        "✅ Ton email est confirmé ! Tu peux maintenant te connecter depuis n'importe quel appareil.",
        { duration: 5000 }
      );
      // Remove the verified parameter from URL
      window.history.replaceState({}, '', '/auth');
    }
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
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
      
      // If signup successful and session exists, user is auto-logged in
      if (data.session) {
        // If demo mode, activate demo after signup
        if (isDemoMode) {
          try {
            toast.loading("Activation de votre démo gratuite...");
            
            const response = await supabase.functions.invoke('activate-demo', {
              headers: {
                Authorization: `Bearer ${data.session.access_token}`,
              },
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
              
              // Redirection vers la création de livret après un court délai
              setTimeout(() => {
                navigate("/booklets/new");
              }, 1500);
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
        
        // Normal signup with session - redirect to dashboard
        toast.success("Compte créé avec succès ! Bienvenue sur MyWelkom.");
        navigate("/dashboard");
      } else {
        // Email confirmation required - user needs to verify email first
        toast.success("Inscription réussie ! Vérifiez votre email pour confirmer votre compte.");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      // Handle "User already registered" error
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
    if (!email) {
      toast.error("Veuillez saisir votre email");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?verified=true`,
        },
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
    if (!email) {
      toast.error("Veuillez saisir votre email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      toast.success("Email de réinitialisation envoyé ! Vérifiez votre boîte mail.", {
        duration: 5000,
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        // Check if error is due to unverified email
        if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')) {
          toast.error(
            "Votre email n'est pas encore vérifié. Vérifiez votre boîte mail ou cliquez ci-dessous pour renvoyer l'email.",
            { duration: 5000 }
          );
          setLoading(false);
          return;
        }
        // Show clearer error for invalid credentials
        if (error.message.includes('Invalid login credentials')) {
          toast.error(
            "Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.",
            { duration: 5000 }
          );
          setLoading(false);
          return;
        }
        throw error;
      }
      
      // Check if user is a service provider
      const { data: spRecord } = await (supabase as any)
        .from('service_providers')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .eq('status', 'active')
        .maybeSingle();

      // Check if user is an owner (created by concierge)
      const { data: ownerRecord } = await (supabase as any)
        .from('owners')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .eq('status', 'active')
        .maybeSingle();

      toast.success("Connexion réussie !");

      // SP → redirect to SP space
      if (spRecord) {
        navigate("/prestataire");
        return;
      }

      // Owner → redirect to owner space
      if (ownerRecord) {
        navigate("/proprietaire");
        return;
      }

      // Check subscription status for concierge users
      const { data: userData } = await supabase
        .from('users')
        .select('role, subscription_status')
        .eq('id', data.user.id)
        .single();

      // Check for next parameter in URL
      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get('next');

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

      // Default: go to concierge dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Signin error:", error);
      toast.error(error.message || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle gold radial */}
      <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(196, 164, 91, 0.25) 0%, transparent 60%)' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <BrandMark variant="full" showIcon={true} light />
        </div>

        <Card className="shadow-2xl border-0 bg-card">
          <CardHeader className="px-4 sm:px-6 pt-5 sm:pt-6">
            <CardTitle className="text-xl sm:text-2xl">{isDemoMode ? "Créer un compte démo" : "Accès à MyWelkom"}</CardTitle>
            <CardDescription className="text-sm">
              {isDemoMode 
                ? "Créez votre compte et testez MyWelkom gratuitement pendant 30 jours"
                : "Connectez-vous ou créez un compte pour gérer votre conciergerie"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-5 sm:pb-6">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-9 sm:h-10">
                <TabsTrigger value="signin" className="text-xs sm:text-sm">Connexion</TabsTrigger>
                <TabsTrigger value="signup" className="text-xs sm:text-sm">{isDemoMode ? "Démo gratuite" : "Inscription"}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                {!showForgotPassword ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Mot de passe</Label>
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        "Se connecter"
                      )}
                    </Button>
                    
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        disabled={loading}
                      >
                        Email non reçu ? Renvoyer l'email de vérification
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Nous vous enverrons un lien pour réinitialiser votre mot de passe
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        "Envoyer le lien de réinitialisation"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowForgotPassword(false)}
                      disabled={loading}
                    >
                      Retour à la connexion
                    </Button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum 6 caractères
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isDemoMode ? "Création..." : "Inscription..."}
                      </>
                    ) : (
                      isDemoMode ? "🎬 Créer ma démo gratuite" : "Créer un compte"
                    )}
                  </Button>
                  {isDemoMode && (
                    <p className="text-xs text-center text-muted-foreground mt-3">
                      30 jours d'essai gratuit • 1 livret • Aucune carte requise
                    </p>
                  )}
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t text-center">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="text-sm"
              >
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Vous avez un code ?{" "}
            <button
              onClick={() => navigate("/acces-livret")}
              className="text-primary hover:underline font-medium"
            >
              Accéder à un livret
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
