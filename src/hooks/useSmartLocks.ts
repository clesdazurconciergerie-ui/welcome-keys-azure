// MODULE 4 — Smart Keys
// Hook React Query pour serrures connectées (Igloohome / Nuki).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LockProvider = "igloohome" | "nuki" | "ttlock" | "manual";

export interface SmartLockProvider {
  id: string;
  user_id: string;
  provider: LockProvider;
  account_label: string | null;
  is_connected: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export interface SmartLock {
  id: string;
  user_id: string;
  property_id: string | null;
  provider_id: string | null;
  external_id: string;
  device_name: string;
  device_type: string | null;
  battery_level: number | null;
  is_active: boolean;
  last_event_at: string | null;
}

export interface SmartLockCode {
  id: string;
  user_id: string;
  lock_id: string;
  booking_id: string | null;
  guest_name: string | null;
  pin_code: string;
  valid_from: string;
  valid_until: string;
  status: "active" | "revoked" | "expired" | "pending";
  notes: string | null;
  created_at: string;
}

export function useSmartLockProviders() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["smart-lock-providers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("smart_lock_providers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SmartLockProvider[];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: { provider: LockProvider; account_label?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");
      const { error } = await (supabase as any)
        .from("smart_lock_providers")
        .insert({ ...payload, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-lock-providers"] });
      toast.success("Compte ajouté");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return { providers: query.data ?? [], isLoading: query.isLoading, create: create.mutate };
}

export function useSmartLocks() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["smart-locks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("smart_locks")
        .select("*")
        .order("device_name");
      if (error) throw error;
      return (data ?? []) as SmartLock[];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Partial<SmartLock>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");
      const { error } = await (supabase as any)
        .from("smart_locks")
        .insert({
          ...payload,
          user_id: user.id,
          external_id: payload.external_id ?? `manual-${Date.now()}`,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-locks"] });
      toast.success("Serrure ajoutée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("smart_locks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-locks"] });
      toast.success("Serrure supprimée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return { locks: query.data ?? [], isLoading: query.isLoading, create: create.mutate, remove: remove.mutate };
}

export function useSmartLockCodes(lockId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["smart-lock-codes", lockId],
    queryFn: async () => {
      let q = (supabase as any).from("smart_lock_codes").select("*").order("valid_from", { ascending: false });
      if (lockId) q = q.eq("lock_id", lockId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SmartLockCode[];
    },
  });

  const generate = useMutation({
    mutationFn: async (payload: {
      lock_id: string;
      booking_id?: string;
      guest_name?: string;
      valid_from: string;
      valid_until: string;
      pin_code?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");
      const pin = payload.pin_code ?? Math.floor(100000 + Math.random() * 900000).toString();
      const { error } = await (supabase as any)
        .from("smart_lock_codes")
        .insert({ ...payload, pin_code: pin, user_id: user.id, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-lock-codes"] });
      toast.success("Code PIN généré");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("smart_lock_codes")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-lock-codes"] });
      toast.success("Code révoqué");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return {
    codes: query.data ?? [],
    isLoading: query.isLoading,
    generate: generate.mutate,
    revoke: revoke.mutate,
  };
}
