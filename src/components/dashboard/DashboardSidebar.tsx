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
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="h-full flex flex-col relative overflow-hidden">
        {/* Deep monochrome background */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[hsl(0,0%,4%)] to-black" />
        {/* Subtle radial glow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-40 bg-[radial-gradient(ellipse_at_center,hsl(0,0%,18%)_0%,transparent_70%)] opacity-40" />
        {/* Faint noise texture */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjgiIG51bU9jdGF2ZXM9IjQiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbikiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')]" />


        {/* Logo area */}
        <div className="relative z-10 px-5 pt-6 pb-5">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))]/20 to-transparent blur-sm" />
                <img
                  src="/brand/logo-wlekom-icon.png"
                  alt="MyWelkom"
                  className="relative w-9 h-9 drop-shadow-lg"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-[17px] leading-tight tracking-tight text-white">
                  Welkom
                </span>
              </div>
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))]/20 to-transparent blur-sm" />
              <img
                src="/brand/logo-wlekom-icon.png"
                alt="W"
                className="relative w-8 h-8 drop-shadow-lg"
              />
            </div>
          )}
          {/* Separator with gold accent */}
          <div className="mt-5 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="mt-px h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/10 to-transparent" />
        </div>

        {/* Navigation */}
        <SidebarContent className="relative z-10 flex-1 px-3 pb-4 overflow-y-auto scrollbar-thin">
          {navGroups.map((group, idx) => (
            <SidebarGroup key={group.label} className={idx > 0 ? "mt-1" : ""}>
              {idx > 0 && (
                <div className="mx-3 mb-3 mt-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              )}
              <SidebarGroupLabel className="px-3 mb-1">
                {!collapsed && (
                  <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/25">
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
                              group/nav relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium
                              transition-all duration-300 ease-out
                              ${active
                                ? "text-black shadow-lg"
                                : "text-white/50 hover:text-white/90"
                              }
                            `}
                            activeClassName=""
                          >
                            {/* Active background — white pill */}
                            {active && (
                              <>
                                <div className="absolute inset-0 rounded-lg bg-white opacity-95" />
                                <div className="absolute inset-0 rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.10)]" />
                                {/* Left accent bar */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-black/70" />
                              </>
                            )}

                            {/* Hover background */}
                            {!active && (
                              <div className="absolute inset-0 rounded-lg bg-white/0 group-hover/nav:bg-white/[0.05] transition-colors duration-300" />
                            )}

                            <item.icon
                              className={`relative z-10 h-[18px] w-[18px] shrink-0 transition-all duration-300
                                ${active
                                  ? "text-black drop-shadow-sm"
                                  : "text-white/40 group-hover/nav:text-white/70"
                                }
                              `}
                              strokeWidth={active ? 2.2 : 1.8}
                            />
                            {!collapsed && (
                              <span className={`relative z-10 transition-all duration-300 ${
                                active ? "text-black font-semibold" : ""
                              }`}>
                                {item.title}
                              </span>
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
        <SidebarFooter className="relative z-10 p-3">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-2" />
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
            className="w-full justify-start gap-3 text-white/40 hover:text-white/80 hover:bg-white/[0.04] px-3 h-10 rounded-lg transition-all duration-300"
          >
            <Compass className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            {!collapsed && <span className="text-[13px] font-medium">Visite guidée</span>}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-white/30 hover:text-white/70 hover:bg-white/[0.04] px-3 h-10 rounded-lg transition-all duration-300"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            {!collapsed && <span className="text-[13px] font-medium">Déconnexion</span>}
          </Button>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
