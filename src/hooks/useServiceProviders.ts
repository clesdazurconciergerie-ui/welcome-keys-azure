import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceProvider {
  id: string;
  concierge_user_id: string;
  auth_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  specialty: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceProviderFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  specialty?: string;
  notes?: string;
}

export function useServiceProviders() {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('service_providers')
        .select('*')
        .eq('concierge_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (err) {
      console.error('Error fetching service providers:', err);
      toast.error('Erreur lors du chargement des prestataires');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProvider = async (formData: ServiceProviderFormData) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-service-provider', {
        body: {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone?.trim() || null,
          specialty: formData.specialty || 'cleaning',
          notes: formData.notes?.trim() || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Compte prestataire créé avec succès');
      await fetchProviders();
      return data.service_provider;
    } catch (err: any) {
      console.error('Error creating service provider:', err);
      toast.error(err.message || 'Erreur lors de la création');
      return null;
    }
  };

  const deleteProvider = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-service-provider', {
        body: { service_provider_id: id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Prestataire supprimé définitivement');
      await fetchProviders();
    } catch (err: any) {
      console.error('Error deleting service provider:', err);
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      const { error } = await (supabase as any)
        .from('service_providers')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(newStatus === 'active' ? 'Compte activé' : 'Compte désactivé');
      await fetchProviders();
    } catch (err) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return { providers, isLoading, createProvider, deleteProvider, toggleStatus, refetch: fetchProviders };
}
