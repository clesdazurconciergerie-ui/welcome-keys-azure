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
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      
      // If demo mode, activate demo after signup
      if (isDemoMode && data.session) {
        try {
          const response = await supabase.functions.invoke('activate-demo', {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          });

          if (response.error) {
            console.error('Error activating demo:', response.error);
            toast.warning("Compte créé mais la démo n'a pas pu être activée");
          } else {
            toast.success("Compte démo créé avec succès ! Vous avez 7 jours pour tester.");
            navigate("/dashboard");
            return;
          }
        } catch (demoError) {
          console.error('Demo activation error:', demoError);
          toast.warning("Compte créé mais la démo n'a pas pu être activée");
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

      if (error) throw error;
      
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
                    <Label htmlFor="signin-password">Mot de passe</Label>
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
                </form>
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
