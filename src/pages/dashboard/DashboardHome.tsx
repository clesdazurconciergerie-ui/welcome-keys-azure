import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Home, Wrench, Plus, ArrowRight, Clock, CheckCircle, AlertTriangle, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCleaningInterventions } from "@/hooks/useCleaningInterventions";
import SubscriptionAlert from "@/components/SubscriptionAlert";
import DemoExpirationBanner from "@/components/DemoExpirationBanner";

const DashboardHome = () => {
  const navigate = useNavigate();
  const [bookletCount, setBookletCount] = useState(0);
  const [userName, setUserName] = useState("");
  const { primaryRole } = useUserRoles();
  const { interventions } = useCleaningInterventions('concierge');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const name = (user.email || "").split("@")[0].split(".")[0];
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));

      const { count } = await supabase
        .from("booklets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setBookletCount(count || 0);
    };
    init();
  }, []);

  // Mission KPIs
  const now = new Date();
  const todayStr = now.toDateString();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const inProgress = interventions.filter(i => i.status === 'in_progress');
  const pendingValidation = interventions.filter(i => i.status === 'completed');
  const todayMissions = interventions.filter(i => new Date(i.scheduled_date).toDateString() === todayStr);
  const activeProviders = new Set(todayMissions.filter(i => i.status !== 'refused' && i.service_provider_id).map(i => i.service_provider_id)).size;

  const monthlyValidated = interventions.filter(i => {
    const d = new Date(i.scheduled_date);
    return i.status === 'validated' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalToPay = monthlyValidated.filter(m => !m.payment_done).reduce((s, m) => s + (m.mission_amount || 0), 0);
  const totalPaid = monthlyValidated.filter(m => m.payment_done).reduce((s, m) => s + (m.mission_amount || 0), 0);

  const stats = [
    { label: "Livrets", value: bookletCount, icon: BookOpen, color: "text-primary", bg: "bg-primary/10", link: "/dashboard/livrets" },
    { label: "Propriétaires", value: "—", icon: Users, color: "text-[hsl(var(--gold))]", bg: "bg-[hsl(var(--gold))]/10", link: "/dashboard/proprietaires" },
    { label: "Logements", value: "—", icon: Home, color: "text-emerald-600", bg: "bg-emerald-100", link: "/dashboard/logements" },
    { label: "Prestataires", value: "—", icon: Wrench, color: "text-violet-600", bg: "bg-violet-100", link: "/dashboard/prestataires" },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <SubscriptionAlert />
      <DemoExpirationBanner />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-muted-foreground text-lg">
          Bonjour <span className="font-semibold text-foreground">{userName}</span> 👋
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">Tableau de bord</h1>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-border" onClick={() => navigate(stat.link)}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Mission Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/interventions')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">En cours</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{inProgress.length}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-amber-200" onClick={() => navigate('/dashboard/interventions')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">À valider</span>
              {pendingValidation.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <p className="text-3xl font-bold text-foreground">{pendingValidation.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Prestataires actifs</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{activeProviders}</p>
            <p className="text-xs text-muted-foreground">aujourd'hui</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Paiements mois</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{totalPaid}€ <span className="text-xs font-normal text-muted-foreground">payé</span></p>
            <p className="text-sm text-amber-600">{totalToPay}€ <span className="text-xs font-normal text-muted-foreground">à payer</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Pending validation list */}
      {pendingValidation.length > 0 && (
        <Card className="border-amber-200">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Missions en attente de validation ({pendingValidation.length})
            </h2>
            <div className="space-y-2">
              {pendingValidation.slice(0, 5).map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 hover:bg-amber-100 cursor-pointer transition-colors"
                  onClick={() => navigate('/dashboard/interventions')}
                >
                  <div>
                    <p className="font-medium text-sm">{m.property?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.scheduled_date).toLocaleDateString('fr-FR')} — {m.service_provider?.first_name} {m.service_provider?.last_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">📸 {m.photos?.length || 0}</span>
                    <Badge variant="secondary">{m.mission_amount}€</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* In progress list */}
      {inProgress.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Missions en cours ({inProgress.length})
            </h2>
            <div className="space-y-2">
              {inProgress.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                  <div>
                    <p className="font-medium text-sm">{m.property?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      👤 {m.service_provider?.first_name} {m.service_provider?.last_name}
                      {m.actual_start_time && ` — Démarré à ${new Date(m.actual_start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <Badge variant="secondary">En cours</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/dashboard/interventions")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle mission
          </Button>
          <Button onClick={() => navigate("/booklets/new")} variant="outline">
            <BookOpen className="w-4 h-4 mr-2" />
            Nouveau livret
          </Button>
          <Button onClick={() => navigate("/dashboard/proprietaires")} variant="outline">
            <Users className="w-4 h-4 mr-2" />
            Ajouter un propriétaire
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
