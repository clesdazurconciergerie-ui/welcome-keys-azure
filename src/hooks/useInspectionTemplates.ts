// MODULE — Hook pour les templates de checklists d'états des lieux
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChecklistRoom {
  name: string;
  items: { name: string; category?: string }[];
}

export interface InspectionTemplate {
  id: string;
  user_id: string;
  name: string;
  property_type: string;
  description: string | null;
  rooms: ChecklistRoom[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const PROPERTY_TYPES: Record<string, string> = {
  studio: "Studio",
  apartment: "Appartement",
  house: "Maison",
  villa: "Villa",
  loft: "Loft",
  other: "Autre",
};

export const DEFAULT_ROOMS: ChecklistRoom[] = [
  {
    name: "Salon",
    items: [
      { name: "Canapé", category: "mobilier" },
      { name: "Table basse", category: "mobilier" },
      { name: "Téléviseur", category: "electronique" },
      { name: "Sols et murs", category: "structure" },
    ],
  },
  {
    name: "Cuisine",
    items: [
      { name: "Plaques de cuisson", category: "electromenager" },
      { name: "Four / Micro-ondes", category: "electromenager" },
      { name: "Réfrigérateur", category: "electromenager" },
      { name: "Vaisselle (état + quantité)", category: "vaisselle" },
    ],
  },
  {
    name: "Chambre",
    items: [
      { name: "Lit + matelas", category: "mobilier" },
      { name: "Linge de lit", category: "linge" },
      { name: "Armoire / Penderie", category: "mobilier" },
    ],
  },
  {
    name: "Salle de bain",
    items: [
      { name: "Robinetterie", category: "plomberie" },
      { name: "Douche / Baignoire", category: "plomberie" },
      { name: "Serviettes", category: "linge" },
    ],
  },
];

export function useInspectionTemplates() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["inspection-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inspection_checklist_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as InspectionTemplate[]) ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<InspectionTemplate> & { name: string; property_type: string; rooms: ChecklistRoom[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      if (input.id) {
        const { error } = await (supabase as any)
          .from("inspection_checklist_templates")
          .update({
            name: input.name,
            property_type: input.property_type,
            description: input.description ?? null,
            rooms: input.rooms,
            is_default: input.is_default ?? false,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("inspection_checklist_templates")
          .insert({
            user_id: user.id,
            name: input.name,
            property_type: input.property_type,
            description: input.description ?? null,
            rooms: input.rooms,
            is_default: input.is_default ?? false,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-templates"] });
      toast.success("Modèle enregistré");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("inspection_checklist_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-templates"] });
      toast.success("Modèle supprimé");
    },
  });

  return { list, upsert, remove };
}
