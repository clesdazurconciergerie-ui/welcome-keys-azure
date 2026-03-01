import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Loader2, Home, MapPin, Users, BedDouble, Bath, ChevronDown, ChevronUp, CheckCircle, Clock, AlertTriangle, XCircle, Wrench } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

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

interface Intervention {
  id: string;
  scheduled_date: string;
  status: string;
  mission_type: string;
  mission_amount: number;
  payment_done: boolean;
  service_provider?: { first_name: string; last_name: string } | null;
  photos?: { id: string; url: string }[];
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  scheduled: { label: "Planifiée", icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
  in_progress: { label: "En cours", icon: Clock, color: "text-blue-600", bg: "bg-blue-100" },
  completed: { label: "À valider", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
  validated: { label: "Validée", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
  refused: { label: "Refusée", icon: XCircle, color: "text-destructive", bg: "bg-red-100" },
};

const missionLabels: Record<string, string> = {
  cleaning: "Ménage", checkin: "Check-in", checkout: "Check-out", intervention: "Intervention",
};

export default function OwnerPropertiesPage() {
  const { ownerId } = useIsOwner();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interventionsMap, setInterventionsMap] = useState<Record<string, Intervention[]>>({});
  const [loadingInterventions, setLoadingInterventions] = useState<string | null>(null);

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

  const toggleExpand = async (propertyId: string) => {
    if (expandedId === propertyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(propertyId);
    if (!interventionsMap[propertyId]) {
      setLoadingInterventions(propertyId);
      const { data } = await (supabase as any)
        .from('cleaning_interventions')
        .select(`
          id, scheduled_date, status, mission_type, mission_amount, payment_done,
          service_provider:service_provider_id(first_name, last_name),
          photos:cleaning_photos(id, url)
        `)
        .eq('property_id', propertyId)
        .order('scheduled_date', { ascending: false });
      setInterventionsMap(prev => ({ ...prev, [propertyId]: data || [] }));
      setLoadingInterventions(null);
    }
  };

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
                        {p.capacity && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {p.capacity} pers.</span>}
                        {p.bedrooms && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {p.bedrooms} ch.</span>}
                        {p.bathrooms && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" /> {p.bathrooms} sdb</span>}
                        {p.surface_m2 && <span>{p.surface_m2} m²</span>}
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

                  {/* Toggle interventions */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full justify-center text-xs text-muted-foreground"
                    onClick={() => toggleExpand(p.id)}
                  >
                    <Wrench className="w-3.5 h-3.5 mr-1.5" />
                    Historique des interventions
                    {expandedId === p.id ? <ChevronUp className="w-3.5 h-3.5 ml-1.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-1.5" />}
                  </Button>

                  <AnimatePresence>
                    {expandedId === p.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          {loadingInterventions === p.id ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (interventionsMap[p.id]?.length || 0) === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Aucune intervention pour ce bien.</p>
                          ) : (
                            interventionsMap[p.id].map(intervention => {
                              const sc = statusConfig[intervention.status] || statusConfig.scheduled;
                              const StatusIcon = sc.icon;
                              return (
                                <div key={intervention.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${sc.bg}`}>
                                      <StatusIcon className={`w-3.5 h-3.5 ${sc.color}`} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{missionLabels[intervention.mission_type] || intervention.mission_type}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        {intervention.service_provider && ` — ${intervention.service_provider.first_name} ${intervention.service_provider.last_name}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {(intervention.photos?.length ?? 0) > 0 && (
                                      <span className="text-xs text-muted-foreground">📸 {intervention.photos!.length}</span>
                                    )}
                                    {intervention.mission_amount > 0 && (
                                      <span className="text-xs font-medium">{intervention.mission_amount}€</span>
                                    )}
                                    <Badge variant="outline" className="text-[10px]">{sc.label}</Badge>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}