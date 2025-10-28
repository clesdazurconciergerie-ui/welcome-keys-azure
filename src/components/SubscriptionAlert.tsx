import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, XCircle } from "lucide-react";

export default function SubscriptionAlert() {
  const [alert, setAlert] = useState<{
    type: 'past_due' | 'expired' | null;
    message: string;
  }>({ type: null, message: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('subscription_status, role')
        .eq('id', user.id)
        .single();

      if (!userData) return;

      const paidRoles = ['pack_starter', 'pack_pro', 'pack_business', 'pack_premium'];

      // Check if subscription is past due
      if (userData.subscription_status === 'past_due') {
        setAlert({
          type: 'past_due',
          message: 'Votre paiement a échoué. Certaines fonctionnalités sont temporairement désactivées.',
        });
      }
      // Check if user was downgraded
      else if (userData.subscription_status === 'expired' && userData.role === 'free') {
        // Only show if they previously had a paid plan
        setAlert({
          type: 'expired',
          message: 'Votre abonnement a expiré. Réactivez-le pour retrouver l\'accès à toutes les fonctionnalités.',
        });
      }
    };

    checkSubscriptionStatus();
  }, []);

  if (!alert.type) return null;

  if (alert.type === 'past_due') {
    return (
      <Alert className="border-orange-200 bg-orange-50 mb-4">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-orange-800 font-medium">
            {alert.message}
          </span>
          <Button 
            onClick={() => navigate('/tarifs')}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Mettre à jour le paiement
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (alert.type === 'expired') {
    return (
      <Alert className="border-red-200 bg-red-50 mb-4">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-red-800 font-medium">
            {alert.message}
          </span>
          <Button 
            onClick={() => navigate('/tarifs')}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Réactiver l'abonnement
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
