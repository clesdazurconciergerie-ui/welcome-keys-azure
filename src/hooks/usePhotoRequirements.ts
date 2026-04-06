import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PhotoRequirement {
  id: string;
  property_id: string;
  label: string;
  description: string | null;
  required: boolean;
  order_index: number;
}

export interface PhotoCompletion {
  id: string;
  mission_id: string;
  requirement_id: string;
  photo_url: string;
  uploaded_at: string;
}

export function usePhotoRequirements(propertyId: string | undefined) {
  const [requirements, setRequirements] = useState<PhotoRequirement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('photo_requirements')
      .select('*')
      .eq('property_id', propertyId)
      .order('order_index');
    setRequirements(data || []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addRequirement = async (label: string, description?: string, required = true) => {
    if (!propertyId) return;
    const maxOrder = requirements.length > 0 ? Math.max(...requirements.map(r => r.order_index)) + 1 : 0;
    const { error } = await (supabase as any)
      .from('photo_requirements')
      .insert({ property_id: propertyId, label, description: description || null, required, order_index: maxOrder });
    if (error) { toast.error('Erreur ajout'); return; }
    toast.success('Ajouté');
    await fetch();
  };

  const updateRequirement = async (id: string, updates: Partial<Pick<PhotoRequirement, 'label' | 'description' | 'required' | 'order_index'>>) => {
    const { error } = await (supabase as any)
      .from('photo_requirements')
      .update(updates)
      .eq('id', id);
    if (error) { toast.error('Erreur mise à jour'); return; }
    await fetch();
  };

  const deleteRequirement = async (id: string) => {
    const { error } = await (supabase as any)
      .from('photo_requirements')
      .delete()
      .eq('id', id);
    if (error) { toast.error('Erreur suppression'); return; }
    toast.success('Supprimé');
    await fetch();
  };

  const reorder = async (reordered: PhotoRequirement[]) => {
    setRequirements(reordered);
    for (let i = 0; i < reordered.length; i++) {
      await (supabase as any)
        .from('photo_requirements')
        .update({ order_index: i })
        .eq('id', reordered[i].id);
    }
  };

  return { requirements, loading, addRequirement, updateRequirement, deleteRequirement, reorder, refetch: fetch };
}

export function useMissionPhotoCompletions(missionId: string | undefined) {
  const [completions, setCompletions] = useState<PhotoCompletion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!missionId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('mission_photo_completions')
      .select('*')
      .eq('mission_id', missionId);
    setCompletions(data || []);
    setLoading(false);
  }, [missionId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addCompletion = async (requirementId: string, photoUrl: string) => {
    if (!missionId) return;
    const { error } = await (supabase as any)
      .from('mission_photo_completions')
      .insert({ mission_id: missionId, requirement_id: requirementId, photo_url: photoUrl });
    if (error) { toast.error('Erreur sauvegarde photo'); return; }
    await fetch();
  };

  const getPhotosForRequirement = (requirementId: string) =>
    completions.filter(c => c.requirement_id === requirementId);

  return { completions, loading, addCompletion, getPhotosForRequirement, refetch: fetch };
}
