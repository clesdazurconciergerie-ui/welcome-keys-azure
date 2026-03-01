import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AiTask {
  id: string;
  user_id: string;
  scope: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  source: string;
  related_type: string | null;
  related_id: string | null;
  confidence: number | null;
  run_id: string | null;
  created_at: string;
}

export function useAiTasks() {
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("ai_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setTasks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const updateTaskStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from("ai_tasks")
      .update({ status })
      .eq("id", id);
    if (error) { toast.error("Erreur mise à jour"); return; }
    await fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await (supabase as any).from("ai_tasks").delete().eq("id", id);
    await fetchTasks();
  };

  return { tasks, loading, updateTaskStatus, deleteTask, refetch: fetchTasks };
}
