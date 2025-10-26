import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Step {
  id: string;
  text: string;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  steps: Step[];
  manual_url?: string;
}

interface EquipmentsSectionProps {
  bookletId?: string;
}

export default function EquipmentsSection({ bookletId }: EquipmentsSectionProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookletId) {
      setLoading(false);
      return;
    }
    fetchEquipment();
  }, [bookletId]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("booklet_id", bookletId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const equipmentList = (data || []).map(e => ({
        id: e.id,
        name: e.name || '',
        category: e.category || 'Général',
        steps: normalizeSteps(e.steps),
        manual_url: e.manual_url || ''
      }));

      setEquipment(equipmentList);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      toast.error("Erreur lors du chargement des équipements");
    } finally {
      setLoading(false);
    }
  };

  const normalizeSteps = (raw: unknown): Step[] => {
    if (Array.isArray(raw)) {
      return raw
        .map((s: any) => ({ 
          id: s?.id || crypto.randomUUID?.() || Math.random().toString(36).slice(2), 
          text: String(s?.text || '').trim() 
        }))
        .filter(s => s.text);
    }
    return [];
  };

  const deleteEquipment = async (id: string) => {
    try {
      await supabase
        .from("equipment")
        .delete()
        .eq("id", id);
      
      setEquipment(prev => prev.filter(e => e.id !== id));
      toast.success("Équipement supprimé");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6">
        <p className="text-muted-foreground">Chargement...</p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Équipements & Modes d'emploi</h2>
        <p className="text-sm text-[#64748B]">
          Consultez les équipements ajoutés lors de la création du livret
        </p>
      </div>

      {equipment.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[#E6EDF2] rounded-xl">
          <p className="text-[#64748B]">
            Aucun équipement ajouté pour le moment
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {equipment.map((item) => (
            <details key={item.id} className="rounded-xl border border-[#E6EDF2] p-4 bg-white group">
              <summary className="cursor-pointer flex items-center justify-between list-none">
                <div className="flex items-center gap-3 flex-1">
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  <div className="flex-1 flex items-center gap-3">
                    <span className="font-semibold text-[#0F172A]">{item.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({item.category || "Général"})
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEquipment(item.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </summary>

              <div className="mt-4 space-y-4 pl-7">
                {item.steps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#0F172A]">Mode d'emploi :</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      {item.steps.map((step) => (
                        <li key={step.id} className="text-sm text-[#64748B]">
                          {step.text}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {item.manual_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#0F172A]">Notice PDF :</p>
                    <a 
                      href={item.manual_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Voir la notice →
                    </a>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
