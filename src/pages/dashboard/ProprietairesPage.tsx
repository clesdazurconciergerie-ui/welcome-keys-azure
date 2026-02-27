import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useOwners, type Owner } from "@/hooks/useOwners";
import { CreateOwnerDialog } from "@/components/dashboard/owners/CreateOwnerDialog";
import { EditOwnerDialog } from "@/components/dashboard/owners/EditOwnerDialog";
import { OwnersList } from "@/components/dashboard/owners/OwnersList";

const ProprietairesPage = () => {
  const { owners, isLoading, createOwner, updateOwner, deleteOwner, toggleOwnerStatus } = useOwners();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOwner, setEditOwner] = useState<Owner | null>(null);

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
            <h1 className="text-3xl font-bold text-foreground">Propriétaires</h1>
            <p className="text-muted-foreground mt-1">
              {owners.length} propriétaire{owners.length !== 1 ? "s" : ""} enregistré{owners.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un compte propriétaire
          </Button>
        </div>
      </motion.div>

      {owners.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="text-center py-16 border border-border rounded-lg bg-card">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-[hsl(var(--gold))]" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucun propriétaire</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Créez des comptes propriétaires pour qu'ils accèdent à leur dashboard personnalisé avec revenus, occupation et documents.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer le premier compte
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <OwnersList
            owners={owners}
            onEdit={setEditOwner}
            onToggleStatus={toggleOwnerStatus}
            onDelete={deleteOwner}
          />
        </motion.div>
      )}

      <CreateOwnerDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={createOwner} />
      <EditOwnerDialog owner={editOwner} open={!!editOwner} onOpenChange={open => !open && setEditOwner(null)} onSubmit={updateOwner} />
    </div>
  );
};

export default ProprietairesPage;
