import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Home,
  Wrench,
  Settings,
  LogOut,
  Target,
  Euro,
  MessageCircle,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navGroups = [
  {
    label: "Pilotage",
    items: [
      { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Exploitation",
    items: [
      { title: "Biens / Logements", url: "/dashboard/logements", icon: Home },
      { title: "Propriétaires", url: "/dashboard/proprietaires", icon: Users },
      { title: "Prestataires", url: "/dashboard/prestataires", icon: Wrench },
      { title: "Missions", url: "/dashboard/missions", icon: Briefcase },
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
    items: [
      { title: "Finance", url: "/dashboard/finance", icon: Euro },
    ],
  },
  {
    label: "Paramètres",
    items: [
      { title: "Paramètres", url: "/dashboard/parametres", icon: Settings },
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
      <div className="h-full flex flex-col bg-[hsl(var(--brand-blue))] text-white">
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          {!collapsed ? (
            <BrandMark variant="compact" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--gold))] flex items-center justify-center font-bold text-[hsl(var(--brand-blue))] text-sm">
              W
            </div>
          )}
        </div>

        <SidebarContent className="flex-1 px-2 py-3 overflow-y-auto">
          {navGroups.map((group, idx) => (
            <SidebarGroup key={group.label} className={idx > 0 ? "mt-1" : ""}>
              {idx > 0 && <div className="mx-3 mb-2 border-t border-white/[0.07]" />}
              <SidebarGroupLabel className="text-white/40 text-[10px] uppercase tracking-[0.15em] px-3 mb-1 font-semibold">
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
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive(item.url)
                              ? "bg-[hsl(var(--gold))] text-[hsl(var(--brand-blue))] shadow-lg shadow-[hsl(var(--gold))]/20"
                              : "text-white/70 hover:text-white hover:bg-white/10"
                          }`}
                          activeClassName=""
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
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

        {/* Footer */}
        <SidebarFooter className="p-3 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-white/60 hover:text-white hover:bg-white/10 px-3"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm">Déconnexion</span>}
          </Button>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
