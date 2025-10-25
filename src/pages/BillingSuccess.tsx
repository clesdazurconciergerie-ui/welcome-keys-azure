import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

const BillingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const checkAuthAndConfirmPayment = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate(`/auth?next=/billing/success${sessionId ? `?session_id=${sessionId}` : ''}`);
        return;
      }

      // Vérifier si on a un session_id de Stripe
      if (!sessionId) {
        console.error('No session_id found in URL');
        setError('Aucun identifiant de session trouvé. Veuillez réessayer.');
        setLoading(false);
        return;
      }

      try {
        // Appeler l'edge function pour confirmer le paiement
        const { data, error: confirmError } = await supabase.functions.invoke('confirm-session', {
          body: { session_id: sessionId },
        });

        if (confirmError) {
          console.error('Error confirming session:', confirmError);
          setError('Erreur lors de la confirmation du paiement. Veuillez contacter le support.');
          setLoading(false);
          return;
        }

        if (data?.ok) {
          toast.success("Paiement confirmé ! Votre abonnement Starter est actif.");
          setUserRole('pack_starter');
          
          // Rediriger vers le dashboard après 2 secondes
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          setError(data?.error || 'Le paiement n\'a pas pu être confirmé.');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Une erreur inattendue s\'est produite. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndConfirmPayment();
  }, [navigate, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        
        <main className="flex-1 container mx-auto px-4 py-20 flex items-center justify-center">
          <Card className="max-w-lg w-full border-destructive">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-destructive" />
              </div>
              <CardTitle className="text-3xl font-display">
                Erreur de confirmation
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6 text-center">
              <p className="text-foreground">
                {error}
              </p>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full"
                >
                  Réessayer
                </Button>
                <Button
                  onClick={() => navigate('/tarifs')}
                  className="w-full"
                >
                  Retour aux tarifs
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-20 flex items-center justify-center">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-display">
              Paiement confirmé !
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-lg text-foreground">
                Votre abonnement <span className="font-semibold text-primary">Starter</span> est maintenant actif.
              </p>
              {userRole === 'pack_starter' && (
                <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                  Pack Starter activé
                </div>
              )}
            </div>

            <p className="text-muted-foreground">
              Vous pouvez désormais créer votre premier livret d'accueil numérique.
            </p>

            <p className="text-sm text-muted-foreground">
              Redirection automatique vers votre dashboard...
            </p>

            <div className="pt-4">
              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="w-full"
              >
                Accéder à mon compte
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default BillingSuccess;
