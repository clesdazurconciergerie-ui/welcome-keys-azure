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
  plan_id: string | null;
}

export interface UserSubscriptionInfo {
  subscription: SubscriptionData | null;
  planName: string;
  isActive: boolean;
  isLoading: boolean;
  error: Error | null;
  userRole: string;
  userEmail: string;
  subscriptionStatus: string;
  trialExpiresAt: string | null;
  demoExpiresAt: string | null;
  refresh: () => Promise<void>;
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
  const [userRole, setUserRole] = useState('free');
  const [userEmail, setUserEmail] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('none');
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null);
  const [demoExpiresAt, setDemoExpiresAt] = useState<string | null>(null);

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

        // Get user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, subscription_status, email, trial_expires_at, demo_token_expires_at')
          .eq('id', session.user.id)
          .single();

        if (userError) throw userError;

        // Get subscription details
        const { data: subData, error: subError } = await supabase
          .from('subscriptions' as any)
          .select('id, status, current_period_end, current_period_start, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, plan_id')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
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
              plan_id: subData.plan_id,
            });
          } else {
            setSubscription(null);
          }
          
          setUserRole(userData?.role || 'free');
          setUserEmail(userData?.email || '');
          setSubscriptionStatus(userData?.subscription_status || 'none');
          setTrialExpiresAt(userData?.trial_expires_at || null);
          setDemoExpiresAt(userData?.demo_token_expires_at || null);
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

    // Refresh on URL success parameter
    const params = new URLSearchParams(window.location.search);
    if (params.has('success')) {
      setTimeout(fetchSubscription, 1000);
    }

    // Refresh on window focus
    const handleFocus = () => fetchSubscription();
    window.addEventListener('focus', handleFocus);

    // Set up realtime listener for both users and subscriptions
    const channel = supabase
      .channel('subscription-updates')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        } as any,
        () => {
          console.log('Subscription updated via realtime');
          fetchSubscription();
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'users',
        } as any,
        (payload: any) => {
          console.log('User updated via realtime');
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  return { 
    subscription, 
    planName, 
    isActive, 
    isLoading, 
    error,
    userRole,
    userEmail,
    subscriptionStatus,
    trialExpiresAt,
    demoExpiresAt,
    refresh: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Re-run fetch logic
        const { data: userData } = await supabase
          .from('users')
          .select('role, subscription_status, email, trial_expires_at, demo_token_expires_at')
          .eq('id', session.user.id)
          .single();

        const { data: subData } = await supabase
          .from('subscriptions' as any)
          .select('id, status, current_period_end, current_period_start, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, plan_id')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle() as { data: any; error: any };

        if (subData) {
          setSubscription({
            id: subData.id,
            status: subData.status,
            current_period_end: subData.current_period_end,
            current_period_start: subData.current_period_start,
            cancel_at_period_end: subData.cancel_at_period_end,
            stripe_customer_id: subData.stripe_customer_id,
            stripe_subscription_id: subData.stripe_subscription_id,
            plan_id: subData.plan_id,
          });
        } else {
          setSubscription(null);
        }

        if (userData) {
          setUserRole(userData.role || 'free');
          setUserEmail(userData.email || '');
          setSubscriptionStatus(userData.subscription_status || 'none');
          setTrialExpiresAt(userData.trial_expires_at || null);
          setDemoExpiresAt(userData.demo_token_expires_at || null);
          setPlanName(PLAN_NAMES[userData.role || 'free'] || 'Gratuit');
          setIsActive(
            userData.subscription_status === 'active' || 
            userData.subscription_status === 'trial_active' ||
            userData.role === 'super_admin'
          );
        }
      }
    }
  };
};
