import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import {
  LayoutDashboard, BookOpen, Users, Home, Wrench, Settings, LogOut,
  Target, Euro, MessageCircle, Briefcase, ClipboardCheck, Palette,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navGroups = [
  {
    label: "Pilotage",
    items: [{ title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Exploitation",
    items: [
      { title: "Biens / Logements", url: "/dashboard/logements", icon: Home },
      { title: "Propriétaires", url: "/dashboard/proprietaires", icon: Users },
      { title: "Prestataires", url: "/dashboard/prestataires", icon: Wrench },
      { title: "Missions", url: "/dashboard/missions", icon: Briefcase },
      { title: "État des lieux", url: "/dashboard/etats-des-lieux", icon: ClipboardCheck },
      { title: "Livrets", url: "/dashboard/livrets", icon: BookOpen },
    ],
  },
  {
    label: "Commercial",
    items: [
      { title: "Prospection", url: "/dashboard/prospection", icon: Target },
      { title: "Demandes", url: "/dashboard/demandes-proprietaires", icon: MessageCircle },
    ],
  },
  {
    label: "Finance",
    items: [{ title: "Finance", url: "/dashboard/finance", icon: Euro }],
  },
  {
    label: "Paramètres",
    items: [{ title: "Paramètres", url: "/dashboard/parametres", icon: Settings }],
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
      <div className="h-full flex flex-col bg-[hsl(var(--sidebar-background))] text-white">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/[0.08]">
          {!collapsed ? (
            <BrandMark variant="compact" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center font-bold text-primary text-sm">
              W
            </div>
          )}
        </div>

        <SidebarContent className="flex-1 px-2 py-4 overflow-y-auto">
          {navGroups.map((group, idx) => (
            <SidebarGroup key={group.label} className={idx > 0 ? "mt-2" : ""}>
              {idx > 0 && <div className="mx-3 mb-3 border-t border-white/[0.06]" />}
              <SidebarGroupLabel className="section-label text-white/35 px-3 mb-1.5">
                {!collapsed && group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                            isActive(item.url)
                              ? "bg-gold/90 text-primary shadow-md shadow-gold/15"
                              : "text-white/60 hover:text-white/90 hover:bg-white/[0.06]"
                          }`}
                          activeClassName=""
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-white/[0.06]">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-white/40 hover:text-white/80 hover:bg-white/[0.06] px-3 h-9"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-[13px]">Déconnexion</span>}
          </Button>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
