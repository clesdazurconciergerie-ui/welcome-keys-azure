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
  Home,
  BookOpen,
  Camera,
  FileText,
  User,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ownerNav = [
  { title: "Tableau de bord", url: "/proprietaire", icon: LayoutDashboard },
  { title: "Mes biens", url: "/proprietaire/biens", icon: Home },
  { title: "Livrets d'accueil", url: "/proprietaire/livrets", icon: BookOpen },
  { title: "Photos ménage", url: "/proprietaire/photos-menage", icon: Camera },
  { title: "Documents", url: "/proprietaire/documents", icon: FileText },
  { title: "Mon compte", url: "/proprietaire/compte", icon: User },
];

export function OwnerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/proprietaire"
      ? location.pathname === "/proprietaire"
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
            <div>
              <BrandMark variant="compact" />
              <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">Espace Propriétaire</p>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--gold))] flex items-center justify-center font-bold text-[hsl(var(--brand-blue))] text-sm">
              P
            </div>
          )}
        </div>

        <SidebarContent className="flex-1 px-2 py-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-white/40 text-[10px] uppercase tracking-widest px-3 mb-2">
              {!collapsed && "Mon espace"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ownerNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/proprietaire"}
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
        </SidebarContent>

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
