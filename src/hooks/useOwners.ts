import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Owner {
  id: string;
  concierge_user_id: string;
  auth_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  notes?: string;
  property_ids?: string[];
}

export function useOwners() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOwners = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('owners')
        .select('*')
        .eq('concierge_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOwners(data || []);
    } catch (err) {
      console.error('Error fetching owners:', err);
      toast.error('Erreur lors du chargement des propriétaires');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createOwner = async (formData: OwnerFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await (supabase as any)
        .from('owners')
        .insert({
          concierge_user_id: user.id,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone?.trim() || null,
          notes: formData.notes?.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Link properties if provided
      if (formData.property_ids?.length && data) {
        const links = formData.property_ids.map(property_id => ({
          owner_id: data.id,
          property_id,
        }));
        await (supabase as any).from('owner_properties').insert(links);
      }

      toast.success('Propriétaire créé avec succès');
      await fetchOwners();
      return data;
    } catch (err: any) {
      console.error('Error creating owner:', err);
      toast.error(err.message || 'Erreur lors de la création');
      return null;
    }
  };

  const updateOwner = async (id: string, formData: Partial<OwnerFormData>) => {
    try {
      const updateData: any = {};
      if (formData.first_name) updateData.first_name = formData.first_name.trim();
      if (formData.last_name) updateData.last_name = formData.last_name.trim();
      if (formData.email) updateData.email = formData.email.trim().toLowerCase();
      if (formData.phone !== undefined) updateData.phone = formData.phone?.trim() || null;
      if (formData.notes !== undefined) updateData.notes = formData.notes?.trim() || null;

      const { error } = await (supabase as any)
        .from('owners')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Propriétaire mis à jour');
      await fetchOwners();
      return true;
    } catch (err: any) {
      console.error('Error updating owner:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour');
      return false;
    }
  };

  const toggleOwnerStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      const { error } = await (supabase as any)
        .from('owners')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(newStatus === 'active' ? 'Compte activé' : 'Compte désactivé');
      await fetchOwners();
    } catch (err) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const deleteOwner = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('owners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Propriétaire supprimé');
      await fetchOwners();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  return {
    owners,
    isLoading,
    createOwner,
    updateOwner,
    deleteOwner,
    toggleOwnerStatus,
    refetch: fetchOwners,
  };
}
