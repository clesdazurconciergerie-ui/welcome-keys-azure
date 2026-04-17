import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Home, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProperties } from "@/hooks/useProperties";
import { supabase } from "@/integrations/supabase/client";

interface PropertyVisuals {
  id: string;
  name: string;
  city: string | null;
  nodalview_gallery_url: string | null;
  nodalview_tour_url: string | null;
}

export default function WelkomVisualsPage() {
  const navigate = useNavigate();
  const { properties, isLoading } = useProperties();
  const [visuals, setVisuals] = useState<Record<string, { gallery: string | null; tour: string | null }>>({});
  const [loadingVisuals, setLoadingVisuals] = useState(true);

  useEffect(() => {
    if (isLoading || properties.length === 0) {
      setLoadingVisuals(false);
      return;
    }
    (async () => {
      const ids = properties.map((p) => p.id);
      const { data } = await supabase
        .from("properties")
        .select("id, nodalview_gallery_url, nodalview_tour_url")
        .in("id", ids);
      const map: Record<string, { gallery: string | null; tour: string | null }> = {};
      (data as any[] | null)?.forEach((p) => {
        map[p.id] = { gallery: p.nodalview_gallery_url, tour: p.nodalview_tour_url };
      });
      setVisuals(map);
      setLoadingVisuals(false);
    })();
  }, [isLoading, properties]);

  if (isLoading || loadingVisuals) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            <h1 className="text-2xl font-semibold text-foreground">Welkom Visuals</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Photos HDR & visites virtuelles Nodalview — sélectionnez un bien
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-accent/10 text-accent border-accent/30 rounded-full px-3 py-1 text-xs font-medium"
        >
          Powered by Nodalview
        </Badge>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-border rounded-xl">
          <Home className="h-12 w-12 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            Aucun bien. Créez d'abord un bien pour ajouter ses visuels Nodalview.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => {
            const v = visuals[p.id] || { gallery: null, tour: null };
            const hasGallery = Boolean(v.gallery);
            const hasTour = Boolean(v.tour);
            return (
              <Card
                key={p.id}
                onClick={() => navigate(`/dashboard/logements/${p.id}`)}
                className="rounded-xl border-border cursor-pointer transition-all duration-200 hover:shadow-md hover:border-accent/40"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{p.name}</h3>
                      {p.city && (
                        <p className="text-xs text-muted-foreground truncate">{p.city}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant="outline"
                      className={
                        hasGallery
                          ? "bg-accent/10 text-accent border-accent/30 text-[10px]"
                          : "text-[10px] text-muted-foreground"
                      }
                    >
                      {hasGallery ? "Galerie HDR ✓" : "Galerie HDR —"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        hasTour
                          ? "bg-accent/10 text-accent border-accent/30 text-[10px]"
                          : "text-[10px] text-muted-foreground"
                      }
                    >
                      {hasTour ? "Visite 360° ✓" : "Visite 360° —"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
