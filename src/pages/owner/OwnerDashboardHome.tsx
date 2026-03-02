import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Loader2, Home, Calendar, ClipboardList, Percent } from "lucide-react";
import { motion } from "framer-motion";

interface PropertySummary {
  id: string;
  name: string;
  address: string;
  status: string;
}

export default function OwnerDashboardHome() {
  const { ownerId } = useIsOwner();
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [interventionsCount, setInterventionsCount] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    const load = async () => {
      const { data: links } = await (supabase as any)
        .from("owner_properties").select("property_id").eq("owner_id", ownerId);
      const propertyIds = (links || []).map((l: any) => l.property_id);

      if (propertyIds.length > 0) {
        const { data: props } = await (supabase as any)
          .from("properties").select("id, name, address, status").in("id", propertyIds);
        setProperties(props || []);

        // Get bookings for occupancy
        const { data: bk } = await (supabase as any)
          .from("bookings").select("check_in, check_out")
          .in("property_id", propertyIds);
        setBookings(bk || []);
      }

      const { count } = await (supabase as any)
        .from("owner_interventions").select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId);
      setInterventionsCount(count || 0);
      setLoading(false);
    };
    load();
  }, [ownerId]);

  // Compute occupancy for current month
  const occupancyPct = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const totalNights = lastDay.getDate();
    let bookedNights = 0;
    for (const b of bookings) {
      const s = Math.max(new Date(b.check_in).getTime(), firstDay.getTime());
      const e = Math.min(new Date(b.check_out).getTime(), lastDay.getTime() + 86400000);
      bookedNights += Math.max(0, Math.round((e - s) / 86400000));
    }
    bookedNights = Math.min(bookedNights, totalNights);
    return totalNights > 0 ? Math.round((bookedNights / totalNights) * 100) : 0;
  }, [bookings]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Bienvenue</h1>
        <p className="text-muted-foreground mt-1">Votre espace propriétaire MyWelkom</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
                  <Home className="w-5 h-5 text-[hsl(var(--gold))]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{properties.length}</p>
                  <p className="text-xs text-muted-foreground">Bien{properties.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${occupancyPct >= 50 ? "bg-emerald-100" : occupancyPct >= 20 ? "bg-amber-100" : "bg-red-100"}`}>
                  <Percent className={`w-5 h-5 ${occupancyPct >= 50 ? "text-emerald-600" : occupancyPct >= 20 ? "text-amber-600" : "text-red-600"}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${occupancyPct >= 50 ? "text-emerald-600" : occupancyPct >= 20 ? "text-amber-600" : "text-red-600"}`}>{occupancyPct}%</p>
                  <p className="text-xs text-muted-foreground">Taux d'occupation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{interventionsCount}</p>
                  <p className="text-xs text-muted-foreground">Interventions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Properties list */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Card className="border-border">
          <CardHeader><CardTitle className="text-lg">Mes biens</CardTitle></CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun bien associé à votre compte.</p>
            ) : (
              <div className="space-y-3">
                {properties.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.address}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {p.status === "active" ? "Actif" : p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
