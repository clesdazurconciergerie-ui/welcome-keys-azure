import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Loader2, BookOpen, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface Booklet {
  id: string;
  property_name: string;
  property_address: string;
  status: string;
  access_code: string | null;
}

export default function OwnerBookletsPage() {
  const { ownerId } = useIsOwner();
  const [booklets, setBooklets] = useState<Booklet[]>([]);
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
          .select('id, property_name, property_address, status, access_code')
          .in('property_id', propertyIds);
        setBooklets(data || []);
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
          {booklets.map((b, i) => (
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
                  {b.status === 'published' && b.access_code && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/view/${b.access_code}`, '_blank')}
                      className="gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Consulter
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
