import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import { LayoutDashboard, ClipboardList, History, CreditCard, Package, LifeBuoy, Settings, LogOut, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const mainNav = [
  { title: "Tableau de bord", url: "/prestataire", icon: LayoutDashboard },
  { title: "Missions", url: "/prestataire/missions", icon: ClipboardList },
  { title: "Historique", url: "/prestataire/historique", icon: History },
];

const secondaryNav = [
  { title: "Paiements", url: "/prestataire/paiements", icon: CreditCard },
  { title: "Matériel & Stock", url: "/prestataire/materiel", icon: Package },
  { title: "Support", url: "/prestataire/support", icon: LifeBuoy },
  { title: "Paramètres", url: "/prestataire/parametres", icon: Settings },
];

export function ServiceProviderSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/prestataire"
      ? location.pathname === "/prestataire"
      : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="h-full flex flex-col bg-[hsl(var(--sidebar-background))] text-white">
        <div className="px-4 py-5 border-b border-white/[0.08]">
          {!collapsed ? (
            <div>
              <BrandMark variant="compact" />
              <p className="section-label text-white/30 mt-2">Espace Prestataire</p>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center font-bold text-primary text-sm">
              P
            </div>
          )}
        </div>

        <SidebarContent className="flex-1 px-2 py-4">
          <SidebarGroup>
            <SidebarGroupLabel className="section-label text-white/35 px-3 mb-1.5">
              {!collapsed && "Mon espace"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/prestataire"}
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

          <SidebarGroup className="mt-4">
            <div className="mx-3 mb-3 border-t border-white/[0.06]" />
            <SidebarGroupLabel className="section-label text-white/35 px-3 mb-1.5">
              {!collapsed && "Outils"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
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
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-white/[0.06] space-y-1">
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.removeItem("mywelkom_sp_tour_completed");
              localStorage.removeItem("mywelkom_sp_tour_seen");
              localStorage.removeItem("mywelkom_sp_tour_state");
              window.location.reload();
            }}
            className="w-full justify-start gap-3 text-white/40 hover:text-white/80 hover:bg-white/[0.06] px-3 h-9"
          >
            <Compass className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-[13px]">Refaire la visite</span>}
          </Button>
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
