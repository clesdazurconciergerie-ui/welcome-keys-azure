import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChecklistTemplate {
  id: string;
  property_id: string;
  task_text: string;
  is_mandatory: boolean;
  order_index: number;
}

export interface ChecklistCompletion {
  id: string;
  mission_id: string;
  template_id: string;
  completed: boolean;
  notes: string | null;
}

export function useMissionChecklist(missionId: string | undefined, propertyId: string | undefined) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [completions, setCompletions] = useState<ChecklistCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch checklist templates for the property
    const { data: templatesData } = await (supabase as any)
      .from("mission_checklist_templates")
      .select("*")
      .eq("property_id", propertyId)
      .order("order_index");

    if (templatesData) {
      setTemplates(templatesData);
    }

    // Fetch existing completions for this mission
    if (missionId) {
      const { data: completionsData } = await (supabase as any)
        .from("mission_checklist_completions")
        .select("*")
        .eq("mission_id", missionId);

      if (completionsData) {
        setCompletions(completionsData);
      }
    }

    setLoading(false);
  }, [missionId, propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCompletion = async (templateId: string, completed: boolean, notes?: string) => {
    if (!missionId) return;

    const existing = completions.find(c => c.template_id === templateId);

    if (existing) {
      const { error } = await (supabase as any)
        .from("mission_checklist_completions")
        .update({ completed, notes: notes || existing.notes })
        .eq("id", existing.id);

      if (!error) {
        setCompletions(prev =>
          prev.map(c =>
            c.id === existing.id ? { ...c, completed, notes: notes || c.notes } : c
          )
        );
      }
    } else {
      const { data, error } = await (supabase as any)
        .from("mission_checklist_completions")
        .insert({
          mission_id: missionId,
          template_id: templateId,
          completed,
          notes: notes || null,
        })
        .select()
        .single();

      if (!error && data) {
        setCompletions(prev => [...prev, data]);
      } else if (error) {
        toast.error("Erreur lors de la mise à jour");
      }
    }
  };

  const isCompleted = (templateId: string) => {
    return completions.find(c => c.template_id === templateId)?.completed || false;
  };

  const getNotes = (templateId: string) => {
    return completions.find(c => c.template_id === templateId)?.notes || "";
  };

  const allMandatoryCompleted = templates
    .filter(t => t.is_mandatory)
    .every(t => isCompleted(t.id));

  const completionProgress = templates.length > 0
    ? (completions.filter(c => c.completed).length / templates.length) * 100
    : 0;

  return {
    templates,
    loading,
    toggleCompletion,
    isCompleted,
    getNotes,
    allMandatoryCompleted,
    completionProgress,
  };
}
