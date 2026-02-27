import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Home, Wrench, Plus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useUserRoles } from "@/hooks/useUserRoles";
import SubscriptionAlert from "@/components/SubscriptionAlert";
import DemoExpirationBanner from "@/components/DemoExpirationBanner";

const DashboardHome = () => {
  const navigate = useNavigate();
  const [bookletCount, setBookletCount] = useState(0);
  const [userName, setUserName] = useState("");
  const { primaryRole } = useUserRoles();

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
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-border"
              onClick={() => navigate(stat.link)}
            >
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

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/booklets/new")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau livret
          </Button>
          <Button onClick={() => navigate("/dashboard/proprietaires")} variant="outline">
            <Users className="w-4 h-4 mr-2" />
            Ajouter un propriétaire
          </Button>
          <Button onClick={() => navigate("/dashboard/logements")} variant="outline">
            <Home className="w-4 h-4 mr-2" />
            Ajouter un logement
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
