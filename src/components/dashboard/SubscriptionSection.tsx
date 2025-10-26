import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CreditCard, Calendar, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const SubscriptionSection = () => {
  const { subscription, planName, isActive, isLoading } = useSubscription();
  const { primaryRole } = useUserRoles();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Card className="bg-white border border-[#EDEFF3]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const isDemoOrTrial = primaryRole === 'demo_user' || primaryRole === 'free_trial';
  const isFree = primaryRole === 'free' || !primaryRole;
  const isSubscribed = isActive && !isDemoOrTrial && !isFree;

  const handleManageSubscription = () => {
    // Redirect to Stripe billing portal
    window.open('https://billing.stripe.com/p/login/test_YOUR_PORTAL_SESSION_ID', '_blank');
  };

  const handleUpgrade = () => {
    navigate('/tarifs');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <Card className="bg-white border border-[#EDEFF3] overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-[#EDEFF3]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl text-foreground">Mon abonnement</CardTitle>
                <CardDescription className="text-sm">
                  Gérez votre plan et vos avantages
                </CardDescription>
              </div>
            </div>
            {isSubscribed && (
              <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Actif
              </Badge>
            )}
            {isDemoOrTrial && (
              <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                <AlertCircle className="w-3 h-3 mr-1" />
                {primaryRole === 'demo_user' ? 'Démo' : 'Essai'}
              </Badge>
            )}
            {isFree && (
              <Badge variant="outline" className="text-muted-foreground">
                Gratuit
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {/* Subscription Details */}
          <div className="space-y-4">
            {/* Plan Information */}
            <div className="flex items-start justify-between pb-4 border-b border-[#EDEFF3]">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plan actuel</p>
                <p className="text-lg font-semibold text-foreground">{planName}</p>
              </div>
              {subscription?.current_period_end && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">
                    {subscription.cancel_at_period_end ? 'Expire le' : 'Renouvellement'}
                  </p>
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">
                      {format(new Date(subscription.current_period_end), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Status Messages */}
            <div className="py-4">
              {isSubscribed && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm text-foreground font-medium mb-1">
                    ✅ Merci pour votre abonnement !
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Toutes les fonctionnalités premium sont disponibles. Profitez pleinement de Welkom.
                  </p>
                </div>
              )}
              
              {isDemoOrTrial && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-sm text-foreground font-medium mb-1">
                    {primaryRole === 'demo_user' ? '🎬 Mode démo actif' : '🎯 Essai gratuit actif'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vous êtes actuellement en {primaryRole === 'demo_user' ? 'démo' : 'période d\'essai'} — certaines fonctions sont limitées. 
                    Passez à un abonnement pour débloquer toutes les fonctionnalités.
                  </p>
                </div>
              )}
              
              {isFree && (
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <p className="text-sm text-foreground font-medium mb-1">
                    Aucun abonnement actif
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Souscrivez à un plan pour créer vos livrets d'accueil et accéder à toutes les fonctionnalités premium.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {isSubscribed ? (
                <>
                  <Button
                    onClick={handleManageSubscription}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Gérer mon abonnement
                  </Button>
                  <Button
                    onClick={() => navigate('/tarifs')}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Comparer les plans
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleUpgrade}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    Passer à l'abonnement
                  </Button>
                  <Button
                    onClick={() => navigate('/tarifs')}
                    variant="outline"
                    className="flex-1"
                  >
                    Voir les avantages
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SubscriptionSection;
