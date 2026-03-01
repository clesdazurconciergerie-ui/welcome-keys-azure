import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMaterialRequests } from "@/hooks/useMissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800" },
  accepted: { label: "Acceptée ✅", color: "bg-emerald-100 text-emerald-800" },
  refused: { label: "Refusée ❌", color: "bg-red-100 text-red-800" },
};

export default function SPMaterialPage() {
  const { requests, isLoading, createRequest } = useMaterialRequests();
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!product) return;
    setCreating(true);
    await createRequest(product, quantity);
    setCreating(false);
    setOpen(false);
    setProduct('');
    setQuantity(1);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Matériel & Stock</h1>
            <p className="text-muted-foreground mt-1">Demandez du matériel à la conciergerie</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" /> Demander
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Demande de matériel</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Produit *</Label>
                  <Input value={product} onChange={e => setProduct(e.target.value)} placeholder="Ex: Produit nettoyant, draps..." />
                </div>
                <div>
                  <Label>Quantité</Label>
                  <Input type="number" min={1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
                </div>
                <Button onClick={handleCreate} disabled={creating || !product} className="w-full">
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Envoyer la demande
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {requests.length === 0 && !isLoading ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Aucune demande</h3>
            <p className="text-muted-foreground text-sm">Vos demandes de matériel apparaîtront ici</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((r, idx) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.product}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantité : {r.quantity} — {new Date(r.request_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Badge className={`${statusConfig[r.status]?.color || 'bg-muted'} border-0`}>
                    {statusConfig[r.status]?.label || r.status}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
