import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// The Supabase client types are generated remotely. These casts bridge the new
// migration until the next `supabase gen types` refreshes the generated schema.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type KeySetRole = "traveler" | "cleaning" | "owner" | "emergency" | "other";
export type KeySetStatus = "stored" | "assigned" | "lockbox" | "owner" | "cleaning" | "missing" | "incomplete";
export type KeyHolderType = "guest" | "owner" | "provider" | "team" | "lockbox" | "storage" | "other";

export interface KeySetItem {
  label: string;
  quantity: number;
}

export interface KeySet {
  id: string;
  user_id: string;
  property_id: string;
  booklet_id: string | null;
  code: string;
  name: string;
  pouch_role: KeySetRole;
  expected_items: KeySetItem[];
  label_address: string | null;
  arrival_instructions: string | null;
  public_token: string;
  status: KeySetStatus;
  current_holder_type: KeyHolderType;
  current_holder_label: string | null;
  current_booking_id: string | null;
  due_back_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  property?: { id: string; name: string; address: string | null; city: string | null; postcode: string | null } | null;
  booklet?: { id: string; property_name: string | null; access_code: string | null; status: string | null } | null;
}

export interface KeyMovement {
  id: string;
  key_set_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  holder_type: string | null;
  holder_label: string | null;
  booking_id: string | null;
  inspection_id: string | null;
  note: string | null;
  occurred_at: string;
}

export interface KeySetInput {
  property_id: string;
  booklet_id?: string | null;
  code: string;
  name: string;
  pouch_role: KeySetRole;
  expected_items: KeySetItem[];
  label_address?: string | null;
  arrival_instructions?: string | null;
}

export interface PropertyBooklet {
  id: string;
  property_id: string | null;
  property_name: string | null;
  property_address: string | null;
  checkin_procedure: string | null;
  google_maps_link: string | null;
  status: string | null;
}

export interface KeySetTransferInput {
  id: string;
  status: KeySetStatus;
  holder_type: KeyHolderType;
  holder_label?: string | null;
  booking_id?: string | null;
  due_back_at?: string | null;
  note?: string | null;
  inspection_id?: string | null;
}

export function useKeySets() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["key-sets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("key_sets")
        .select("*, property:properties(id,name,address,city,postcode), booklet:booklets(id,property_name,access_code,status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KeySet[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: KeySetInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Vous devez être connecté");
      const payload = {
        ...input,
        user_id: user.id,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        label_address: input.label_address?.trim() || null,
        arrival_instructions: input.arrival_instructions?.trim() || null,
      };
      const { data, error } = await (supabase as any)
        .from("key_sets")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as KeySet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key-sets"] });
      toast.success("Pochette créée");
    },
    onError: (error: Error) => toast.error(error.message || "Impossible de créer la pochette"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<KeySetInput> & { id: string }) => {
      const { error } = await (supabase as any).from("key_sets").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key-sets"] });
      toast.success("Pochette mise à jour");
    },
    onError: (error: Error) => toast.error(error.message || "Impossible de mettre à jour la pochette"),
  });

  const transferMutation = useMutation({
    mutationFn: async ({ id, note, inspection_id, ...input }: KeySetTransferInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Vous devez être connecté");

      const current = query.data?.find((item) => item.id === id);
      const { error: updateError } = await (supabase as any)
        .from("key_sets")
        .update({
          status: input.status,
          current_holder_type: input.holder_type,
          current_holder_label: input.holder_label?.trim() || null,
          current_booking_id: input.booking_id || null,
          due_back_at: input.due_back_at || null,
          last_checked_at: input.status === "stored" ? new Date().toISOString() : current?.last_checked_at,
        })
        .eq("id", id);
      if (updateError) throw updateError;

      const action = input.status === "missing"
        ? "reported_missing"
        : input.status === "stored"
          ? "returned"
          : current?.status === input.status
            ? "checked"
            : "transferred";

      const { error: movementError } = await (supabase as any).from("key_movements").insert({
        user_id: current?.user_id ?? user.id,
        key_set_id: id,
        action,
        from_status: current?.status ?? null,
        to_status: input.status,
        holder_type: input.holder_type,
        holder_label: input.holder_label?.trim() || null,
        booking_id: input.booking_id || null,
        inspection_id: inspection_id || null,
        note: note?.trim() || null,
        created_by: user.id,
      });
      if (movementError) throw movementError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key-sets"] });
      queryClient.invalidateQueries({ queryKey: ["key-movements"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-key-checks"] });
      toast.success("Mouvement enregistré");
    },
    onError: (error: Error) => toast.error(error.message || "Impossible d'enregistrer le mouvement"),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("key_sets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key-sets"] });
      toast.success("Pochette supprimée");
    },
    onError: (error: Error) => toast.error(error.message || "Impossible de supprimer la pochette"),
  });

  return {
    keySets: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createKeySet: createMutation.mutateAsync,
    updateKeySet: updateMutation.mutateAsync,
    transferKeySet: transferMutation.mutateAsync,
    removeKeySet: removeMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending || transferMutation.isPending,
  };
}

export function useKeyMovements(keySetId?: string) {
  const query = useQuery({
    queryKey: ["key-movements", keySetId],
    enabled: Boolean(keySetId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("key_movements")
        .select("*")
        .eq("key_set_id", keySetId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KeyMovement[];
    },
  });
  return { movements: query.data ?? [], isLoading: query.isLoading };
}

export function usePropertyBooklets() {
  const query = useQuery({
    queryKey: ["property-booklets-for-keys"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("booklets")
        .select("id, property_id, property_name, property_address, checkin_procedure, google_maps_link, status")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PropertyBooklet[];
    },
  });
  return { booklets: query.data ?? [], isLoading: query.isLoading };
}

export function useInspectionKeyChecks(inspectionId?: string) {
  const query = useQuery({
    queryKey: ["inspection-key-checks", inspectionId],
    enabled: Boolean(inspectionId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("key_movements")
        .select("key_set_id")
        .eq("inspection_id", inspectionId);
      if (error) throw error;
      return new Set<string>((data ?? []).map((row: { key_set_id: string }) => row.key_set_id));
    },
  });
  return { checkedKeySetIds: query.data ?? new Set<string>(), isLoading: query.isLoading };
}
