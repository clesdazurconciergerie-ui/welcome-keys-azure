import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (immediate: boolean) => Promise<void>;
  currentPeriodEnd?: string;
}

const CancelSubscriptionModal = ({
  open,
  onOpenChange,
  onConfirm,
  currentPeriodEnd,
}: CancelSubscriptionModalProps) => {
  const [immediate, setImmediate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(immediate);
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
      setImmediate(false);
    }
  };

  const endDate = currentPeriodEnd
    ? format(new Date(currentPeriodEnd), 'dd MMMM yyyy', { locale: fr })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <DialogTitle className="text-xl">Résilier l'abonnement</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Êtes-vous sûr de vouloir résilier votre abonnement premium ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
            <p className="text-sm text-foreground font-medium">
              Que se passe-t-il ensuite ?
            </p>
            {!immediate && currentPeriodEnd ? (
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  Votre abonnement restera actif jusqu'au <strong>{endDate}</strong>
                </li>
                <li>Vous conserverez l'accès premium jusqu'à cette date</li>
                <li>Aucun nouveau prélèvement ne sera effectué</li>
                <li>Après cette date, vous serez automatiquement basculé en plan gratuit</li>
              </ul>
            ) : (
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Votre accès premium sera révoqué immédiatement</li>
                <li>Vous serez basculé sur le plan gratuit</li>
                <li>Vous ne pourrez plus créer de nouveaux livrets</li>
                <li>Aucun remboursement ne sera effectué</li>
              </ul>
            )}
          </div>

          <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-lg">
            <Checkbox
              id="immediate"
              checked={immediate}
              onCheckedChange={(checked) => setImmediate(checked as boolean)}
              className="mt-0.5"
            />
            <label
              htmlFor="immediate"
              className="text-sm text-foreground cursor-pointer flex-1"
            >
              <span className="font-medium">Annuler immédiatement</span>
              <p className="text-xs text-muted-foreground mt-1">
                Cochez cette case pour perdre l'accès premium immédiatement au lieu d'attendre
                la fin de votre période de facturation.
              </p>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Résiliation...' : 'Confirmer la résiliation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelSubscriptionModal;
