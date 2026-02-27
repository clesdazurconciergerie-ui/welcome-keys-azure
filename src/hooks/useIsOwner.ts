import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OwnerInfo {
  isOwner: boolean;
  ownerId: string | null;
  conciergeUserId: string | null;
  isLoading: boolean;
}

/**
 * Détecte si l'utilisateur connecté est un propriétaire créé par une conciergerie.
 * Les propriétaires ont un enregistrement dans la table `owners` avec `auth_user_id` = leur ID.
 * Les utilisateurs auto-inscrits n'ont PAS de tel enregistrement → espace conciergerie normal.
 */
export function useIsOwner(): OwnerInfo {
  const [state, setState] = useState<OwnerInfo>({
    isOwner: false,
    ownerId: null,
    conciergeUserId: null,
    isLoading: true,
  });

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setState({ isOwner: false, ownerId: null, conciergeUserId: null, isLoading: false });
          return;
        }

        const { data, error } = await (supabase as any)
          .from('owners')
          .select('id, concierge_user_id')
          .eq('auth_user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          console.error('useIsOwner error:', error);
          setState({ isOwner: false, ownerId: null, conciergeUserId: null, isLoading: false });
          return;
        }

        if (data) {
          setState({
            isOwner: true,
            ownerId: data.id,
            conciergeUserId: data.concierge_user_id,
            isLoading: false,
          });
        } else {
          setState({ isOwner: false, ownerId: null, conciergeUserId: null, isLoading: false });
        }
      } catch {
        setState({ isOwner: false, ownerId: null, conciergeUserId: null, isLoading: false });
      }
    };
    check();
  }, []);

  return state;
}
