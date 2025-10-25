import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EquipmentsSectionProps {
  bookletId?: string;
}

export default function EquipmentsSection({ bookletId }: EquipmentsSectionProps) {
  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">Équipements</h2>
          <p className="text-sm text-[#64748B]">
            Listez les équipements disponibles avec photos et modes d'emploi
          </p>
        </div>
        <Badge variant="secondary">À venir</Badge>
      </div>

      <div className="text-center py-12 border-2 border-dashed border-[#E6EDF2] rounded-xl">
        <Plus className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
        <p className="text-[#64748B] mb-4">
          La gestion des équipements sera bientôt disponible
        </p>
        <p className="text-sm text-[#64748B]">
          Vous pourrez ajouter des photos, descriptions et modes d'emploi pour chaque équipement
        </p>
      </div>
    </section>
  );
}
