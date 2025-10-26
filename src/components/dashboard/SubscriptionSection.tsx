import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { CreditCard, Calendar, CheckCircle, AlertCircle, ExternalLink, Clock, RefreshCw } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const PAYMENT_LINKS = {
  pack_starter: 'https://buy.stripe.com/test/cNi5kDeMB6Cd8htgEQ',
  pack_pro: 'https://buy.stripe.com/test/7sYfZh9sh4u57dpgEQ',
  pack_business: 'https://buy.stripe.com/test/14A4gzbAp6CdcxJcoA',
  pack_premium: 'https://buy.stripe.com/test/bJe5kD5c1aStdBN2O',
} as const;

const SubscriptionSection = () => {
  const { 
    subscription, 
    planName, 
    isActive, 
    isLoading,
    userRole,
    userEmail,
    subscriptionStatus,
    trialExpiresAt,
    demoExpiresAt,
    refresh,
  } = useSubscription();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Card className="bg-white border border-[#EDEFF3]">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-[#EDEFF3]">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Determine status
  const isDemoOrTrial = userRole === 'demo_user' || userRole === 'free_trial';
  const isFree = userRole === 'free' || !userRole;
  const isSubscribed = isActive && !isDemoOrTrial && !isFree;
  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled' || subscription?.cancel_at_period_end;
  const isTrialing = subscription?.status === 'trialing';

  // Calculate days remaining for trial/demo
  let daysRemaining: number | null = null;
  if (isDemoOrTrial) {
    const expiryDate = userRole === 'demo_user' ? demoExpiresAt : trialExpiresAt;
    if (expiryDate) {
      daysRemaining = differenceInDays(new Date(expiryDate), new Date());
      daysRemaining = Math.max(0, daysRemaining);
    }
  }

  const handleManageSubscription = () => {
    // TODO: Implement Stripe Customer Portal
    window.open('https://billing.stripe.com/p/login/test_YOUR_PORTAL_SESSION_ID', '_blank');
  };

  const handleSubscribe = (planKey?: string) => {
    if (planKey && planKey in PAYMENT_LINKS) {
      const link = PAYMENT_LINKS[planKey as keyof typeof PAYMENT_LINKS];
      const returnUrl = `${window.location.origin}/dashboard?success=1`;
      window.location.href = `${link}?client_reference_id=${userEmail}&success_url=${encodeURIComponent(returnUrl)}`;
    } else {
      navigate('/tarifs');
    }
  };

  const handleSyncStripe = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Non authentifié');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-stripe-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('✅ Abonnement synchronisé avec Stripe');
        await refresh();
      } else {
        toast.error(data.message || 'Erreur lors de la synchronisation');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error('Échec de la synchronisation');
    } finally {
      setIsSyncing(false);
    }
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
          <div className="flex items-center justify-between flex-wrap gap-3">
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
            
            {/* Status Badge */}
            {isPastDue && (
              <Badge className="bg-red-500/10 text-red-700 border-red-500/20">
                <AlertCircle className="w-3 h-3 mr-1" />
                Paiement en retard
              </Badge>
            )}
            {isCanceled && !isPastDue && (
              <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/20">
                Annulé
              </Badge>
            )}
            {isTrialing && (
              <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                <Clock className="w-3 h-3 mr-1" />
                Essai en cours
              </Badge>
            )}
            {isSubscribed && !isPastDue && !isCanceled && (
              <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Actif
              </Badge>
            )}
            {isDemoOrTrial && (
              <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                <AlertCircle className="w-3 h-3 mr-1" />
                {userRole === 'demo_user' ? 'Démo' : 'Essai'}
              </Badge>
            )}
            {isFree && !isDemoOrTrial && (
              <Badge variant="outline" className="text-muted-foreground">
                Gratuit
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Plan Information */}
            <div className="flex items-start justify-between pb-4 border-b border-[#EDEFF3] flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plan actuel</p>
                <p className="text-lg font-semibold text-foreground">{planName}</p>
                {userEmail && (
                  <p className="text-xs text-muted-foreground mt-1">Facturation: {userEmail}</p>
                )}
              </div>
              
              {/* Renewal/Expiry Date */}
              {subscription?.current_period_end && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">
                    {isCanceled ? 'Expire le' : isTrialing ? 'Fin d\'essai' : 'Renouvellement'}
                  </p>
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">
                      {format(new Date(subscription.current_period_end), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Trial/Demo Days Remaining */}
              {isDemoOrTrial && daysRemaining !== null && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Jours restants</p>
                  <div className="flex items-center gap-2 text-foreground">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-medium">
                      {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Status Messages */}
            <div className="space-y-3">
              {/* PAST DUE State */}
              {isPastDue && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                  <p className="text-sm text-foreground font-semibold mb-1 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Problème de paiement
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Votre dernier paiement a échoué. Mettez à jour votre moyen de paiement pour continuer à profiter de votre abonnement.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleManageSubscription}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Mettre à jour le paiement
                  </Button>
                </div>
              )}
              
              {/* CANCELED State */}
              {isCanceled && !isPastDue && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                  <p className="text-sm text-foreground font-medium mb-1">
                    Abonnement annulé
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Votre abonnement prendra fin le{' '}
                    {subscription?.current_period_end && format(new Date(subscription.current_period_end), 'dd MMMM yyyy', { locale: fr })}.
                    Vous pouvez vous réabonner à tout moment.
                  </p>
                </div>
              )}
              
              {/* TRIALING State */}
              {isTrialing && !isCanceled && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-foreground font-medium mb-1">
                    🎯 Essai Premium en cours
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Profitez de toutes les fonctionnalités premium jusqu'au{' '}
                    {subscription?.current_period_end && format(new Date(subscription.current_period_end), 'dd MMMM yyyy', { locale: fr })}.
                  </p>
                </div>
              )}
              
              {/* ACTIVE State */}
              {isSubscribed && !isPastDue && !isCanceled && !isTrialing && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm text-foreground font-medium mb-1">
                    ✅ Abonnement actif
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Toutes les fonctionnalités premium sont disponibles. Profitez pleinement de Welkom.
                  </p>
                </div>
              )}
              
              {/* FREE TRIAL / DEMO State */}
              {isDemoOrTrial && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-sm text-foreground font-medium mb-1">
                    {userRole === 'demo_user' ? '🎬 Mode démo actif' : '🎯 Essai gratuit actif'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {daysRemaining !== null && daysRemaining > 0 ? (
                      <>Il vous reste {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} pour tester Welkom. </>
                    ) : (
                      <>Votre {userRole === 'demo_user' ? 'démo' : 'essai'} est terminé. </>
                    )}
                    Passez à un abonnement pour débloquer toutes les fonctionnalités.
                  </p>
                </div>
              )}
              
              {/* FREE State */}
              {isFree && !isDemoOrTrial && (
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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {isSubscribed && !isCanceled ? (
                <>
                  <Button
                    onClick={handleManageSubscription}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Gérer mon abonnement
                  </Button>
                  <Button
                    onClick={handleSyncStripe}
                    variant="outline"
                    className="flex-1"
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    Synchroniser Stripe
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
              ) : isCanceled || isPastDue ? (
                <>
                  <Button
                    onClick={() => handleSubscribe('pack_premium')}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    Se réabonner
                  </Button>
                  {!isPastDue && (
                    <Button
                      onClick={() => navigate('/tarifs')}
                      variant="outline"
                      className="flex-1"
                    >
                      Voir les plans
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={() => handleSubscribe('pack_premium')}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    S'abonner au Premium
                  </Button>
                  <Button
                    onClick={() => navigate('/tarifs')}
                    variant="outline"
                    className="flex-1"
                  >
                    Voir tous les plans
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
