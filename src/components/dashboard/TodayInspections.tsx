import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, LogIn, LogOut, ArrowRight, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TodayInspection {
  id: string;
  inspection_type: "entry" | "exit" | string;
  status: string;
  guest_name: string | null;
  inspection_date: string;
  property?: { name: string } | null;
}

export function TodayInspections() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TodayInspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const fetchToday = async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("inspections")
      .select("id, inspection_type, status, guest_name, inspection_date, property:property_id(name)")
      .eq("inspection_date", today)
      .order("inspection_type", { ascending: true });

    if (!error) setItems(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchToday();

    // Realtime: refresh when new inspections appear
    const channel = supabase
      .channel("today-inspections")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inspections" },
        () => fetchToday()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const handleGenerate = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-create-inspections");
      if (error) throw error;
      const created = (data?.created_entries || 0) + (data?.created_exits || 0);
      toast.success(
        created > 0
          ? `${created} état(s) des lieux créé(s)`
          : "Aucun nouvel état des lieux à créer"
      );
      await fetchToday();
    } catch (err: any) {
      toast.error(err.message || "Erreur de génération");
    } finally {
      setIsRunning(false);
    }
  };

  const entries = items.filter((i) => i.inspection_type === "entry");
  const exits = items.filter((i) => i.inspection_type === "exit");

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                États des lieux du jour
              </h3>
              <Badge variant="secondary" className="ml-1">
                {items.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={isRunning}
                className="h-8 text-xs"
                title="Générer maintenant les états des lieux pour aujourd'hui"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRunning ? "animate-spin" : ""}`} />
                Générer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/inspections")}
                className="h-8 text-xs"
              >
                Tout voir
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-3">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              Aucun état des lieux prévu aujourd'hui.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Entries */}
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                  Entrées ({entries.length})
                </div>
                <div className="space-y-2">
                  {entries.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Aucune entrée</p>
                  )}
                  {entries.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => navigate("/dashboard/inspections")}
                      className="w-full text-left p-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {i.property?.name || "Logement"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {i.guest_name || "Voyageur"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0 border-amber-300 text-amber-700 bg-amber-50"
                      >
                        À compléter
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Exits */}
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <LogOut className="w-3.5 h-3.5 text-blue-600" />
                  Sorties ({exits.length})
                </div>
                <div className="space-y-2">
                  {exits.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Aucune sortie</p>
                  )}
                  {exits.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => navigate("/dashboard/inspections")}
                      className="w-full text-left p-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {i.property?.name || "Logement"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {i.guest_name || "Voyageur"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0 border-amber-300 text-amber-700 bg-amber-50"
                      >
                        À compléter
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
