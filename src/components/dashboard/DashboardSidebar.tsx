import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, BookOpen, Users, Home, Wrench, Settings, LogOut,
  Target, Euro, MessageCircle, Briefcase, ClipboardCheck, Palette, HelpCircle, Compass, Zap, Brain, Camera, Mail, ShieldAlert, TrendingUp, KeyRound, Link2, Receipt, BarChart3, RefreshCw, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navGroups = [
  {
    label: "Pilotage",
    items: [
      { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
      { title: "Monitoring iCal", url: "/dashboard/ical-monitoring", icon: RefreshCw },
    ],
  },
  {
    label: "Logements",
    items: [
      { title: "Biens / Logements", url: "/dashboard/logements", icon: Home },
      { title: "Welkom Studio", url: "/dashboard/welkom-studio", icon: Camera },
      { title: "Propriétaires", url: "/dashboard/proprietaires", icon: Users },
      { title: "Prestataires", url: "/dashboard/prestataires", icon: Wrench },
      { title: "Missions", url: "/dashboard/missions", icon: Briefcase },
      { title: "États des lieux", url: "/dashboard/etats-des-lieux-v2", icon: ClipboardCheck },
      { title: "Voyageurs", url: "/dashboard/voyageurs", icon: Users },
      { title: "Messages auto", url: "/dashboard/messages", icon: Mail },
      { title: "Livrets", url: "/dashboard/livrets", icon: BookOpen },
    ],
  },
  {
    label: "Commercial",
    items: [
      { title: "Prospection", url: "/dashboard/prospection", icon: Target },
      { title: "Demandes", url: "/dashboard/demandes-proprietaires", icon: MessageCircle },
      { title: "Call Prompter", url: "/dashboard/call-prompter", icon: Brain },
    ],
  },
  {
    label: "Revenue",
    items: [
      { title: "Tarification dynamique", url: "/dashboard/tarification", icon: TrendingUp },
      { title: "Channel Manager", url: "/dashboard/channel-manager", icon: Link2 },
      { title: "Conflits réservations", url: "/dashboard/conflits", icon: ShieldAlert },
      { title: "Smart Keys", url: "/dashboard/smart-keys", icon: KeyRound },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Finance", url: "/dashboard/finance", icon: Euro },
      { title: "Taxe de séjour", url: "/dashboard/taxe-sejour", icon: Receipt },
      { title: "Rapports mensuels", url: "/dashboard/rapports-mensuels", icon: BarChart3 },
      { title: "Azurkeys Report", url: "/rapports", icon: FileText },
    ],
  },
  {
    label: "Paramètres",
    items: [
      { title: "Paramètres", url: "/dashboard/parametres", icon: Settings },
      { title: "Automatisation", url: "/dashboard/automatisation", icon: Zap },
      { title: "Apparence", url: "/dashboard/branding", icon: Palette },
      { title: "Aide & Guide", url: "/dashboard/aide", icon: HelpCircle },
    ],
  },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-hairline">
      <div className="h-full flex flex-col relative overflow-hidden bg-[#050505]">
        {/* Very subtle top vignette */}
        <div className="absolute top-0 inset-x-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_70%)] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 px-5 pt-6 pb-6">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <span className="text-[#050505] font-semibold text-sm tracking-tight">W</span>
              </div>
              <span className="font-semibold text-[15px] tracking-tight text-white">
                Welkom
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <span className="text-[#050505] font-semibold text-sm">W</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <SidebarContent className="relative z-10 flex-1 px-3 pb-4 overflow-y-auto">
          {navGroups.map((group, idx) => (
            <SidebarGroup key={group.label} className={idx > 0 ? "mt-4" : ""}>
              <SidebarGroupLabel className="px-3 mb-1.5 h-auto">
                {!collapsed && (
                  <span className="text-[10px] font-medium tracking-[0.14em] uppercase text-white/30">
                    {group.label}
                  </span>
                )}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end={item.url === "/dashboard"}
                            className={`
                              group/nav relative flex items-center gap-3 px-3 h-9 rounded-md text-[13px]
                              transition-colors duration-150
                              ${active
                                ? "bg-white/[0.06] text-white font-medium"
                                : "text-white/55 hover:text-white hover:bg-white/[0.03]"
                              }
                            `}
                            activeClassName=""
                          >
                            {active && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full bg-white" />
                            )}
                            <item.icon
                              className={`h-[16px] w-[16px] shrink-0 transition-colors duration-150 ${
                                active ? "text-white" : "text-white/45 group-hover/nav:text-white/80"
                              }`}
                              strokeWidth={1.75}
                            />
                            {!collapsed && (
                              <span className="truncate">{item.title}</span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="relative z-10 p-3 border-t border-hairline">
          <Button
            variant="ghost"
            onClick={() => {
              const TOUR_SEEN_KEY = "mywelkom_tour_seen";
              const TOUR_COMPLETED_KEY = "mywelkom_tour_completed";
              const TOUR_STATE_KEY = "mywelkom_guided_tour";
              localStorage.removeItem(TOUR_SEEN_KEY);
              localStorage.removeItem(TOUR_COMPLETED_KEY);
              localStorage.setItem(TOUR_STATE_KEY, JSON.stringify({ currentStep: 0, isActive: false, showWelcome: true }));
              window.location.href = "/dashboard";
            }}
            className="w-full justify-start gap-3 text-white/45 hover:text-white hover:bg-white/[0.04] px-3 h-9 rounded-md transition-colors duration-150"
          >
            <Compass className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span className="text-[13px]">Visite guidée</span>}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-white/45 hover:text-white hover:bg-white/[0.04] px-3 h-9 rounded-md transition-colors duration-150"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span className="text-[13px]">Déconnexion</span>}
          </Button>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}

