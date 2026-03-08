import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Home, Wrench, ArrowRight, Clock, CheckCircle, AlertTriangle, Euro, Briefcase, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useDemoContext } from "@/contexts/DemoContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function DemoDashboardHome() {
  const navigate = useNavigate();
  const demo = useDemoContext();

  if (!demo) return null;

  const { demoInterventions: interventions, demoMissions: missions, demoBookings: bookings, demoUserName: userName, demoBookletCount: bookletCount } = demo;

  const inProgress = interventions.filter(i => i.status === 'in_progress');
  const pending = interventions.filter(i => i.status === 'completed');

  const stats = [
    { label: "Livrets", value: bookletCount, icon: BookOpen, color: "text-primary", bg: "bg-primary/10", link: "/demo/livrets" },
    { label: "Propriétaires", value: 2, icon: Users, color: "text-[hsl(var(--gold))]", bg: "bg-[hsl(var(--gold))]/10", link: "/demo/proprietaires" },
    { label: "Logements", value: demo.demoProperties.length, icon: Home, color: "text-emerald-600", bg: "bg-emerald-100", link: "/demo/logements" },
    { label: "Prestataires", value: 3, icon: Wrench, color: "text-violet-600", bg: "bg-violet-100", link: "/demo/prestataires" },
  ];

  // Auto-start tour after 1.5s on first visit
  useEffect(() => {
    const seen = sessionStorage.getItem("demo_tour_seen");
    if (!seen && demo) {
      const t = setTimeout(() => demo.startTour(), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="space-y-5 sm:space-y-8 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-muted-foreground text-lg">
          Bonjour <span className="font-semibold text-foreground">{userName}</span> 👋
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">Tableau de bord</h1>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-tour="stats-grid">
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

      {/* Mission KPI blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/demo/missions')}>
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

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-amber-200" onClick={() => navigate('/demo/missions')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">À valider</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{pending.length}</p>
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
            <p className="text-3xl font-bold text-foreground">2</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Euro className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">À payer ce mois</span>
            </div>
            <p className="text-3xl font-bold text-foreground">145 €</p>
          </CardContent>
        </Card>
      </div>

      {/* Missions + Bookings */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              Missions du jour
            </h3>
            <div className="space-y-3">
              {missions.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer" onClick={() => navigate('/demo/missions')}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.selected_provider ? `${m.selected_provider.first_name} ${m.selected_provider.last_name}` : "Non assigné"}</p>
                  </div>
                  <Badge variant="secondary" className={
                    m.status === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                    m.status === "open" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }>
                    {m.status === "confirmed" ? "Confirmé" : m.status === "open" ? "Ouvert" : "Brouillon"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Prochaines réservations
            </h3>
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{b.guest_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{b.property?.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{b.gross_amount} €</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
