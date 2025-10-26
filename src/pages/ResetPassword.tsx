import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import BrandMark from "@/components/BrandMark";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    // Listen for auth state changes (important for recovery flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, 'Session:', !!session);
      
      if (!mounted) return;
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery detected');
        setVerifying(false);
        setError(null);
      } else if (event === 'SIGNED_IN' && session) {
        console.log('Signed in with recovery token');
        setVerifying(false);
        setError(null);
      }
    });

    // Check for recovery token in URL and verify it
    const verifyRecoveryToken = async () => {
      try {
        // First check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Valid session found');
          if (mounted) {
            setVerifying(false);
            setError(null);
          }
          return;
        }

        if (sessionError) {
          console.error('Session error:', sessionError);
        }

        // Check if there's a recovery token in the URL hash
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        console.log('Hash params - type:', type, 'has token:', !!accessToken);
        
        if (type === 'recovery' && accessToken) {
          console.log('Recovery token found in URL, waiting for Supabase to process...');
          // Token is present, Supabase auth listener will handle the session creation
          // Give it some time to process
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check again after waiting
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession && mounted) {
            console.log('Session created successfully');
            setVerifying(false);
            setError(null);
            return;
          }
        }
        
        // No valid token or session
        if (mounted) {
          console.log('No valid recovery token or session found');
          setError("Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.");
          setVerifying(false);
        }
      } catch (err) {
        console.error('Verification error:', err);
        if (mounted) {
          setError("Une erreur est survenue lors de la vérification du lien.");
          setVerifying(false);
        }
      }
    };

    verifyRecoveryToken();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [location]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("✅ Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.");
      
      // Sign out to clear the recovery session
      await supabase.auth.signOut();
      
      // Redirect to auth page
      setTimeout(() => {
        navigate("/auth");
      }, 1500);
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(error.message || "Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = () => {
    navigate("/auth");
    toast.info("Utilisez 'Mot de passe oublié' pour recevoir un nouveau lien");
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Vérification du lien...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <BrandMark variant="full" showIcon={true} />
          </div>

          <Card className="glass shadow-premium border-0">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-center">Lien expiré</CardTitle>
              <CardDescription className="text-center">
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleRequestNewLink} 
                className="w-full"
              >
                Demander un nouveau lien
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="w-full"
              >
                Retour à la connexion
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandMark variant="full" showIcon={true} />
        </div>

        <Card className="glass shadow-premium border-0">
          <CardHeader>
            <CardTitle>Nouveau mot de passe</CardTitle>
            <CardDescription>
              Choisissez un nouveau mot de passe pour votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 6 caractères
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  "Réinitialiser le mot de passe"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="text-sm"
                disabled={loading}
              >
                Retour à la connexion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
