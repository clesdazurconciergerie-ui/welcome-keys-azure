import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AzurkeysProperty = {
  id: string;
  slug: string;
  nom: string;
  ville: string;
  proprietaire: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const TABLE = "azurkeys_properties";
// The generated Supabase types don't know about this table yet — cast to any.
const db = supabase as any;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function useAzurkeysProperties() {
  const [properties, setProperties] = useState<AzurkeysProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await db
      .from(TABLE)
      .select("*")
      .order("nom", { ascending: true });
    if (error) {
      setError(error.message);
      setProperties([]);
    } else {
      setError(null);
      setProperties((data ?? []) as AzurkeysProperty[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const create = async (input: {
    nom: string;
    ville?: string;
    proprietaire?: string | null;
    slug?: string;
  }) => {
    const slug = (input.slug?.trim() || slugify(input.nom));
    if (!slug) {
      toast.error("Nom invalide");
      return null;
    }
    const { data, error } = await db
      .from(TABLE)
      .insert({
        slug,
        nom: input.nom.trim(),
        ville: (input.ville ?? "Saint-Raphaël").trim() || "Saint-Raphaël",
        proprietaire: input.proprietaire?.trim() || null,
        active: true,
      })
      .select()
      .single();
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      return null;
    }
    toast.success("Logement ajouté");
    setProperties((p) => [...p, data as AzurkeysProperty].sort((a, b) => a.nom.localeCompare(b.nom)));
    return data as AzurkeysProperty;
  };

  const update = async (id: string, patch: Partial<Omit<AzurkeysProperty, "id" | "created_at" | "updated_at">>) => {
    const { data, error } = await db
      .from(TABLE)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      return null;
    }
    toast.success("Logement mis à jour");
    setProperties((p) => p.map((x) => (x.id === id ? (data as AzurkeysProperty) : x)));
    return data as AzurkeysProperty;
  };

  const toggleActive = async (id: string, active: boolean) => update(id, { active });

  const remove = async (id: string) => {
    const { error } = await db.from(TABLE).delete().eq("id", id);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      return false;
    }
    toast.success("Logement supprimé");
    setProperties((p) => p.filter((x) => x.id !== id));
    return true;
  };

  return { properties, isLoading, error, refresh: fetchAll, create, update, toggleActive, remove };
}
