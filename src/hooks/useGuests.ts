import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Guest {
  id: string;
  user_id: string;
  property_id: string | null;
  booking_id: string | null;
  inspection_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  language: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  property?: { name: string } | null;
}

export type GuestInput = Omit<Guest, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'property'>;

export function useGuests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('guests')
        .select('*, property:property_id(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGuests(data || []);
    } catch (err) {
      console.error('Error fetching guests:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertGuest = async (input: Partial<GuestInput>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const payload: any = {
        ...input,
        user_id: user.id,
        full_name: input.full_name || [input.first_name, input.last_name].filter(Boolean).join(' ') || null,
        marketing_consent_at: input.marketing_consent ? new Date().toISOString() : null,
      };

      // Try update by booking_id first, otherwise insert
      if (input.booking_id) {
        const { data: existing } = await (supabase as any)
          .from('guests')
          .select('id')
          .eq('booking_id', input.booking_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          const { data, error } = await (supabase as any)
            .from('guests')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          await fetch();
          return data;
        }
      }

      const { data, error } = await (supabase as any)
        .from('guests')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      await fetch();
      return data;
    } catch (err: any) {
      console.error('Error upserting guest:', err);
      toast.error(err.message || 'Erreur lors de la sauvegarde du voyageur');
      return null;
    }
  };

  const deleteGuest = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('guests').delete().eq('id', id);
      if (error) throw error;
      toast.success('Voyageur supprimé');
      await fetch();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  const exportCsv = (onlyConsented = false) => {
    const list = onlyConsented ? guests.filter(g => g.marketing_consent) : guests;
    if (list.length === 0) {
      toast.error('Aucun voyageur à exporter');
      return;
    }
    const headers = ['Nom complet', 'Email', 'Téléphone', 'Ville', 'Pays', 'Bien', 'Consentement marketing', 'Date'];
    const rows = list.map(g => [
      g.full_name || '',
      g.email || '',
      g.phone || '',
      g.city || '',
      g.country || '',
      g.property?.name || '',
      g.marketing_consent ? 'Oui' : 'Non',
      new Date(g.created_at).toLocaleDateString('fr-FR'),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voyageurs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${list.length} voyageur(s) exporté(s)`);
  };

  return { guests, isLoading, upsertGuest, deleteGuest, exportCsv, refetch: fetch };
}
