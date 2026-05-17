import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink, Home, Wrench, BookOpen } from "lucide-react";
import { useDemoContext } from "@/contexts/DemoContext";

export function DemoBanner() {
  const navigate = useNavigate();
  const ctx = useDemoContext();
  const pin = ctx?.demoBookletPin ?? "DEMO1234";

  const openTab = (path: string) => {
    window.open(path + (path.includes("?") ? "&" : "?") + "demo=1", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="border-accent/30 text-accent text-[10px] font-semibold">
        MODE DÉMO
      </Badge>

      <Button
        size="sm"
        variant="outline"
        onClick={() => openTab("/proprietaire")}
        className="text-xs h-8 gap-1.5"
      >
        <Home className="w-3.5 h-3.5" />
        Voir côté propriétaire
        <ExternalLink className="w-3 h-3 opacity-60" />
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => openTab("/prestataire")}
        className="text-xs h-8 gap-1.5"
      >
        <Wrench className="w-3.5 h-3.5" />
        Voir côté prestataire
        <ExternalLink className="w-3 h-3 opacity-60" />
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => openTab(`/view/${pin}`)}
        className="text-xs h-8 gap-1.5"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Voir un livret voyageur
        <ExternalLink className="w-3 h-3 opacity-60" />
      </Button>

      <Button
        size="sm"
        onClick={() => navigate("/auth")}
        className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary text-xs font-semibold h-8"
      >
        Créer mon compte
        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
      </Button>
    </div>
  );
}
