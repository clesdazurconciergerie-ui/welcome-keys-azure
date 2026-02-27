import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Home, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useProperties, type Property } from "@/hooks/useProperties";
import { CreatePropertyDialog } from "@/components/dashboard/properties/CreatePropertyDialog";
import { EditPropertyDialog } from "@/components/dashboard/properties/EditPropertyDialog";
import { PropertiesList } from "@/components/dashboard/properties/PropertiesList";

const LogementsPage = () => {
  const { properties, isLoading, createProperty, updateProperty, deleteProperty, duplicateProperty } = useProperties();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProp, setEditProp] = useState<Property | null>(null);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Biens / Logements</h1>
            <p className="text-muted-foreground mt-1">
              {properties.length} bien{properties.length !== 1 ? "s" : ""} enregistré{properties.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un bien
          </Button>
        </div>
      </motion.div>

      {properties.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="text-center py-16 border border-border rounded-lg bg-card">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
              <Home className="w-8 h-8 text-[hsl(var(--gold))]" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucun bien enregistré</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Commencez par créer vos biens. Vous pourrez ensuite y associer des propriétaires et des livrets d'accueil.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer le premier bien
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <PropertiesList
            properties={properties}
            onEdit={setEditProp}
            onDelete={deleteProperty}
            onDuplicate={duplicateProperty}
            onView={(id) => navigate(`/dashboard/logements/${id}`)}
          />
        </motion.div>
      )}

      <CreatePropertyDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={createProperty} />
      <EditPropertyDialog property={editProp} open={!!editProp} onOpenChange={open => !open && setEditProp(null)} onSubmit={updateProperty} />
    </div>
  );
};

export default LogementsPage;
