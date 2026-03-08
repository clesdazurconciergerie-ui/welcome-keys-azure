import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Loader2, BookOpen, ExternalLink, Eye } from "lucide-react";
import { motion } from "framer-motion";

interface Booklet {
  id: string;
  property_name: string;
  property_address: string;
  status: string;
  property_id: string | null;
  unique_views_count?: number;
}

interface Pin {
  booklet_id: string;
  pin_code: string;
  status: string;
}

export default function OwnerBookletsPage() {
  const { ownerId } = useIsOwner();
  const [booklets, setBooklets] = useState<Booklet[]>([]);
  const [pins, setPins] = useState<Record<string, Pin>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    const load = async () => {
      // Get property IDs linked to owner
      const { data: links } = await (supabase as any)
        .from('owner_properties')
        .select('property_id')
        .eq('owner_id', ownerId);

      const propertyIds = (links || []).map((l: any) => l.property_id);

      if (propertyIds.length > 0) {
        const { data } = await (supabase as any)
          .from('booklets')
          .select('id, property_name, property_address, status, property_id')
          .in('property_id', propertyIds);
        const bookletsList = data || [];
        setBooklets(bookletsList);

        // Fetch PINs for published booklets
        const publishedIds = bookletsList.filter((b: Booklet) => b.status === 'published').map((b: Booklet) => b.id);
        if (publishedIds.length > 0) {
          const { data: pinsData } = await (supabase as any)
            .from("pins")
            .select("booklet_id, pin_code, status")
            .in("booklet_id", publishedIds)
            .eq("status", "active");
          if (pinsData) {
            const pinsMap: Record<string, Pin> = {};
            pinsData.forEach((pin: Pin) => { pinsMap[pin.booklet_id] = pin; });
            setPins(pinsMap);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [ownerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Livrets d'accueil</h1>
        <p className="text-muted-foreground mt-1">Consultez les livrets numériques de vos biens</p>
      </motion.div>

      {booklets.length === 0 ? (
        <Card className="text-center py-16 border-border">
          <CardContent className="pt-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-[hsl(var(--gold))]" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucun livret</h3>
            <p className="text-muted-foreground">Aucun livret n'est encore associé à vos biens.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {booklets.map((b, i) => {
            const pin = pins[b.id];
            const canView = b.status === 'published' && pin;
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{b.property_name}</h3>
                      <p className="text-sm text-muted-foreground">{b.property_address}</p>
                      <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full font-medium ${
                        b.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {b.status === 'published' ? 'Publié' : 'Brouillon'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canView}
                      onClick={() => {
                        if (pin) window.open(`/view/${pin.pin_code}`, '_blank');
                      }}
                      className="gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Consulter
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
