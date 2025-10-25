import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 
  | 'free_trial'
  | 'demo_user'
  | 'free'
  | 'pack_starter'
  | 'pack_pro'
  | 'pack_business'
  | 'pack_premium'
  | 'super_admin';

interface UserRoleRow {
  role: string;
}

interface UserRolesData {
  roles: AppRole[];
  primaryRole: AppRole | null;
  hasRole: (role: AppRole) => boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook pour récupérer les rôles d'un utilisateur depuis la table user_roles
 * Utilise la nouvelle architecture sécurisée pour éviter l'escalade de privilèges
 */
export function useUserRoles(userId?: string): UserRolesData {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Si pas d'userId fourni, récupérer l'utilisateur courant
        let targetUserId = userId;
        if (!targetUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }
          targetUserId = user.id;
        }

        // Récupérer les rôles depuis user_roles (utiliser any pour éviter les erreurs de types)
        const { data, error: fetchError } = await supabase
          .from('user_roles' as any)
          .select('role')
          .eq('user_id', targetUserId) as { data: UserRoleRow[] | null, error: any };

        if (fetchError) {
          throw fetchError;
        }

        const userRoles = (data || []).map(r => r.role as AppRole);
        setRoles(userRoles);

      } catch (err) {
        console.error('Error fetching user roles:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, [userId]);

  // Déterminer le rôle "principal" (priorité: super_admin > payant > demo > free_trial > free)
  const getPrimaryRole = (): AppRole | null => {
    if (roles.length === 0) return null;
    
    const rolePriority: Record<AppRole, number> = {
      'super_admin': 100,
      'pack_premium': 90,
      'pack_business': 80,
      'pack_pro': 70,
      'pack_starter': 60,
      'demo_user': 50,
      'free_trial': 40,
      'free': 30,
    };

    return roles.reduce((prev, current) => {
      return rolePriority[current] > rolePriority[prev] ? current : prev;
    }, roles[0]);
  };

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  return {
    roles,
    primaryRole: getPrimaryRole(),
    hasRole,
    isLoading,
    error,
  };
}
