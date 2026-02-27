import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string | null;
  postcode: string | null;
  country: string | null;
  surface_m2: number | null;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  avg_nightly_rate: number | null;
  pricing_strategy: string | null;
  photos: any[];
  amenities: any[];
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyPhoto {
  id: string;
  property_id: string;
  url: string;
  caption: string | null;
  category: string;
  order_index: number;
  is_main: boolean;
  uploaded_at: string;
}

export interface PropertyDocument {
  id: string;
  property_id: string;
  name: string;
  category: string;
  file_url: string;
  file_size: number | null;
  uploaded_at: string;
}

export interface PropertyFormData {
  name: string;
  address: string;
  city?: string;
  postcode?: string;
  country?: string;
  surface_m2?: number | null;
  capacity?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_type?: string;
  avg_nightly_rate?: number | null;
  pricing_strategy?: string;
  notes?: string;
}

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProperties = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
      toast.error('Erreur lors du chargement des biens');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProperty = async (formData: PropertyFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await (supabase as any)
        .from('properties')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          address: formData.address.trim(),
          city: formData.city?.trim() || null,
          postcode: formData.postcode?.trim() || null,
          country: formData.country?.trim() || 'France',
          surface_m2: formData.surface_m2 || null,
          capacity: formData.capacity || null,
          bedrooms: formData.bedrooms || null,
          bathrooms: formData.bathrooms || null,
          property_type: formData.property_type || 'apartment',
          avg_nightly_rate: formData.avg_nightly_rate || null,
          pricing_strategy: formData.pricing_strategy?.trim() || null,
          notes: formData.notes?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Bien créé avec succès');
      await fetchProperties();
      return data;
    } catch (err: any) {
      console.error('Error creating property:', err);
      toast.error(err.message || 'Erreur lors de la création');
      return null;
    }
  };

  const duplicateProperty = async (id: string) => {
    try {
      const prop = properties.find(p => p.id === id);
      if (!prop) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await (supabase as any)
        .from('properties')
        .insert({
          user_id: user.id,
          name: `${prop.name} (copie)`,
          address: prop.address,
          city: prop.city,
          postcode: prop.postcode,
          country: prop.country,
          surface_m2: prop.surface_m2,
          capacity: prop.capacity,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          property_type: prop.property_type,
          avg_nightly_rate: prop.avg_nightly_rate,
          pricing_strategy: prop.pricing_strategy,
          notes: prop.notes,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Bien dupliqué avec succès');
      await fetchProperties();
      return data;
    } catch (err: any) {
      toast.error('Erreur lors de la duplication');
      return null;
    }
  };

  const updateProperty = async (id: string, formData: Partial<PropertyFormData>) => {
    try {
      const updateData: any = {};
      if (formData.name) updateData.name = formData.name.trim();
      if (formData.address) updateData.address = formData.address.trim();
      if (formData.city !== undefined) updateData.city = formData.city?.trim() || null;
      if (formData.postcode !== undefined) updateData.postcode = formData.postcode?.trim() || null;
      if (formData.country !== undefined) updateData.country = formData.country?.trim() || 'France';
      if (formData.surface_m2 !== undefined) updateData.surface_m2 = formData.surface_m2 || null;
      if (formData.capacity !== undefined) updateData.capacity = formData.capacity || null;
      if (formData.bedrooms !== undefined) updateData.bedrooms = formData.bedrooms || null;
      if (formData.bathrooms !== undefined) updateData.bathrooms = formData.bathrooms || null;
      if (formData.property_type !== undefined) updateData.property_type = formData.property_type;
      if (formData.avg_nightly_rate !== undefined) updateData.avg_nightly_rate = formData.avg_nightly_rate || null;
      if (formData.pricing_strategy !== undefined) updateData.pricing_strategy = formData.pricing_strategy?.trim() || null;
      if (formData.notes !== undefined) updateData.notes = formData.notes?.trim() || null;

      const { error } = await (supabase as any)
        .from('properties')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Bien mis à jour');
      await fetchProperties();
      return true;
    } catch (err: any) {
      console.error('Error updating property:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour');
      return false;
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Bien supprimé');
      await fetchProperties();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Photo management
  const fetchPhotos = async (propertyId: string): Promise<PropertyPhoto[]> => {
    const { data, error } = await (supabase as any)
      .from('property_photos')
      .select('*')
      .eq('property_id', propertyId)
      .order('order_index');
    if (error) { console.error(error); return []; }
    return data || [];
  };

  const uploadPhoto = async (propertyId: string, file: File, category = 'general', caption = '') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const ext = file.name.split('.').pop();
      const path = `${user.id}/${propertyId}/photos/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('property-files').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('property-files').getPublicUrl(path);

      const { error } = await (supabase as any)
        .from('property_photos')
        .insert({
          property_id: propertyId,
          user_id: user.id,
          url: urlData.publicUrl,
          caption: caption || null,
          category,
        });

      if (error) throw error;
      toast.success('Photo ajoutée');
      return true;
    } catch (err) {
      toast.error('Erreur lors de l\'upload');
      return false;
    }
  };

  const deletePhoto = async (photoId: string) => {
    const { error } = await (supabase as any).from('property_photos').delete().eq('id', photoId);
    if (error) toast.error('Erreur'); else toast.success('Photo supprimée');
  };

  // Document management
  const fetchDocuments = async (propertyId: string): Promise<PropertyDocument[]> => {
    const { data, error } = await (supabase as any)
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId)
      .order('uploaded_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  };

  const uploadDocument = async (propertyId: string, file: File, category: string, name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const ext = file.name.split('.').pop();
      const path = `${user.id}/${propertyId}/docs/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('property-files').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('property-files').getPublicUrl(path);

      const { error } = await (supabase as any)
        .from('property_documents')
        .insert({
          property_id: propertyId,
          user_id: user.id,
          name: name.trim(),
          category,
          file_url: urlData.publicUrl,
          file_size: file.size,
        });

      if (error) throw error;
      toast.success('Document ajouté');
      return true;
    } catch (err) {
      toast.error('Erreur lors de l\'upload');
      return false;
    }
  };

  const deleteDocument = async (docId: string) => {
    const { error } = await (supabase as any).from('property_documents').delete().eq('id', docId);
    if (error) toast.error('Erreur'); else toast.success('Document supprimé');
  };

  // Fetch associated owners
  const fetchPropertyOwners = async (propertyId: string) => {
    const { data, error } = await (supabase as any)
      .from('owner_properties')
      .select('owner_id')
      .eq('property_id', propertyId);
    if (error) return [];
    if (!data?.length) return [];

    const ownerIds = data.map((r: any) => r.owner_id);
    const { data: owners } = await (supabase as any)
      .from('owners')
      .select('id, first_name, last_name, email, status')
      .in('id', ownerIds);
    return owners || [];
  };

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  return {
    properties,
    isLoading,
    createProperty,
    updateProperty,
    deleteProperty,
    duplicateProperty,
    fetchPhotos,
    uploadPhoto,
    deletePhoto,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    fetchPropertyOwners,
    refetch: fetchProperties,
  };
}
