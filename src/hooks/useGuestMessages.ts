// MODULE 1 — Voyageur Messaging Engine
// Hook React Query : CRUD sur guest_message_templates + lecture historique des envois.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MessageTrigger =
  | "booking_confirmed"
  | "three_days_before"
  | "day_before_arrival"
  | "check_in_day"
  | "mid_stay"
  | "day_before_checkout"
  | "one_day_after";

export type MessageChannel = "email" | "sms" | "whatsapp";
export type MessageStatus = "pending" | "sent" | "failed" | "cancelled";

export interface GuestMessageTemplate {
  id: string;
  user_id: string;
  name: string;
  trigger_type: MessageTrigger;
  channel: MessageChannel;
  subject: string | null;
  body_markdown: string;
  is_active: boolean;
  property_ids: string[] | null;
  language: string;
  send_at_time: string;
  created_at: string;
  updated_at: string;
}

export interface GuestScheduledMessage {
  id: string;
  user_id: string;
  booking_id: string | null;
  property_id: string | null;
  template_id: string | null;
  trigger_type: MessageTrigger;
  channel: MessageChannel;
  recipient_email: string | null;
  recipient_phone: string | null;
  rendered_subject: string | null;
  rendered_body: string | null;
  scheduled_at: string;
  status: MessageStatus;
  attempts: number;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export const TRIGGER_LABELS: Record<MessageTrigger, string> = {
  booking_confirmed: "Confirmation de réservation",
  three_days_before: "J-3 avant arrivée",
  day_before_arrival: "Veille de l'arrivée",
  check_in_day: "Jour J — arrivée",
  mid_stay: "Milieu du séjour (>4 nuits)",
  day_before_checkout: "Veille du départ",
  one_day_after: "Lendemain — demande d'avis",
};

export const TRIGGER_DESCRIPTIONS: Record<MessageTrigger, string> = {
  booking_confirmed: "Envoyé immédiatement à la création de la réservation.",
  three_days_before: "Envoyé 3 jours avant le check-in à l'heure choisie.",
  day_before_arrival: "Envoyé la veille du check-in à l'heure choisie.",
  check_in_day: "Envoyé le jour de l'arrivée à l'heure choisie.",
  mid_stay: "Envoyé au milieu du séjour, uniquement si le séjour fait plus de 4 nuits.",
  day_before_checkout: "Envoyé la veille du check-out à l'heure choisie.",
  one_day_after: "Envoyé le lendemain du check-out — idéal pour demander un avis.",
};

export const AVAILABLE_VARIABLES = [
  { key: "guest_first_name", label: "Prénom voyageur" },
  { key: "guest_last_name", label: "Nom voyageur" },
  { key: "property_name", label: "Nom du logement" },
  { key: "property_address", label: "Adresse du logement" },
  { key: "check_in_date", label: "Date d'arrivée" },
  { key: "check_in_time", label: "Heure d'arrivée" },
  { key: "check_out_date", label: "Date de départ" },
  { key: "check_out_time", label: "Heure de départ" },
  { key: "access_code", label: "Code d'accès" },
  { key: "wifi_ssid", label: "Wi-Fi nom" },
  { key: "wifi_password", label: "Wi-Fi mot de passe" },
  { key: "parking_info", label: "Infos parking" },
  { key: "booklet_url", label: "Lien livret digital" },
  { key: "concierge_first_name", label: "Prénom concierge" },
  { key: "concierge_phone", label: "Téléphone concierge" },
  { key: "review_link_airbnb", label: "Lien avis Airbnb" },
  { key: "review_link_booking", label: "Lien avis Booking" },
];

// ─── TEMPLATES ────────────────────────────────────────────────────────────
export function useGuestMessageTemplates() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["guest-message-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("guest_message_templates")
        .select("*")
        .order("trigger_type")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GuestMessageTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<GuestMessageTemplate>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");
      const { data, error } = await (supabase as any)
        .from("guest_message_templates")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guest-message-templates"] });
      toast.success("Modèle créé");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur création"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<GuestMessageTemplate> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("guest_message_templates")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guest-message-templates"] });
      toast.success("Modèle mis à jour");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("guest_message_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guest-message-templates"] });
      toast.success("Modèle supprimé");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur suppression"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("guest_message_templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guest-message-templates"] }),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    toggleActive: toggleActive.mutate,
  };
}

// ─── HISTORIQUE ───────────────────────────────────────────────────────────
export function useGuestScheduledMessages(filters?: {
  status?: MessageStatus;
  propertyId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["guest-scheduled-messages", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("guest_scheduled_messages")
        .select("*")
        .order("scheduled_at", { ascending: false })
        .limit(filters?.limit ?? 100);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.propertyId) q = q.eq("property_id", filters.propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as GuestScheduledMessage[];
    },
  });
}

// ─── ENVOI DE TEST ────────────────────────────────────────────────────────
export async function sendTestMessage(payload: {
  subject: string | null;
  body_markdown: string;
  recipient_email: string;
}) {
  const { data, error } = await supabase.functions.invoke("test-guest-message", {
    body: payload,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
