import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Prospect = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  property_address: string | null;
  city: string | null;
  property_type: string | null;
  estimated_monthly_revenue: number;
  pipeline_status: string;
  source: string;
  warmth: string;
  first_contact_date: string | null;
  last_contact_date: string | null;
  score: number;
  internal_notes: string | null;
  converted_owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectInteraction = {
  id: string;
  prospect_id: string;
  user_id: string;
  interaction_type: string;
  interaction_date: string;
  summary: string | null;
  result: string | null;
  created_at: string;
};

export type ProspectFollowup = {
  id: string;
  prospect_id: string;
  user_id: string;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export const PIPELINE_STATUSES = [
  { value: "new_contact", label: "Nouveau contact", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "to_contact", label: "À contacter", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "contacted", label: "Contacté", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "interested", label: "Intéressé", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "meeting_scheduled", label: "RDV pris", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "proposal_sent", label: "Proposition envoyée", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "negotiation", label: "Négociation", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "signed", label: "Signé", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "lost", label: "Perdu", color: "bg-red-50 text-red-700 border-red-200" },
];

export const SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "website", label: "Site web" },
  { value: "outbound_call", label: "Appel sortant" },
  { value: "referral", label: "Recommandation" },
  { value: "door_to_door", label: "Porte-à-porte" },
  { value: "other", label: "Autre" },
];

export const WARMTH_LEVELS = [
  { value: "cold", label: "Froid", emoji: "❄️", color: "bg-blue-100 text-blue-700" },
  { value: "warm", label: "Tiède", emoji: "🌤️", color: "bg-amber-100 text-amber-700" },
  { value: "hot", label: "Chaud", emoji: "🔥", color: "bg-red-100 text-red-700" },
];

export function useProspects() {
  const queryClient = useQueryClient();

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("prospects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Prospect[];
    },
  });

  const createProspect = useMutation({
    mutationFn: async (prospect: Partial<Prospect>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { error } = await (supabase as any)
        .from("prospects")
        .insert({ ...prospect, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Prospect créé");
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const updateProspect = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prospect> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("prospects")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });

  const deleteProspect = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("prospects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Prospect supprimé");
    },
  });

  return { prospects, isLoading, createProspect, updateProspect, deleteProspect };
}

export function useProspectInteractions(prospectId: string | null) {
  const queryClient = useQueryClient();

  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ["prospect_interactions", prospectId],
    enabled: !!prospectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("prospect_interactions")
        .select("*")
        .eq("prospect_id", prospectId)
        .order("interaction_date", { ascending: false });
      if (error) throw error;
      return data as ProspectInteraction[];
    },
  });

  const createInteraction = useMutation({
    mutationFn: async (interaction: Partial<ProspectInteraction>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { error } = await (supabase as any)
        .from("prospect_interactions")
        .insert({ ...interaction, user_id: user.id });
      if (error) throw error;
      // Update score +10 and last_contact_date
      if (interaction.prospect_id) {
        await (supabase as any).from("prospects").update({
          last_contact_date: new Date().toISOString().split('T')[0],
        }).eq("id", interaction.prospect_id);
        // Increment score
        const { data: prospect } = await (supabase as any).from("prospects").select("score").eq("id", interaction.prospect_id).single();
        if (prospect) {
          await (supabase as any).from("prospects").update({ score: (prospect.score || 0) + 10 }).eq("id", interaction.prospect_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospect_interactions"] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Interaction ajoutée");
    },
  });

  return { interactions, isLoading, createInteraction };
}

export function useProspectFollowups(prospectId?: string | null) {
  const queryClient = useQueryClient();

  const { data: followups = [], isLoading } = useQuery({
    queryKey: ["prospect_followups", prospectId || "all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let query = (supabase as any)
        .from("prospect_followups")
        .select("*, prospect:prospects(first_name, last_name, phone, email)")
        .eq("user_id", user.id)
        .order("scheduled_date", { ascending: true });
      if (prospectId) query = query.eq("prospect_id", prospectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as (ProspectFollowup & { prospect?: { first_name: string; last_name: string; phone: string | null; email: string | null } })[];
    },
  });

  const createFollowup = useMutation({
    mutationFn: async (followup: Partial<ProspectFollowup>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { error } = await (supabase as any)
        .from("prospect_followups")
        .insert({ ...followup, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospect_followups"] });
      toast.success("Relance programmée");
    },
  });

  const updateFollowup = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProspectFollowup> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("prospect_followups")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospect_followups"] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });

  return { followups, isLoading, createFollowup, updateFollowup };
}
