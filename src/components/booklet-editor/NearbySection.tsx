import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

interface NearbySectionProps {
  bookletId?: string;
}

export default function NearbySection({ bookletId }: NearbySectionProps) {
  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">À proximité</h2>
          <p className="text-sm text-[#64748B]">
            Recommandations de commerces, restaurants et lieux d'intérêt
          </p>
        </div>
        <Badge variant="secondary">À venir</Badge>
      </div>

      <div className="text-center py-12 border-2 border-dashed border-[#E6EDF2] rounded-xl">
        <MapPin className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
        <p className="text-[#64748B] mb-4">
          La carte des lieux à proximité sera bientôt disponible
        </p>
        <p className="text-sm text-[#64748B]">
          Vous pourrez recommander des restaurants, commerces et activités autour de votre propriété
        </p>
      </div>
    </section>
  );
}
