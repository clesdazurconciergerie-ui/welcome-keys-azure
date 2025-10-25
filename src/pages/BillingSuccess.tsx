import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

const BillingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate(`/auth?next=/billing/success${sessionId ? `?session_id=${sessionId}` : ''}`);
        return;
      }

      // Fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('role, subscription_status')
        .eq('id', user.id)
        .single();

      if (userData) {
        setUserRole(userData.role);
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

            {sessionId && (
              <p className="text-xs text-muted-foreground">
                Session ID: {sessionId.slice(0, 20)}...
              </p>
            )}

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
