import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Loader2, Home, MapPin, Users, BedDouble, Bath } from "lucide-react";
import { motion } from "framer-motion";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string | null;
  status: string;
  property_type: string | null;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  surface_m2: number | null;
  avg_nightly_rate: number | null;
}

export default function OwnerPropertiesPage() {
  const { ownerId } = useIsOwner();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    const load = async () => {
      const { data: links } = await (supabase as any)
        .from('owner_properties')
        .select('property_id')
        .eq('owner_id', ownerId);

      const propertyIds = (links || []).map((l: any) => l.property_id);

      if (propertyIds.length > 0) {
        const { data } = await (supabase as any)
          .from('properties')
          .select('id, name, address, city, status, property_type, capacity, bedrooms, bathrooms, surface_m2, avg_nightly_rate')
          .in('id', propertyIds);
        setProperties(data || []);
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
        <h1 className="text-3xl font-bold text-foreground">Mes biens</h1>
        <p className="text-muted-foreground mt-1">{properties.length} bien{properties.length !== 1 ? 's' : ''} associé{properties.length !== 1 ? 's' : ''}</p>
      </motion.div>

      {properties.length === 0 ? (
        <Card className="text-center py-16 border-border">
          <CardContent className="pt-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
              <Home className="w-8 h-8 text-[hsl(var(--gold))]" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucun bien</h3>
            <p className="text-muted-foreground">Contactez votre conciergerie pour associer vos biens.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {properties.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {p.address}{p.city ? `, ${p.city}` : ''}
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                        {p.capacity && (
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {p.capacity} pers.</span>
                        )}
                        {p.bedrooms && (
                          <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {p.bedrooms} ch.</span>
                        )}
                        {p.bathrooms && (
                          <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" /> {p.bathrooms} sdb</span>
                        )}
                        {p.surface_m2 && (
                          <span>{p.surface_m2} m²</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                      }`}>
                        {p.status === 'active' ? 'Actif' : p.status}
                      </span>
                      {p.avg_nightly_rate && (
                        <p className="text-sm text-muted-foreground mt-2">{p.avg_nightly_rate}€ / nuit</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
