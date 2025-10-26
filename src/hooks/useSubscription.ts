import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionData {
  id: string;
  status: string;
  current_period_end: string | null;
  current_period_start: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface UserSubscriptionInfo {
  subscription: SubscriptionData | null;
  planName: string;
  isActive: boolean;
  isLoading: boolean;
  error: Error | null;
}

const PLAN_NAMES: Record<string, string> = {
  pack_starter: 'Plan Starter',
  pack_pro: 'Plan Pro',
  pack_business: 'Plan Business',
  pack_premium: 'Plan Premium',
  free_trial: 'Essai gratuit',
  demo_user: 'Démo',
  free: 'Gratuit',
  super_admin: 'Administrateur',
};

export const useSubscription = (): UserSubscriptionInfo => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [planName, setPlanName] = useState('Gratuit');
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSubscription = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        // Get user role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, subscription_status')
          .eq('id', session.user.id)
          .single();

        if (userError) throw userError;

        // Get subscription details with type assertion
        const { data: subData, error: subError } = await supabase
          .from('subscriptions' as any)
          .select('id, status, current_period_end, current_period_start, cancel_at_period_end, stripe_customer_id, stripe_subscription_id')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle() as { data: any; error: any };

        if (subError && subError.code !== 'PGRST116') throw subError;

        if (isMounted) {
          if (subData) {
            setSubscription({
              id: subData.id,
              status: subData.status,
              current_period_end: subData.current_period_end,
              current_period_start: subData.current_period_start,
              cancel_at_period_end: subData.cancel_at_period_end,
              stripe_customer_id: subData.stripe_customer_id,
              stripe_subscription_id: subData.stripe_subscription_id,
            });
          }
          setPlanName(PLAN_NAMES[userData?.role || 'free'] || 'Gratuit');
          setIsActive(
            userData?.subscription_status === 'active' || 
            userData?.subscription_status === 'trial_active' ||
            userData?.role === 'super_admin'
          );
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        if (isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    fetchSubscription();

    // Set up realtime listener for subscription updates
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        } as any,
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { subscription, planName, isActive, isLoading, error };
};
