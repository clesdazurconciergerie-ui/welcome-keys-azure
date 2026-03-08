import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function DemoBanner() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3">
      <Badge variant="outline" className="border-accent/30 text-accent text-[10px] font-semibold">
        MODE DÉMO
      </Badge>
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
