import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import BrandMark from "@/components/BrandMark";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      
      // If demo mode, activate demo after signup
      if (isDemoMode && data.session) {
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
      
      toast.success("Inscription réussie ! Vérifiez votre email pour confirmer votre compte.");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Une erreur est survenue lors de l'inscription");
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
        email,
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
        throw error;
      }
      
      // Check subscription status
      const { data: userData } = await supabase
        .from('users')
        .select('role, subscription_status')
        .eq('id', data.user.id)
        .single();

      toast.success("Connexion réussie !");

      // Check for next parameter in URL
      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get('next');

      if (next === '/tarifs') {
        // If coming from pricing page, check subscription
        if (userData?.subscription_status !== 'active' || userData?.role === 'free') {
          // Redirect to Payment Link if not subscribed
          const baseUrl = "https://buy.stripe.com/cNi5kDeMB6Cd8htgEQ5kk00";
          const url = new URL(baseUrl);
          url.searchParams.set('prefilled_email', data.user.email || '');
          url.searchParams.set('client_reference_id', data.user.id);
          window.location.href = url.toString();
          return;
        }
      }

      // Default: go to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Signin error:", error);
      toast.error(error.message || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandMark variant="full" showIcon={true} />
        </div>

        <Card className="glass shadow-premium border-0">
          <CardHeader>
            <CardTitle>{isDemoMode ? "Créer un compte démo" : "Accès"}</CardTitle>
            <CardDescription>
              {isDemoMode 
                ? "Créez votre compte et testez Welkom gratuitement pendant 7 jours"
                : "Connectez-vous ou créez un compte pour gérer vos livrets"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">{isDemoMode ? "Démo gratuite" : "Inscription"}</TabsTrigger>
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
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
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
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
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
                      7 jours d'essai gratuit • 1 livret • Aucune carte requise
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
