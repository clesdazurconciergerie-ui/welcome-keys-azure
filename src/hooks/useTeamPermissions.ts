import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from './useUserRoles';

export type PermAction = 'r' | 'c' | 'u' | 'd';
export type SectionPerms = Record<string, Partial<Record<PermAction, boolean>>>;

/**
 * Retourne les permissions du user courant.
 * - super_admin : tout ouvert
 * - team_member : lit team_permissions.sections
 * - autres rôles : tout ouvert (leur propre layout gère déjà le scope)
 */
export function useTeamPermissions() {
  const { hasRole, isLoading: rolesLoading } = useUserRoles();
  const [sections, setSections] = useState<SectionPerms>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (rolesLoading) return;
      const isTeam = hasRole('team_member' as any);
      if (!isTeam) {
        if (!cancelled) { setSections({}); setLoading(false); }
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('team_permissions' as any)
        .select('sections')
        .eq('user_id', user.id)
        .maybeSingle() as any;
      if (!cancelled) {
        setSections((data?.sections as SectionPerms) || {});
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rolesLoading, hasRole]);

  const isSuper = hasRole('super_admin' as any);
  const isTeam = hasRole('team_member' as any);

  const can = (section: string, action: PermAction = 'r'): boolean => {
    if (isSuper) return true;
    if (!isTeam) return true; // owner/provider have their own layouts
    return !!sections[section]?.[action];
  };

  return { can, sections, isSuper, isTeam, loading };
}
