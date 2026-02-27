import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SPInfo {
  isServiceProvider: boolean;
  spId: string | null;
  conciergeUserId: string | null;
  isLoading: boolean;
}

export function useIsServiceProvider(): SPInfo {
  const [state, setState] = useState<SPInfo>({
    isServiceProvider: false,
    spId: null,
    conciergeUserId: null,
    isLoading: true,
  });

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setState({ isServiceProvider: false, spId: null, conciergeUserId: null, isLoading: false });
          return;
        }

        const { data, error } = await (supabase as any)
          .from('service_providers')
          .select('id, concierge_user_id')
          .eq('auth_user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error || !data) {
          setState({ isServiceProvider: false, spId: null, conciergeUserId: null, isLoading: false });
          return;
        }

        setState({
          isServiceProvider: true,
          spId: data.id,
          conciergeUserId: data.concierge_user_id,
          isLoading: false,
        });
      } catch {
        setState({ isServiceProvider: false, spId: null, conciergeUserId: null, isLoading: false });
      }
    };
    check();
  }, []);

  return state;
}
